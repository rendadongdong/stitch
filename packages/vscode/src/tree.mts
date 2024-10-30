import {
  Asset,
  Code,
  ImportModuleOptions,
  ObjectEvent,
  Project,
  assertIsAssetOfKind,
  isAssetOfKind,
  objectEvents,
} from '@bscotch/gml-parser';
import { pathy } from '@bscotch/pathy';
import { isValidSpriteName } from '@bscotch/stitch-config';
import os from 'node:os';
import vscode from 'vscode';
import { assertLoudly } from './assert.mjs';
import { stitchConfig } from './config.mjs';
import { stitchEvents } from './events.mjs';
import { GameMakerProject } from './extension.project.mjs';
import type { StitchWorkspace } from './extension.workspace.mjs';
import { getAssetIcon, getBaseIcon } from './icons.mjs';
import type { ObjectParentFolder, ObjectSpriteFolder } from './inspector.mjs';
import {
  getAssetFromRef,
  pathyFromUri,
  registerCommand,
  showProgress,
  uriFromCodeFile,
} from './lib.mjs';
import { logger, showErrorMessage, warn } from './log.mjs';
import { handleDrag, handleDrop } from './tree.dragDrop.mjs';
import {
  GameMakerFolder,
  GameMakerProjectFolder,
  GameMakerRootFolder,
} from './tree.folder.mjs';
import {
  TreeAsset,
  TreeCode,
  TreeFilter,
  TreeFilterGroup,
  TreeRoomInstance,
  TreeShaderFile,
  TreeSpriteFrame,
  type Treeable,
} from './tree.items.mjs';
import {
  ensureFolders,
  getPathWithSelection,
  promptForAssetName,
  promptForAssetPath,
  validateFolderName,
} from './tree.utility.mjs';

