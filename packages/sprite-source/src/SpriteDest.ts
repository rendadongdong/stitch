import { Pathy, pathy } from '@bscotch/pathy';
import { sequential } from '@bscotch/utility';
import { Yy } from '@bscotch/yy';
import { SpriteCache } from './SpriteCache.js';
import {
  isNewer,
  type SpineSummary,
  type SpriteSummary,
  type SpritesInfo,
} from './SpriteCache.schemas.js';
import {
  applySpriteAction,
  type SpriteDestActionResult,
} from './SpriteDest.actions.js';
import {
  SpriteDestAction,
  spriteDestConfigSchema,
  type SpriteDestConfig,
  type SpriteDestSource,
} from './SpriteDest.schemas.js';
import { SpriteSource } from './SpriteSource.js';
import { retryOptions } from './constants.js';
import { Reporter } from './types.js';
import { SpriteSourceError, assert, rethrow } from './utility.js';

export interface SpriteDestImportOptions {
  allowedNamePatterns?: (string | RegExp)[];
}

export class SpriteDest extends SpriteCache {
  protected constructor(
    spritesRoot: string | Pathy,
    readonly yypPath: Pathy,
  ) {
    super(spritesRoot, 1);
  }

  get configFile() {
    return this.stitchDir
      .join('sprites.import.json')
      .withValidator(spriteDestConfigSchema);
  }

  @sequential
  protected async inferChangeActions(
    sourceConfig: SpriteDestSource,
    destSpritesCache: SpritesInfo,
  ) {
    type SpriteInfo = (SpriteSummary | SpineSummary) & {
      path: string;
      name: string;
    };
    const destSpritesInfo = destSpritesCache.info;
    // Get the most up-to-date source and dest info
    const ignorePatterns = (sourceConfig.ignore || []).map(
      (x) => new RegExp(x),
    );
    const cleanSpriteName = (sourcePath: string) =>
      `${sourceConfig.prefix || ''}${sourcePath
        .split('/')
        .pop()!
        .replace(/[^a-z0-9_]/gi, '_')}`;

    // The source pathy is either absolute or relative to the project root
    const sourceRoot = pathy(sourceConfig.source, this.yypPath.up());
    const collaboratorSourceRoots = (
      sourceConfig.collaboratorSources || []
    ).map((s) => pathy(s, this.yypPath.up()));
    const collaboratorSourcesWait = Promise.allSettled(
      collaboratorSourceRoots.map((s) =>
        SpriteSource.from(s).then((s) => s.update().then((x) => x.info)),
      ),
    );

    const source = await SpriteSource.from(sourceRoot);
    const sourceSpritesInfo = await source.update().then((x) => {
      this.logs.push(...source.logs);
      this.issues.push(...source.issues);
      return x.info;
    });

    const collaboratorSources = (await collaboratorSourcesWait)
      .map((r) => (r.status === 'fulfilled' ? r.value : undefined))
      .filter((x) => x) as SpritesInfo['info'][];

    // Get all of the sprite names and last-updated dates from the collaborator
    // sources, so that we can check against them later.
    const collaboratorSprites = new Map<string, SpriteInfo>();
    /**
     * Returns true if the left sprite is newer than the right sprite.
     */
    const isNewerThanCollaboratorSprites = (
      potentiallyNewer: SpriteInfo,
      replaceIfNewer: boolean,
    ): boolean => {
      const currentNewest = collaboratorSprites.get(
        potentiallyNewer.name.toLowerCase(),
      );
      if (currentNewest && !isNewer(potentiallyNewer, currentNewest)) {
        return false;
      }
      if (replaceIfNewer) {
        collaboratorSprites.set(
          potentiallyNewer.name.toLowerCase(),
          potentiallyNewer,
        );
      }
      return true;
    };
    for (const collaboratorSource of collaboratorSources) {
      for (const [path, sprite] of Object.entries(collaboratorSource)) {
        const name = cleanSpriteName(path);
        isNewerThanCollaboratorSprites(
          {
            ...sprite,
            path,
            name,
          },
          true,
        );
      }
    }

    /** Map of destName.toLower() to the source info */
    const sourceSprites = new Map<string, SpriteInfo>();
    for (const [sourcePath, sourceSprite] of Object.entries(
      sourceSpritesInfo,
    )) {
      // Skip it if it matches the ignore patterns
      if (ignorePatterns.some((x) => x.test(sourcePath))) {
        continue;
      }

      // Get the name it should have in the project
      const name = cleanSpriteName(sourcePath);

      // Check for name collisions. If found, they should be reported as issues.
      if (sourceSprites.get(name.toLowerCase())) {
        this.issues.push(
          new SpriteSourceError(`Source sprite name collision: ${name}`),
        );
      }

      sourceSprites.set(name.toLowerCase(), {
        ...sourceSprite,
        path: sourcePath,
        name,
      });
    }

    /** Map of destName.toLower() to the dest info */
    const destSprites = new Map<string, SpriteInfo>();
    for (const [destPath, destSprite] of Object.entries(destSpritesInfo)) {
      destSprites.set(destPath.toLowerCase(), {
        ...destSprite,
        path: destPath,
        name: destPath,
      });
    }

    // For each source sprite, diff with the dest sprite to determine what actions need to be performed. Create a list of actions to perform for later execution.

    const actions: SpriteDestAction[] = [];

    for (const [normalizedName, sourceSprite] of sourceSprites) {
      const destSprite = destSprites.get(normalizedName);
      const sourceDir = source.spritesRoot.join(sourceSprite.path).absolute;
      const destDir = this.spritesRoot.join(
        destSprite?.path || sourceSprite.name,
      ).absolute;

      if (!isNewerThanCollaboratorSprites(sourceSprite, false)) {
        this.logs.push({
          action: 'skipped-collaborator-owned',
          path: sourceDir,
        });
        continue;
      }

      if (!destSprite || sourceSprite.spine !== destSprite.spine) {
        actions.push({
          kind: 'create',
          spine: sourceSprite.spine,
          name: sourceSprite.name,
          source: sourceDir,
          dest: destDir,
          sourceRoot: source.spritesRoot.absolute,
        });
      } else if (
        sourceSprite.spine &&
        destSprite.spine &&
        sourceSprite.checksum !== destSprite.checksum
      ) {
        actions.push({
          kind: 'update',
          spine: true,
          name: destSprite.name,
          source: sourceDir,
          dest: destDir,
          sourceRoot: source.spritesRoot.absolute,
        });
      } else if (
        !sourceSprite.spine &&
        !destSprite.spine &&
        sourceSprite.checksum !== destSprite.checksum
      ) {
        actions.push({
          kind: 'update',
          spine: false,
          name: destSprite.name,
          source: sourceDir,
          dest: destDir,
          sourceRoot: source.spritesRoot.absolute,
        });
      }
    }

    return actions;
  }

