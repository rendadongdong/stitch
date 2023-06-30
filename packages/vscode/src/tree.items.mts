import { Asset, Code } from '@bscotch/gml-parser';
import { Pathy } from '@bscotch/pathy';
import vscode from 'vscode';
import { getEventName } from './spec.events.mjs';
import { StitchTreeItemBase } from './tree.base.mjs';
import { GameMakerFolder } from './tree.folder.mjs';

// ICONS: See https://code.visualstudio.com/api/references/icons-in-labels#icon-listing

export class TreeFilterGroup extends StitchTreeItemBase<'tree-filter-group'> {
  override readonly kind = 'tree-filter-group';
  readonly filters: TreeFilter[] = [];

  constructor(readonly parent: GameMakerFolder, readonly name: string) {
    super(`Filter ${name}`);
    this.setBaseIcon('list-filter');

    this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    this.contextValue = this.kind;
  }

  get enabled(): TreeFilter | undefined {
    return this.filters.find((f) => f.enabled);
  }

  addFilter(query: string) {
    const filter = new TreeFilter(this, query);
    this.filters.push(filter);
    this.enable(filter);
    return filter;
  }

  enable(filter: TreeFilter) {
    this.filters.forEach((f) => (f.contextValue = `${f.kind}-disabled`));
    filter.contextValue = `${filter.kind}-enabled`;
  }

  disable(filter: TreeFilter) {
    filter.contextValue = `${filter.kind}-disabled`;
  }
}

export class TreeFilter extends StitchTreeItemBase<'tree-filter'> {
  override readonly kind = 'tree-filter';

  constructor(readonly parent: TreeFilterGroup, public query: string) {
    super(query);
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;

    this.command = {
      title: 'Edit',
      command: 'stitch.assets.filters.edit',
      arguments: [this],
      tooltip: 'Edit this filter query',
    };
  }

  get enabled() {
    return this.contextValue!.endsWith('enabled');
  }

  get disabled() {
    return this.contextValue!.endsWith('disabled');
  }

  delete() {
    this.parent.filters.splice(this.parent.filters.indexOf(this), 1);
  }

  enable() {
    this.parent.enable(this);
  }

  disable() {
    this.parent.disable(this);
  }
}

export class TreeAsset extends StitchTreeItemBase<'asset'> {
  override readonly kind = 'asset';
  readonly asset: Asset;
  /** Asset:TreeItem lookup, for revealing items and filtering.  */
  static lookup: Map<Asset, TreeAsset> = new Map();

  constructor(readonly parent: GameMakerFolder, asset: Asset) {
    super(asset.name);
    this.contextValue = this.kind;
    TreeAsset.lookup.set(asset, this);

    this.asset = asset;
    this.refreshTreeItem();
    this.id = this.path;
  }

  get path(): string {
    return this.parent.path + '/' + this.asset.name;
  }

  protected refreshTreeItem() {
    let file: vscode.Uri;
    if (this.asset.assetType === 'scripts') {
      const gmlFiles = [...this.asset.gmlFiles.values()];
      file = vscode.Uri.file(gmlFiles[0].path.absolute);
    } else {
      file = vscode.Uri.file(this.asset.yyPath.absolute);
    }
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [file],
    };

    this.collapsibleState = ['objects', 'sprites', 'shaders'].includes(
      this.asset.assetType,
    )
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;

    this.setBaseIcon('question');

    switch (this.asset.assetType) {
      case 'objects':
        this.setBaseIcon('symbol-misc');
        break;
      case 'rooms':
        this.setGameMakerIcon('room');
        break;
      case 'scripts':
        this.setGameMakerIcon('script');
        break;
      case 'sprites':
        this.setGameMakerIcon('sprite');
        break;
      case 'sounds':
        this.setGameMakerIcon('audio');
        break;
      case 'paths':
        this.setBaseIcon('debug-disconnect');
        break;
      case 'shaders':
        this.setGameMakerIcon('shader');
        break;
      case 'timelines':
        this.setBaseIcon('clock');
        break;
      case 'fonts':
        this.setGameMakerIcon('font');
        break;
      case 'tilesets':
        this.setBaseIcon('layers');
        break;
    }
  }
}

export class TreeCode extends StitchTreeItemBase<'code'> {
  override readonly kind = 'code';
  static lookup: Map<Code, TreeCode> = new Map();

  constructor(readonly parent: TreeAsset, readonly code: Code) {
    super(code.name);
    this.contextValue = this.kind;
    TreeCode.lookup.set(code, this);

    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [this.uri],
    };
    this.setIcon();
    this.id = this.parent.id + '/' + this.code.name;

    // Ensure that the tree label is human-friendly.
    this.label = getEventName(this.uri.fsPath);
  }

  get uri() {
    return vscode.Uri.file(this.code.path.absolute);
  }

  protected setIcon() {
    // Set the default
    if (this.code.name.startsWith('Other_')) {
      this.setObjectEventIcon('other');
    } else {
      this.setGameMakerIcon('script');
    }

    // Override for object events
    if (this.code.name.match(/^Draw_\d+$/i)) {
      this.setObjectEventIcon('draw');
    } else if (this.code.name.match(/^Alarm_\d+$/i)) {
      this.setObjectEventIcon('alarm');
    } else if (this.code.name.match(/^Step_\d+$/i)) {
      this.setObjectEventIcon('step');
    } else if (this.code.name === 'Create_0') {
      this.setObjectEventIcon('create');
    } else if (this.code.name === 'Destroy_0') {
      this.setObjectEventIcon('destroy');
    } else if (this.code.name === 'CleanUp_0') {
      this.setObjectEventIcon('cleanup');
    } else if (this.code.name.match(/^Other_(7[250]|6[239])$/i)) {
      this.setObjectEventIcon('asynchronous');
    }
  }
}

export class TreeSpriteFrame extends StitchTreeItemBase<'sprite-frame'> {
  override readonly kind = 'sprite-frame';
  constructor(
    readonly parent: TreeAsset,
    readonly imagePath: Pathy<Buffer>,
    readonly idx: number,
  ) {
    super(`[${idx}] ${imagePath.name}`);
    this.contextValue = this.kind;
    this.iconPath = vscode.Uri.file(imagePath.absolute);
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [this.iconPath],
    };
    this.id = this.parent.id + '/' + this.imagePath.name;
  }
}

export class TreeShaderFile extends StitchTreeItemBase<'shader-file'> {
  override readonly kind = 'shader-file';
  constructor(readonly parent: TreeAsset, readonly path: Pathy<string>) {
    super(path.hasExtension('vsh') ? 'Vertex' : 'Fragment');
    this.contextValue = this.kind;
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [this.uri],
    };
    this.id = this.parent.id + '/' + this.path.name;
    this.setFileIcon('shader');
  }
  get uri() {
    return vscode.Uri.file(this.path.absolute);
  }
}