export class GameMakerTreeProvider
  implements
    vscode.TreeDataProvider<Treeable>,
    vscode.TreeDragAndDropController<Treeable>
{
  tree = new GameMakerRootFolder();
  view!: vscode.TreeView<Treeable>;
  readonly treeMimeType = 'application/vnd.code.tree.bscotch-stitch-resources';
  readonly dragMimeTypes = [this.treeMimeType];
  readonly dropMimeTypes = [this.treeMimeType, 'text/uri-list'];

  private _onDidChangeTreeData: vscode.EventEmitter<
    Treeable | undefined | null | void
  > = new vscode.EventEmitter<Treeable | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _onDidCollapseElement: vscode.EventEmitter<
    Treeable | undefined | null | void
  > = new vscode.EventEmitter<Treeable | undefined | null | void>();
  readonly onDidCollapseElement = this._onDidCollapseElement.event;

  constructor(readonly workspace: StitchWorkspace) {
    stitchEvents.on('asset-changed', (asset) => {
      const item = TreeAsset.lookup.get(asset);
      if (item) {
        item.refreshTreeItem();
        this.changed(item.parent);
        this.changed(item);
      }
    });
    stitchEvents.on('project-changed', (project) => {
      this.rebuild();
    });
  }

  get projects(): GameMakerProject[] {
    return this.workspace.projects;
  }

  async handleDrop(
    target: Treeable | undefined,
    dataTransfer: vscode.DataTransfer,
  ) {
    return await handleDrop(this, target, dataTransfer);
  }

  handleDrag(source: readonly Treeable[], dataTransfer: vscode.DataTransfer) {
    handleDrag(this, source, dataTransfer);
  }

  changed(item?: Treeable) {
    this._onDidChangeTreeData.fire(item);
  }

  /**
   * Reveal an associate tree item in the sidebar.
   * For folders, the value just be the folder's path string
   * with `/` separators.
   */
  reveal(item: string | Asset | Code | undefined) {
    item ||= this.workspace.getCurrentAsset();
    if (!item) {
      return;
    }
    const treeItem =
      typeof item === 'string'
        ? GameMakerFolder.lookup.get(item)
        : item instanceof Asset
          ? TreeAsset.lookup.get(item)
          : TreeCode.lookup.get(item);
    if (!treeItem) {
      return;
    }
    this.view.reveal(treeItem, { focus: true, expand: true, select: true });
  }

  /** Import assets from another project */
  protected async importAssets() {
    const acceptsRisk = await vscode.window.showWarningMessage(
      'This is an experimental feature. It may not work as expected, and may cause data loss. Do you want to continue?',
      { modal: true },
      'Yes',
    );
    if (acceptsRisk !== 'Yes') return;

    // Get the target from the current projects
    const targetProject = await this.workspace.chooseProject(
      'Choose the target project',
    );
    if (!targetProject) return;
    // const targetFolder = await vscode.window.showQuickPick(
    //   targetProject.folders,
    //   { title: 'Choose a target folder for imports' },
    // );
    // if (!targetFolder) return;

    // Get the source project from the file system
    const sourceProjectPath = (
      await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { 'GameMaker Project': ['yyp'] },
        openLabel: 'Use as Source',
        title: 'Choose a source project to import from',
      })
    )?.[0];
    if (!sourceProjectPath) return;
    const sourceProject = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading source project...',
        cancellable: false,
      },
      async (progress) => {
        return await Project.initialize(sourceProjectPath.fsPath, {
          onLoadProgress: (percent, message) => {
            progress.report({
              increment: percent,
              message,
            });
          },
        });
      },
    );

    // Get the desired assets to import
    const choices: vscode.QuickPickItem[] = [];
    for (const folder of sourceProject.folders) {
      choices.push({
        label: folder,
        description: 'folder',
        iconPath: getBaseIcon('folder'),
      });
    }
    for (const [, asset] of sourceProject.assets) {
      choices.push({
        label: asset.name,
        description: asset.assetKind,
        iconPath: getAssetIcon(asset.assetKind, asset),
      });
    }

    const choice = await vscode.window.showQuickPick(choices, {
      title: 'Choose an asset or folder to import',
    });

    if (!choice) return;

    const missingDepOpts = ['error', 'skip', 'include'] as const;
    const onMissingDependency = (
      await vscode.window.showQuickPick(
        missingDepOpts.map((o) => ({ label: o })),
        { title: 'What to do if a dependency is missing?' },
      )
    )?.label;
    if (!onMissingDependency) return;

    const options: ImportModuleOptions = {
      // targetFolder,
      sourceAsset: choice.description === 'folder' ? undefined : choice.label,
      sourceFolder: choice.description === 'folder' ? choice.label : undefined,
      onMissingDependency,
    };

    // Set the options for the merge
    const results = await showProgress(async function () {
      return await targetProject.import(sourceProjectPath.fsPath, options);
    }, 'Importing...');
    assertLoudly(
      !results.errors.length,
      'There were errors importing the project. See the logs for details.',
    );

    this.rebuild();
  }

  /**
   * Prompt the user for a new asset name and do all of
   * the non-type-specific prep work for creating the asset.
   */
  protected async prepareForNewAsset(
    where: GameMakerFolder,
    initialName?: string,
  ) {
    const newAssetName = await promptForAssetPath(initialName);
    if (!newAssetName) {
      return;
    }
    const parts = newAssetName.split('/');
    const name = parts.pop()!;
    const existingAsset = where.project!.getAssetByName(name);
    if (existingAsset) {
      showErrorMessage(`An asset named ${name} already exists.`);
      return;
    }
    let folder = where;
    for (const part of parts) {
      folder = folder.addFolder(part);
    }
    const path = folder.path + '/' + name;
    return { folder, path, name };
  }

  afterNewAssetCreated(
    asset: Asset | undefined,
    folder: GameMakerFolder,
    addedTo: GameMakerFolder,
  ) {
    if (!asset) {
      showErrorMessage(`Failed to create new asset.`);
      return;
    }
    const treeItem = folder.addResource(new TreeAsset(folder, asset));
    this.changed(addedTo);
    this.view.reveal(treeItem, { focus: true });
  }

  async deleteRoomInstance(item: TreeRoomInstance) {
    const room = item.parent.asset;
    await room.removeRoomInstance(item.instanceId);
    this.changed(item.parent);
  }

  async addRoomInstance(roomItem: TreeAsset<'rooms'>) {
    const asset = roomItem.asset;

    const objectOptions = [...asset.project.assets.values()]
      .filter((a) => isAssetOfKind(a, 'objects'))
      .map((p) => ({
        label: p.name,
        object: p as Asset<'objects'>,
      }));
    const objectChoice = await vscode.window.showQuickPick(objectOptions, {
      title: 'Choose the object to add to the room',
    });
    if (!objectChoice) {
      return;
    }
    await asset.addRoomInstance(objectChoice.object);
    this.changed(roomItem);
  }

  async setSprite(
    objectItem: ObjectParentFolder | ObjectSpriteFolder | TreeAsset,
  ) {
    const asset = objectItem.asset;
    if (!isAssetOfKind(asset, 'objects')) {
      return;
    }
    const spriteOptions = [...asset.project.assets.values()]
      .filter((a) => isAssetOfKind(a, 'sprites'))
      .map((p) => ({
        label: p.name,
        sprite: p as Asset<'sprites'> | undefined,
        description: undefined as string | undefined,
      }))
      .sort((a, b) =>
        a.label.toLocaleLowerCase().localeCompare(b.label.toLocaleLowerCase()),
      );
    if (asset.sprite) {
      spriteOptions.unshift({
        label: 'Sprites',
        //@ts-expect-error
        kind: vscode.QuickPickItemKind.Separator,
      });
      spriteOptions.unshift({
        label: 'None',
        description: 'Unassign the current sprite',
        sprite: undefined,
      });
    }
    const spriteChoice = await vscode.window.showQuickPick(spriteOptions, {
      title: 'Select the sprite to assign to this object',
    });
    if (!spriteChoice || (!spriteChoice.sprite && !asset.sprite)) {
      return;
    }
    logger.info('Setting sprite', spriteChoice);
    asset.sprite = spriteChoice.sprite;
    if (
      'onSetSprite' in objectItem &&
      typeof objectItem.onSetSprite === 'function'
    ) {
      objectItem.onSetSprite(spriteChoice.sprite);
    } else if ('provider' in objectItem) {
      objectItem.provider.onUpdate?.(objectItem);
    }
  }

  editSound(entity: TreeAsset | Asset | undefined) {
    entity ||= getAssetFromRef(this.workspace.getRefFromSelection());
    if (!entity) {
      console.log('No entity to edit sprite for');
      return;
    }
    const asset = '$tag' in entity ? entity : entity.asset;
    if (!isAssetOfKind(asset, 'sounds')) {
      return;
    }
    vscode.commands.executeCommand(
      'vscode.open',
      vscode.Uri.file(asset.dir.join(asset.yy.soundFile).absolute),
    );
  }

  editSprite(entity: TreeAsset | Asset | undefined) {
    entity ||= getAssetFromRef(this.workspace.getRefFromSelection());
    console.log('editing sprite', entity);
    if (!entity) {
      console.log('No entity to edit sprite for');
      return;
    }
    const asset = '$tag' in entity ? entity : entity.asset;
    if (!isAssetOfKind(asset, 'sprites')) {
      return;
    }
    stitchEvents.emit('sprite-editor-open', asset);
  }

  async setParent(objectItem: ObjectParentFolder | TreeAsset) {
    const asset = objectItem.asset;
    if (!isAssetOfKind(asset, 'objects')) {
      return;
    }
    const possibleParents: Asset<'objects'>[] = [];
    for (const [, possibleParent] of asset.project.assets) {
      if (!isAssetOfKind(possibleParent, 'objects')) {
        continue;
      }
      // Ensure no circularity
      if (possibleParent === asset || possibleParent.parents.includes(asset)) {
        continue;
      }
      possibleParents.push(possibleParent);
    }
    const parentOptions = possibleParents
      .map((p) => ({
        label: p.name,
        asset: p as Asset<'objects'> | undefined,
        description: undefined as string | undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (asset.parent) {
      parentOptions.unshift({
        label: 'Objects',
        //@ts-expect-error
        kind: vscode.QuickPickItemKind.Separator,
      });
      parentOptions.unshift({
        label: 'None',
        description: 'Remove the parent object',
        asset: undefined,
      });
    }
    const parentChoice = await vscode.window.showQuickPick(parentOptions, {
      title: 'Select the parent object',
    });
    if (!parentChoice || (!parentChoice.asset && !asset.parent)) {
      return;
    }
    logger.info('Setting parent', parentChoice);
    asset.parent = parentChoice.asset || undefined;
    if (
      'onSetParent' in objectItem &&
      typeof objectItem.onSetParent === 'function'
    ) {
      objectItem.onSetParent(parentChoice.asset);
    }
  }

  async createRoom(where: GameMakerFolder) {
    const info = await this.prepareForNewAsset(where);
    if (!info) {
      return;
    }
    const { folder, path } = info;
    const asset = await where.project!.createRoom(path);
    this.afterNewAssetCreated(asset, folder, where);
  }

  async createEvent(objectItem: TreeAsset) {
    const asset = objectItem.asset;
    assertLoudly(
      isAssetOfKind(asset, 'objects'),
      `Cannot create event for ${asset.assetKind} asset.`,
    );
    const events: (
      | ObjectEvent
      | { kind: vscode.QuickPickItemKind.Separator; label: string }
    )[] = [];
    for (let i = 0; i < objectEvents.length; i++) {
      const event = objectEvents[i];
      if (i > 0 && objectEvents[i - 1].group !== event.group) {
        // Add a separator between event types
        events.push({
          kind: vscode.QuickPickItemKind.Separator,
          label: event.group,
        });
      }
      events.push(event);
    }
    const eventInfo = await vscode.window.showQuickPick(events, {
      title: 'Select which type of event to create.',
    });
    if (!eventInfo || !('eventNum' in eventInfo)) {
      return;
    }
    const code = await asset.createEvent(eventInfo);
    if (!code) {
      return;
    }
    if (
      'onCreateEvent' in objectItem &&
      typeof objectItem.onCreateEvent === 'function'
    ) {
      objectItem.onCreateEvent(eventInfo);
    }
    this.changed(objectItem);
    this.view.reveal(objectItem);
    vscode.window.showTextDocument(uriFromCodeFile(code));
  }

  async createShader(where: GameMakerFolder) {
    const info = await this.prepareForNewAsset(where);
    if (!info) {
      return;
    }
    const { folder, path } = info;
    const asset = await where.project!.createShader(path);
    this.afterNewAssetCreated(asset, folder, where);
  }

  async replaceSpriteFrames(item: TreeAsset) {
    assertLoudly(os.platform() === 'win32', 'This feature is Windows-only.');

    const { applySpriteAction } = await import('@bscotch/sprite-source');

    const asset = item.asset;
    assertIsAssetOfKind(asset, 'sprites');
    const project = item.parent.project!;
    // Prompt for the source folder
    const spriteDir = await this.getSpriteSource();
    if (!spriteDir) return;

    // TODO: Convert into an "Action"
    // TODO: Call applySpriteAction() to complete the process
    const dest = project.dir.join('sprites').join(asset.name);
    await applySpriteAction({
      action: {
        kind: 'update',
        name: asset.name,
        source: spriteDir.path.absolute,
        sourceRoot: '', // Not needed for this
        dest: dest.absolute,
        spine: spriteDir.isSpine,
      },
      projectYypPath: project.yypPath.absolute,
      yyp: project.yyp,
    });
    this.changed(item);
    this.view.reveal(item, { focus: true });
  }

  private async getSoundSources(): Promise<vscode.Uri[] | undefined> {
    const sourceFiles = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      openLabel: 'Import as Sound',
      title: 'Choose sound file(s) to import',
      filters: {
        Audio: ['ogg', 'mp3', 'wav'],
      },
    });
    if (!sourceFiles?.length) return;
    return sourceFiles;
  }

  private async getSpriteSource() {
    assertLoudly(os.platform() === 'win32', 'This feature is Windows-only.');
    const { SpriteDir } = await import('@bscotch/sprite-source');

    // Prompt for the source folder
    const sourceFolder = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Import as Sprite',
      title: 'Choose a folder containing sprite frames',
    });
    if (!sourceFolder?.length) return;

    // Create a SpriteDir from that folder
    const errors: Error[] = [];
    const spriteDir = await SpriteDir.from(
      pathy(sourceFolder[0].fsPath),
      [],
      errors,
    );
    assertLoudly(
      spriteDir,
      `Failed to create sprite from folder. ${errors
        .map((e) => e.message)
        .join(', ')}`,
    );

    // Prompt for bleed/crop options (note will mutate source)
    const preparations = await vscode.window.showQuickPick(
      [
        {
          label: 'Bleed',
          description:
            'Add a layer of low-alpha pixels around the foreground to improve aliasing.',
        },
        {
          label: 'Crop',
          description: 'Crop to reduce excessive bounding box size.',
        },
      ],
      { canPickMany: true, title: 'Source Mutations' },
    );
    const bleed = preparations?.find((p) => p.label === 'Bleed');
    const crop = preparations?.find((p) => p.label === 'Crop');
    if (crop) {
      await spriteDir.crop();
    }
    if (bleed) {
      await spriteDir.bleed();
    }
    return spriteDir;
  }

  async createSpriteFromImage(where: GameMakerFolder) {
    const project = where.project!;
    assertLoudly(project, 'Cannot create sprite without a project.');
    // Prompt for the source folder
    const sourceImage = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: 'Import as Sprite',
      title: 'Choose an image',
      filters: {
        Image: ['png'],
      },
    });
    if (!sourceImage?.length) return;
    const sourceImagePath = pathyFromUri(sourceImage[0]);
    const name = await promptForAssetName(sourceImagePath.name);
    if (!name) return;
    const path = where.path + '/' + name;
    const newSprite = await project.createSprite(path, sourceImagePath);
    this.changed(where);
    this.reveal(newSprite);
  }

  async createSprite(where: GameMakerFolder) {
    assertLoudly(os.platform() === 'win32', 'This feature is Windows-only.');
    const { applySpriteAction } = await import('@bscotch/sprite-source');

    const project = where.project!;
    assertLoudly(project, 'Cannot create sprite without a project.');
    await project.reloadConfig();

    const spriteDir = await this.getSpriteSource();
    if (!spriteDir) return;

    const info = await this.prepareForNewAsset(where, spriteDir.path.name);
    if (!info) {
      return;
    }
    const { folder, name } = info;
    assertLoudly(
      isValidSpriteName(name, project.config),
      'Sprite name does not match allowed patterns.',
    );

    // TODO: Convert into an "Action"
    // TODO: Call applySpriteAction() to complete the process
    const dest = project.dir.join('sprites').join(name);
    await applySpriteAction({
      action: {
        kind: 'create',
        name,
        source: spriteDir.path.absolute,
        sourceRoot: '', // Not needed for this
        dest: dest.absolute,
        spine: spriteDir.isSpine,
      },
      projectYypPath: project.yypPath.absolute,
      yyp: project.yyp,
    });

    // NOTE: At this point we've bypassed the parser, so we'll need to
    // register the asset manually.
    const assetInfo = await project.addAssetToYyp(
      dest.join(`${name}.yy`).absolute,
    );
    const asset = await Asset.from(project, assetInfo);
    assertLoudly(asset, 'Failed to create sprite asset.');
    project.registerAsset(asset);
    await project.createFolder(folder.path);
    await asset.moveToFolder(folder.path);
    this.afterNewAssetCreated(asset, folder, where);
  }

  async createObject(where: GameMakerFolder) {
    const info = await this.prepareForNewAsset(where);
    if (!info) {
      return;
    }
    const { folder, path } = info;
    const asset = await where.project!.createObject(path);
    this.afterNewAssetCreated(asset, folder, where);
  }

  async upsertSounds(where: GameMakerFolder, sourceFiles?: vscode.Uri[]) {
    const project = where.project;
    assertLoudly(project, 'Cannot upsert sounds without a project.');
    sourceFiles ||= await this.getSoundSources();
    if (!sourceFiles) return;
    await project.reloadConfig(); // Ensure we have the latest config

    const errors: Error[] = [];
    const updated: string[] = [];
    const created: string[] = [];
    for (const sourceFile of sourceFiles) {
      const sourcePath = pathyFromUri(sourceFile);
      const resourcePath = where.path + '/' + sourcePath.name;
      try {
        // If there's an existing asset, just update it
        const existing = project.getAssetByName(sourcePath.name);
        if (existing) {
          await sourcePath.copy(existing.soundFile);
          updated.push(sourcePath.name);
        } else {
          // Otherwise, create a new asset
          await project.createSound(resourcePath, sourcePath);
          created.push(sourcePath.name);
        }
      } catch (err) {
        errors.push(err as Error);
      }
    }
    if (errors.length) {
      showErrorMessage(
        `Failed to update sounds:\n${errors.map((e) => e.message).join(', ')}`,
      );
    }
    if (updated.length) {
      vscode.window.showInformationMessage(
        `Updated sounds:\n${updated.join(', ')}`,
      );
    }
    if (created.length) {
      vscode.window.showInformationMessage(
        `Created sounds:\n${created.join(', ')}`,
      );
    }
    this.changed(where);
  }

  async createScript(where: GameMakerFolder) {
    const info = await this.prepareForNewAsset(where);
    if (!info) {
      return;
    }
    const { folder, path } = info;
    const asset = await where.project!.createScript(path);
    this.afterNewAssetCreated(asset, folder, where);
  }

  async promptToRenameFolder(where: GameMakerFolder) {
    const newFolderName = await vscode.window.showInputBox({
      prompt: 'Provide a new name for this folder',
      ...getPathWithSelection(where),
      validateInput: validateFolderName,
    });
    if (!newFolderName) {
      return;
    }
    await this.renameFolder(where, newFolderName);
  }

  async promptToRenameAsset(where: TreeAsset) {
    const newName = await vscode.window.showInputBox({
      prompt: 'Provide a new name for this asset',
      placeHolder: where.asset.name,
      validateInput(value) {
        if (!value) {
          return;
        }
        if (!value.match(/^[a-z_][a-z0-9_]*/i)) {
          return 'Asset names must start with a letter or underscore, and can only contain letters, numbers, and underscores.';
        }
        return;
      },
    });
    if (!newName) return;
    await where.asset.project.renameAsset(where.asset.name, newName);
    this.rebuild();
    const newAsset = where.asset.project.getAssetByName(newName);
    const newTreeItem = TreeAsset.lookup.get(newAsset!)!;
    this.view.reveal(newTreeItem);
  }

  async suppressDiagnostics(where: GameMakerFolder) {
    const suppressed = stitchConfig.suppressDiagnosticsInGroups;
    const path = where.path;
    if (suppressed.includes(path)) {
      return;
    }
    suppressed.push(path);
    await stitchConfig.config.update('diagnostics.suppressGroups', suppressed);
    // Clear existing diagnostics
    this.workspace.clearDiagnosticsInGroups([path]);
  }

  protected async renameFolder(where: GameMakerFolder, newFolderName: string) {
    const folder = ensureFolders(newFolderName, where.heirarchy[0]);
    await where.project!.renameFolder(where.path, folder.path);
    this.rebuild();
    this.view.reveal(GameMakerFolder.lookup.get(newFolderName)!);
  }

  async deleteFolder(where: GameMakerFolder) {
    try {
      await where.project!.deleteFolder(where.path);
    } catch {
      showErrorMessage(
        `Folders can only be deleted if they contain no assets.`,
      );
      return;
    }
    this.rebuild();
  }

  async deleteSpriteFrame(item: TreeSpriteFrame) {
    const asset = item.parent.asset;
    await asset.deleteFrames([item.frameId]);
    this.changed(item.parent);
  }

  async duplicateAsset(item: TreeAsset) {
    const dest = await this.prepareForNewAsset(item.parent);
    if (!dest) return;
    const asset = await item.parent.project!.duplicateAsset(
      item.asset.name,
      dest.path,
    );
    this.afterNewAssetCreated(asset, dest.folder, item.parent);
  }

  /**
   * Create a new folder in the GameMaker asset tree. */
  async createFolder(where: GameMakerFolder | undefined) {
    const basePath = where ? where.path + '/' : '';
    where ||= this.tree;
    const newFolderName = await vscode.window.showInputBox({
      prompt: 'Enter a name for the new folder',
      value: basePath,
      valueSelection: [basePath.length, basePath.length],
      placeHolder: 'e.g. my/new/folder',
      validateInput: validateFolderName,
    });
    if (!newFolderName) {
      return;
    }
    const folder = ensureFolders(newFolderName, where.heirarchy[0]);
    this.changed(where.heirarchy[0]);
    // Ensure that this folder exists in the actual project.
    await where.project!.createFolder(folder.path);
    this.rebuild();
    this.view.reveal(GameMakerFolder.lookup.get(newFolderName)!);
  }

  getTreeItem(element: Treeable): vscode.TreeItem {
    return element;
  }

  getParent(element: Treeable): vscode.ProviderResult<Treeable> {
    return element.parent;
  }

  getChildren(element?: Treeable | undefined): Treeable[] | undefined {
    const assetSorter = (a: TreeAsset, b: TreeAsset) => {
      return a.asset.name
        .toLowerCase()
        .localeCompare(b.asset.name.toLowerCase());
    };
    const folderSorter = (a: GameMakerFolder, b: GameMakerFolder) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    };

    if (!element) {
      // Then we're at the root.
      // If there is only one project (folder), we can return its tree.
      if (this.projects.length === 1) {
        return this.getChildren(this.tree.folders[0]);
      } else {
        return this.tree.folders;
      }
    } else if (element instanceof GameMakerProjectFolder) {
      return [
        element.filterGroup,
        ...element.folders.sort(folderSorter),
        ...element.resources.sort(assetSorter),
      ];
    } else if (element instanceof GameMakerFolder) {
      return [
        ...element.folders.sort(folderSorter),
        ...element.resources.sort(assetSorter),
      ];
    } else if (element instanceof TreeFilterGroup) {
      return element.filters.sort((a, b) => a.query.localeCompare(b.query));
    } else if (element instanceof TreeAsset) {
      if (isAssetOfKind(element.asset, 'objects')) {
        return element.asset.gmlFilesArray.map((f) => new TreeCode(element, f));
      } else if (isAssetOfKind(element.asset, 'sprites')) {
        return element.asset.framePaths.map(
          (p, i) => new TreeSpriteFrame(element, p, i),
        );
      } else if (isAssetOfKind(element.asset, 'shaders')) {
        const paths = element.asset.shaderPaths!;
        return [
          new TreeShaderFile(element, paths.fragment),
          new TreeShaderFile(element, paths.vertex),
        ];
      } else if (isAssetOfKind(element.asset, 'rooms')) {
        const instances = element.asset.roomInstances;
        return instances.map(
          (i) =>
            new TreeRoomInstance(
              element as TreeAsset<'rooms'>,
              i.object,
              i.instanceId,
            ),
        );
      }
    }
    return;
  }

  rebuild() {
    // TODO: Move the logic for this into the tree elements so that we
    // don't have to do so much of fully-rebuilding on change.

    const folderPathToParts = (folderPath: string) =>
      folderPath
        .replace(/^folders[\\/]/, '')
        .replace(/\.yy$/, '')
        .split(/[\\/]/);
    const toReveal: Treeable[] = [];

    // Grab the current filters before nuking everything.
    const filterGroups = new Map<GameMakerProject, TreeFilterGroup>();
    for (const projectFolder of this.tree.folders) {
      filterGroups.set(projectFolder.project, projectFolder.filterGroup);
    }

    // Rebuild the tree
    this.tree = new GameMakerRootFolder();
    for (const project of this.projects) {
      const projectFolder = this.tree.addFolder(project.name, {
        project,
      }) as GameMakerProjectFolder;
      // Add the filter groups
      if (filterGroups.has(project)) {
        projectFolder.filterGroup = filterGroups.get(project)!;
      } else {
        for (const filterGroupName of ['Folders', 'Assets']) {
          const filterGroup = new TreeFilterGroup(
            projectFolder,
            filterGroupName,
          );
          projectFolder.filterGroup = filterGroup;
        }
      }

      const query = projectFolder.filterGroup.enabled?.query;
      const filter = query?.length ? new RegExp(query, 'i') : undefined;

      // Add all of the folders, unless we're filtering
      if (!filter) {
        for (const folder of project.yyp.Folders) {
          const pathParts = folderPathToParts(folder.folderPath);
          let parent = projectFolder as GameMakerFolder;
          for (let i = 0; i < pathParts.length; i++) {
            parent = parent.addFolder(pathParts[i]);
          }
        }
      }

      // Add all of the resources, applying the filter if any
      // If filtering, everything should be in the OPEN state
      for (const [, resource] of project.assets) {
        const path = (resource.yy.parent as any).path;
        if (!path) {
          warn('Resource has no path', resource);
          continue;
        }
        const pathParts = folderPathToParts(path);
        // Apply asset filters, if any
        if (filter && !resource.name.match(filter)) {
          continue;
        }
        let parent = projectFolder as GameMakerFolder;
        for (let i = 0; i < pathParts.length; i++) {
          parent = parent.addFolder(pathParts[i], {
            open: !!filter && stitchConfig.openFoldersOnFilter,
          });
        }
        const asset = new TreeAsset(parent, resource);
        parent.addResource(asset);
        if (filter) {
          toReveal.push(asset);
        }
      }
    }
    this.changed();
    for (const element of toReveal) {
      this.view.reveal(element, { focus: false, expand: false, select: false });
    }
    return this;
  }

  async createFilter(group: TreeFilterGroup) {
    const query = await vscode.window.showInputBox({
      prompt: 'Provide a query term to filter the tree',
    });
    if (!query) {
      return;
    }
    const filter = group.addFilter(query);
    this.rebuild();
    this.view.reveal(filter);
  }

  async editFilter(filter: TreeFilter) {
    const query = await vscode.window.showInputBox({
      prompt: 'Update the asset filter query',
      value: filter.query,
    });
    if (!query) {
      return;
    }
    filter.query = query;
    this.rebuild();
    this.view.reveal(filter);
  }

  deleteFilter(filter: TreeFilter) {
    const requiresRefresh = filter.enabled;
    filter.delete();
    if (requiresRefresh) {
      this.rebuild();
    } else {
      this.changed(filter.parent);
    }
  }

  enableFilter(filter: TreeFilter) {
    filter.parent.enable(filter);
    this.rebuild();
  }

  disableFilter(filter: TreeFilter) {
    filter.parent.disable(filter);
    this.rebuild();
  }

  register() {
    this.view = vscode.window.createTreeView('bscotch-stitch-resources', {
      treeDataProvider: this.rebuild(),
      canSelectMany: true,
      dragAndDropController: this,
    });

    // Handle emitted events
    stitchEvents.on('asset-deleted', (asset) => {
      const treeItem = TreeAsset.lookup.get(asset);
      if (!treeItem) {
        return;
      }
      TreeAsset.lookup.delete(asset);
      treeItem.parent.removeResource(treeItem);
      this.changed(treeItem.parent);
    });
    stitchEvents.on('code-file-deleted', (code) => {
      const treeItem = TreeCode.lookup.get(code);
      if (!treeItem) {
        return;
      }
      TreeCode.lookup.delete(code);
      this.changed(treeItem.parent);
    });

    // Return subscriptions to owned commands and this view
    const subscriptions = [
      this.view,
      registerCommand('stitch.assets.import', this.importAssets.bind(this)),
      registerCommand(
        'stitch.assets.renameFolder',
        this.promptToRenameFolder.bind(this),
      ),
      registerCommand(
        'stitch.assets.deleteFolder',
        this.deleteFolder.bind(this),
      ),
      registerCommand(
        'stitch.assets.deleteSpriteFrame',
        this.deleteSpriteFrame.bind(this),
      ),
      registerCommand(
        'stitch.diagnostics.suppress',
        this.suppressDiagnostics.bind(this),
      ),
      registerCommand(
        'stitch.assets.rename',
        this.promptToRenameAsset.bind(this),
      ),
      registerCommand(
        'stitch.assets.editSprite',
        (item: TreeAsset | Asset | undefined) => this.editSprite(item),
      ),
      registerCommand(
        'stitch.assets.editSound',
        (item: TreeAsset | Asset | undefined) => {
          console.log('triggered edit sound');
          this.editSound(item);
        },
      ),
      registerCommand(
        'stitch.assets.duplicate',
        this.duplicateAsset.bind(this),
      ),
      registerCommand('stitch.assets.newSound', this.upsertSounds.bind(this)),
      registerCommand('stitch.assets.newFolder', this.createFolder.bind(this)),
      registerCommand('stitch.assets.newScript', this.createScript.bind(this)),
      registerCommand('stitch.assets.newObject', this.createObject.bind(this)),
      registerCommand('stitch.assets.newSprite', this.createSprite.bind(this)),
      registerCommand(
        'stitch.assets.newSpriteFromImage',
        this.createSpriteFromImage.bind(this),
      ),
      registerCommand(
        'stitch.assets.replaceSpriteFrames',
        this.replaceSpriteFrames.bind(this),
      ),
      registerCommand('stitch.assets.newShader', this.createShader.bind(this)),
      registerCommand('stitch.assets.newRoom', this.createRoom.bind(this)),
      registerCommand('stitch.assets.newEvent', this.createEvent.bind(this)),
      registerCommand('stitch.assets.setParent', this.setParent.bind(this)),
      registerCommand('stitch.assets.setSprite', this.setSprite.bind(this)),
      registerCommand(
        'stitch.assets.addRoomInstance',
        this.addRoomInstance.bind(this),
      ),
      registerCommand(
        'stitch.assets.deleteRoomInstance',
        this.deleteRoomInstance.bind(this),
      ),
      registerCommand('stitch.assets.reveal', this.reveal.bind(this)),
      registerCommand(
        'stitch.assets.filters.delete',
        this.deleteFilter.bind(this),
      ),
      registerCommand(
        'stitch.assets.filters.enable',
        this.enableFilter.bind(this),
      ),
      registerCommand(
        'stitch.assets.filters.disable',
        this.disableFilter.bind(this),
      ),
      registerCommand(
        'stitch.assets.filters.new',
        this.createFilter.bind(this),
      ),
      registerCommand('stitch.assets.filters.edit', this.editFilter.bind(this)),
    ];
    return subscriptions;
  }
}