  /**
   * @param overrides Optionally override the configuration file (if it exists)
   */
  @sequential
  async import(
    overrides?: SpriteDestConfig,
    reporter?: Reporter,
    options?: SpriteDestImportOptions,
  ) {
    let percentComplete = 0;
    const report = (byPercent: number, message?: string) => {
      percentComplete += byPercent;
      reporter?.report({ message, increment: byPercent });
    };

    report(0, 'Updating project cache...');
    const [configResult, destSpritesInfoResult, yypResult] =
      await Promise.allSettled([
        this.loadConfig(overrides),
        this.updateSpriteInfo(),
        Yy.read(this.yypPath.absolute, 'project'),
      ]);
    assert(
      yypResult.status === 'fulfilled',
      'Project file is invalid',
      yypResult.status === 'rejected' ? yypResult.reason : undefined,
    );
    assert(
      configResult.status === 'fulfilled',
      'Could not load config',
      configResult.status === 'rejected' ? configResult.reason : undefined,
    );
    assert(
      destSpritesInfoResult.status === 'fulfilled',
      'Could not load sprites info',
      destSpritesInfoResult.status === 'rejected'
        ? destSpritesInfoResult.reason
        : undefined,
    );

    const config = configResult.value;
    const destSpritesInfo = destSpritesInfoResult.value;
    const yyp = yypResult.value;

    // Collect info from the yyp about existing folders, sprites,
    // and assets. Goals are:
    // - Faster lookups (e.g. using sets)
    // - Ensure we won't have an asset name clash
    const existingFolders = new Set<string>();
    const existingSprites = new Set<string>();
    const existingNonSpriteAssets = new Set<string>();
    yyp.resources.forEach((r) => {
      if (r.id.path.startsWith('sprites')) {
        existingSprites.add(r.id.name);
      } else {
        existingNonSpriteAssets.add(r.id.name);
      }
    });
    yyp.Folders.forEach((f) => {
      existingFolders.add(f.folderPath);
    });

    // Try to do it all at the same time for perf. Race conditions
    // and order-of-ops issues indicate some kind of user
    // config failure, so we'll let that be their problem.
    report(10, 'Applying staging actions and computing changes...');
    const actions: SpriteDestAction[] = [];
    const getActionsWaits: Promise<any>[] = [];
    for (const sourceConfig of config.sources || []) {
      // Report errors but do not throw. We want to continue
      // to subsequent sources even if one fails.
      getActionsWaits.push(
        this.inferChangeActions(sourceConfig, destSpritesInfo).then(
          (a) => {
            actions.push(...a);
          },
          (err) => {
            this.issues.push(
              new SpriteSourceError(
                `Failed to infer actions for "${sourceConfig.source}"`,
                err,
              ),
            );
          },
        ),
      );
    }
    await Promise.allSettled(getActionsWaits);

    // Apply the actions (in parellel)
    report(10, `Applying changes to ${actions.length} sprites...`);
    const appliedActions: SpriteDestActionResult[] = [];
    const applyActionsWaits: Promise<any>[] = [];

    const percentForYypUpdate = 5;
    const percentPerAction =
      (100 - percentComplete - percentForYypUpdate) / actions.length;
    for (const action of actions) {
      if (existingNonSpriteAssets.has(action.name)) {
        this.issues.push(
          new SpriteSourceError(`Asset name collision: ${action.name}`),
        );
        continue;
      }
      // If we're trying to create a new asset with an invalid name, error!
      if (action.kind === 'create' && options?.allowedNamePatterns?.length) {
        const isValidName = options.allowedNamePatterns.some((pattern) => {
          pattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
          return pattern.test(action.name);
        });
        if (!isValidName) {
          this.issues.push(
            new SpriteSourceError(`Sprite name violates rules: ${action.name}`),
          );
          continue;
        }
      }
      applyActionsWaits.push(
        applySpriteAction({
          projectYypPath: this.yypPath.absolute,
          action,
          yyp,
        })
          .then((result) => {
            appliedActions.push(result);
          })
          .catch((err) => {
            this.issues.push(
              new SpriteSourceError(
                `Error applying action: ${JSON.stringify(action)}`,
                err,
              ),
            );
          })
          .finally(() => {
            report(percentPerAction);
          }),
      );
    }
    await Promise.allSettled(applyActionsWaits);
    if (!appliedActions.length) {
      return;
    }

    // Ensure the .yyp is up to date
    report(0, 'Updating project file...');
    for (const appliedAction of appliedActions) {
      if (!existingSprites.has(appliedAction.resource.name)) {
        // Add to a random spot in the resources array to reduce git conflicts,
        // skipping the last spot entirely if possible
        const insertAt = Math.max(
          Math.floor(Math.random() * yyp.resources.length) - 1,
          0, // in case there are no resources yet
        );
        yyp.resources.splice(insertAt, 0, {
          id: appliedAction.resource,
        });
        existingSprites.add(appliedAction.resource.name);
      }
      if (!existingFolders.has(appliedAction.folder.folderPath)) {
        // Also add to a random spot in the Folders array
        const insertAt = Math.max(
          Math.floor(Math.random() * yyp.Folders.length) - 1,
          0,
        );
        // @ts-expect-error The object is partial, but gets validated and completed on write
        yyp.Folders.splice(insertAt, 0, appliedAction.folder);
        existingFolders.add(appliedAction.folder.folderPath);
      }
    }
    await Yy.write(this.yypPath.absolute, yyp, 'project');
    // Refresh the cache
    report(percentForYypUpdate, 'Updating project cache...');
    await this.updateSpriteInfo();
    return appliedActions;
  }

