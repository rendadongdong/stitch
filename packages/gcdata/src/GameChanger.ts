import { pathy } from '@bscotch/pathy';
import { GcdataError, assert } from './assert.js';
import {
  GameChangerRumpusMetadata,
  gameChangerRumpusMetadataSchema,
} from './types.cl2.rumpus.js';
import {
  Bschema,
  ChangeType,
  Changes,
  changeSchema,
  changesSchema,
  isBschemaBoolean,
  isBschemaNumeric,
  isBschemaObject,
  isBschemaString,
  type Mote,
  type MoteId,
  type PackedData,
  type SchemaId,
} from './types.js';
import {
  computePointers,
  resolvePointer,
  resolvePointerInSchema,
  setValueAtPointer,
} from './util.js';

export class Gcdata {
  constructor(public data: PackedData) {}
  get motes(): PackedData['motes'] {
    return {
      ...this.data.motes,
    };
  }

  get schemas(): PackedData['schemas'] {
    return {
      ...this.data.schemas,
    };
  }

  getMoteName(mote: Mote | string | undefined): string | undefined {
    if (!mote) return undefined;
    const foundMote = typeof mote === 'string' ? this.getMote(mote) : mote;
    if (!foundMote) return undefined;
    const schema = this.getSchema(foundMote.schema_id);
    if (!schema || !schema.name) {
      return foundMote.id;
    }
    return resolvePointer(schema.name, foundMote.data) || foundMote.id;
  }

  getMote(moteId: string | MoteId | undefined): Mote | undefined {
    if (!moteId) return;
    return this.data.motes[moteId as MoteId];
  }

  getSchema(schemaId: string | SchemaId | undefined): Bschema | undefined {
    if (!schemaId) return;
    return this.data.schemas[schemaId as SchemaId];
  }

  listMotes(): Mote[] {
    return Object.values(this.data.motes);
  }

  listMotesBySchema<D = unknown>(
    ...schemaId: (string | SchemaId)[]
  ): Mote<D>[] {
    return Object.values(this.data.motes).filter((mote) =>
      schemaId.includes(mote.schema_id),
    ) as Mote<D>[];
  }
}

export class GameChanger {
  base!: Gcdata;
  working!: Gcdata;
  protected changes!: Changes;

  protected constructor(readonly projectName: string) {}

  protected get workingData(): PackedData {
    return this.working.data;
  }

  protected get baseData(): PackedData {
    return this.base.data;
  }

  clearMoteChanges(moteId: string) {
    delete this.changes.changes.motes?.[moteId];
    // Re-clone the base data to reset the working data
    delete this.working.data.motes[moteId];
    if (this.base.data.motes[moteId]) {
      this.working.data.motes[moteId] = structuredClone(
        this.base.data.motes[moteId],
      );
    }
  }