  /**
   * Load the config, ensuring it exists on disk. If overrides
   * are provided the config will be updated with those values.
   */
  async loadConfig(
    overrides: SpriteDestConfig = {},
  ): Promise<SpriteDestConfig> {
    // Validate options. Show error out if invalid.
    try {
      overrides = spriteDestConfigSchema.parse(overrides);
    } catch (err) {
      rethrow(err, 'Invalid SpriteDest options');
    }
    assert(
      await this.spritesRoot.isDirectory(),
      'Source must be an existing directory.',
    );
    // Update the config
    await this.stitchDir.ensureDirectory();
    const config = await this.configFile.read({
      fallback: { sources: [] },
      ...retryOptions,
    });
    let wasEmpty = !config.sources?.length;
    if (overrides?.sources) {
      config.sources = overrides.sources;
    }
    if ((wasEmpty && config.sources?.length) || !wasEmpty) {
      await this.configFile.write(config, {
        ...retryOptions,
      });
    }
    return config;
  }

  static async from(projectYypPath: string | Pathy) {
    // Ensure the project file exists
    assert(
      projectYypPath.toString().endsWith('.yyp'),
      'The project path must be to a .yyp file',
    );
    const projectYyp = pathy(projectYypPath);
    assert(
      await projectYyp.exists(),
      `Project file does not exist: ${projectYyp}`,
    );

    // Ensure the project has a sprites folder
    const projectFolder = projectYyp.up();
    const spritesRoot = projectFolder.join('sprites');
    await spritesRoot.ensureDirectory();

    // Create the cache in the sprites folder
    const cache = new SpriteDest(spritesRoot, projectYyp);
    await cache.loadConfig(); // Ensure a config file exists
    return cache;
  }
}