  updateMoteData(moteId: string, dataPath: string, value: any) {
    assert(moteId, 'Must specify mote ID');
    assert(
      typeof dataPath === 'string' && dataPath.startsWith('data/'),
      'Data path must start with "data/"',
    );

    // Make sure this is a valid request
    const workingMote = this.working.getMote(moteId);
    assert(workingMote, `Cannot update non-existent mote ${moteId}`);
    const schema = this.working.getSchema(workingMote.schema_id);
    assert(schema, `Mote schema ${workingMote.schema_id} does not exist`);
    const subschema = resolvePointerInSchema(
      dataPath.replace(/^data\//, ''),
      workingMote,
      this.working,
    );
    assert(
      subschema,
      `Could not resolve ${dataPath} in schema ${workingMote.schema_id}}`,
    );

    // Do some basic schema validation to avoid really dumb errors
    if (typeof value === 'string') {
      assert(
        isBschemaString(subschema),
        `Invalid value '${JSON.stringify(
          value,
        )}'. Schema for ${dataPath} is not for a string.`,
      );
    } else if (typeof value === 'boolean') {
      assert(
        isBschemaBoolean(subschema),
        `Invalid value '${JSON.stringify(
          value,
        )}'. Schema for ${dataPath} is not boolean`,
      );
    } else if (typeof value === 'number') {
      assert(
        isBschemaBoolean(subschema) || isBschemaNumeric(subschema),
        `Invalid value '${JSON.stringify(
          value,
        )}'. Schema for ${dataPath} is not numeric`,
      );
    }

    if (isBschemaObject(subschema) && value === null) {
      // Then we are deleting a sub-object, so we need to find each
      // entry by path and add a deletion for it
      const subdata = resolvePointer(dataPath, this.workingData.motes[moteId]);
      const pointers = computePointers(subdata, dataPath);
      for (const pointer of pointers) {
        this.updateMoteData(moteId, pointer, null);
      }
      // We don't store the deletion of the sub-object itself, so we're done!
      return;
    }

    // Update the working data
    setValueAtPointer(this.workingData.motes[moteId], dataPath, value);

    // See if we have a change relative to the base
    const currentValue =
      resolvePointer(dataPath, this.base.getMote(moteId)) ??
      (subschema.defaultValue === undefined
        ? null
        : structuredClone(subschema.defaultValue));
    value = value ?? null;
    if (currentValue == value) {
      // Then we haven't changed from the base data, but
      // we might be *undoing* a working data change.
      delete this.changes.changes.motes?.[moteId]?.diffs?.[dataPath];
      return;
    }
    this.createChange('motes', moteId, {
      type: 'changed',
      pointer: dataPath,
      newValue: value,
    });
  }

  protected createChange(
    category: 'schemas' | 'motes',
    id: string,
    change: { type: ChangeType; pointer?: string; newValue?: any },
  ) {
    const moteId = category === 'motes' ? id : undefined;
    assert(
      moteId || category === 'schemas',
      'Must specify mote ID for mote changes',
    );
    const mote = moteId
      ? this.working.getMote(moteId) || change.newValue
      : undefined;
    const schemaId = category === 'schemas' ? id : mote?.schema_id;
    assert(schemaId, 'Could not determine schema ID for change');
    assert(
      !moteId || this.working.getMote(moteId) || change.type === 'added',
      `Mote ${id} does not exist`,
    );
    if (category === 'motes' && change.type === 'added') {
      assert(!this.working.getMote(moteId), `Mote ${moteId} already exists`);
    }
    if (category === 'schemas' && change.type === 'added') {
      assert(
        !this.working.getSchema(schemaId),
        `Schema ${schemaId} already exists`,
      );
    }
    assert(
      (category === 'schemas' && change.type === 'added') ||
        this.working.getSchema(schemaId),
      `Schema ${schemaId} does not exist`,
    );

    this.changes.changes[category] ||= {};
    const item = changeSchema.parse(
      this.changes.changes[category]?.[id] || {
        mote_id: moteId,
        schema_id: schemaId,
        type: change.type,
      },
    );
    item.mote_name ||= this.working.getMoteName(moteId);
    this.changes.changes[category][id] = item;
    if (change.type === 'deleted') {
      item.type = 'deleted';
      delete item.diffs;
    } else if (change.pointer) {
      let originalValue = resolvePointer(
        change.pointer,
        this.baseData[category][id],
      );
      originalValue = originalValue === undefined ? null : originalValue;
      change.newValue = change.newValue === undefined ? null : change.newValue;
      if (originalValue !== change.newValue) {
        item.diffs ||= {};
        item.diffs[change.pointer] = [originalValue, change.newValue];
      }
    }

    this.applyChanges();
  }

  async writeChanges() {
    await GameChanger.projectGameChangerChangesFile(this.projectName).write(
      this.changes,
    );
  }

  /** Apply changes to the baseData to get the updated workingData */
  protected applyChanges() {
    assert(
      this.changes.commitId === this.baseData.commitId,
      'The changes and base data have different commit IDs',
    );
    // Apply changes
    for (const type of ['motes', 'schemas'] as const) {
      const ids = Object.keys(this.changes.changes[type]);
      for (const id of ids) {
        const change = this.changes.changes[type][id];
        if (change.type === 'deleted') {
          delete this.workingData[type][id];
          continue;
        } else if (
          change.type === 'changed' &&
          !Object.keys(change.diffs || {}).length
        ) {
          // Then we can remove this entry altogether
          delete this.changes.changes[type][id];
          continue;
        }
        // Ensure the base object exists
        this.workingData[type][id] ||= {} as any;
        for (const [pointer, diff] of Object.entries(change.diffs || {})) {
          let data = this.workingData[type][id] as any;
          const pointerParts = pointer.split('/');
          for (let p = 0; p < pointerParts.length; p++) {
            const part = pointerParts[p];
            if (p === pointerParts.length - 1) {
              if (diff[1] === null) {
                delete data[part];
              } else {
                data[part] = diff[1];
              }
            } else {
              data[part] ||= {};
              data = data[part];
            }
          }
        }
      }
    }
  }

  protected async loadChanges() {
    const changesFile = GameChanger.projectGameChangerChangesFile(
      this.projectName,
    );
    assert(
      await changesFile.exists(),
      'Could not find game-changer changes file. Open the GameChanger to ensure that it gets created.',
    );
    this.changes = await changesFile.read();
  }

  protected async readCommitsMetadata(): Promise<GameChangerRumpusMetadata> {
    const metadataFile = GameChanger.projectRumpusGameChangerMetadataFile(
      this.projectName,
    );
    assert(
      await metadataFile.exists(),
      'Could not find game-changer metadata file. Open the GameChanger to ensure that it gets created.',
    );
    // Consists of 3 lines. The first one is the JSON we want.
    const content = (await metadataFile.read({
      parse: false,
    })) as string;
    const [rawMetadata] = content.split('\n');
    assert(rawMetadata, 'Metadata file malformed.');
    try {
      return gameChangerRumpusMetadataSchema.parse(JSON.parse(rawMetadata));
    } catch (err) {
      const issue = new GcdataError(
        'Could not parse game-changer metadata file.',
      );
      issue.cause = err;
      throw err;
    }
  }

  async load() {
    await this.loadChanges();
    const metadata = await this.readCommitsMetadata();

    // Use the game-changer metadata file to find the base game-changer data
    const commitItemId = Object.keys(metadata.item_metadata).find(
      (itemId) => metadata.item_metadata[itemId].name === this.changes.commitId,
    );
    assert(
      commitItemId,
      `Could not find commit item with name "${this.changes.commitId}"`,
    );
    const commitItemFile = GameChanger.projectRumpusGameChangerDir(
      this.projectName,
    ).join(commitItemId);
    assert(
      await commitItemFile.exists(),
      `Could not find commit item file "${commitItemFile}"`,
    );
    const baseData = JSON.parse(await commitItemFile.read({ parse: false }));
    this.base ||= new Gcdata(baseData);
    this.base.data = baseData;
    const workingData = structuredClone(baseData);
    this.working ||= new Gcdata(workingData);
    this.working.data = workingData;
    this.applyChanges();
  }

  /**
   * @param path Either the path to a .yyp file (to get the included packed file) or the direct path to a GameChanger snapshot (e.g. a packed file or a base file).
   */
  static async from(projectName: string): Promise<GameChanger | undefined> {
    const gcdata = new GameChanger(projectName);
    try {
      await gcdata.load();
      return gcdata;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static projectSaveDir(projectName: string) {
    return pathy(`${process.env.LOCALAPPDATA}/${projectName}`);
  }

  static projectRumpusGameChangerDir(projectName: string) {
    return this.projectSaveDir(projectName).join(
      'Dev/Rumpus/Crates/game-changer',
    );
  }

  static projectRumpusGameChangerMetadataFile(projectName: string) {
    return this.projectRumpusGameChangerDir(projectName).join('metadata');
  }

  static projectGameChangerChangesFile(projectName: string) {
    return this.projectSaveDir(projectName)
      .join('gcdata/changes.json')
      .withValidator(changesSchema);
  }
}