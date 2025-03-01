import {
  ComfortMote,
  ComfortUpdateResult,
  isComfortMote,
  parseStringifiedComfort,
  stringifyComfort,
  updateChangesFromParsedComfort,
  type GameChanger,
} from '@bscotch/gcdata';
import vscode from 'vscode';
import { assertInternalClaim, assertLoudly } from './assert.mjs';
import { diagnostics } from './diagnostics.mjs';
import { crashlandsEvents } from './events.mjs';
import { filterRanges, parseGameChangerUri, range } from './quests.util.mjs';
import { unknownWordError } from './unknownWordError.mjs';
import type { CrashlandsWorkspace } from './workspace.mjs';

/** Representation of an active Quest Document */
export class ComfortDocument {
  static cache = new Map<string, ComfortDocument>();

  protected constructor(
    readonly uri: vscode.Uri,
    readonly packed: GameChanger,
  ) {}
  parseResults: ComfortUpdateResult | undefined;

  get document(): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find(
      (doc) => doc.uri.toString() === this.uri.toString(),
    );
  }

  get moteId() {
    return parseGameChangerUri(this.uri).moteId!;
  }

  get mote(): ComfortMote {
    return this.packed.working.getMote(this.moteId)!;
  }

  getAutoCompleteItems(position: vscode.Position): vscode.CompletionItem[] {
    const matchingAutocompletes = filterRanges(
      this.parseResults?.completions ?? [],
      {
        includesPosition: position,
      },
    );

    console.log('matchingAutocompletes', matchingAutocompletes);

    const completes = matchingAutocompletes
      .map((c) => {
        if (c.type === 'glossary') {
          return [...c.options].map((o) => {
            const item = new vscode.CompletionItem(o);
            item.kind = vscode.CompletionItemKind.Text;
            item.detail = 'Glossary';
            item.insertText = o;
            return item;
          });
        } else if (c.type === 'labels') {
          return [...c.options].map((o) => {
            const item = new vscode.CompletionItem(o);
            item.kind = vscode.CompletionItemKind.Property;
            item.detail = 'Label';
            item.insertText = `${o}: `;
            item.keepWhitespace = true;
            return item;
          });
        } else if (c.type === 'stages') {
          return [...c.options].map((o) => {
            const item = new vscode.CompletionItem(o);
            item.kind = vscode.CompletionItemKind.EnumMember;
            item.detail = 'Stage';
            item.insertText = o;
            return item;
          });
        }
        return [];
      })
      .flat();

    return completes;
  }

  /** Save the last-parsed content to the changes file */
  async save(content: string) {
    this.parse(content);
    assertLoudly(
      this.parseResults?.diagnostics.length === 0,
      'Cannot save a quest with errors.',
    );
    const nameBefore = this.packed.working.getMoteName(this.mote);
    await updateChangesFromParsedComfort(
      this.parseResults.parsed,
      this.mote.id,
      this.packed,
    );
    const nameAfter = this.packed.working.getMoteName(this.mote);
    if (nameAfter != nameBefore) {
      crashlandsEvents.emit('mote-name-changed', {
        file: this.uri,
        schemaId: this.mote.schema_id,
        moteId: this.mote.id,
        newName: this.parseResults.parsed.name,
        oldName: nameBefore,
      });
    }
  }

  parse(content?: string) {
    try {
      if (!content) {
        content = this.toString();
      }
      this.parseResults = parseStringifiedComfort(content!, this.packed, {
        checkSpelling: true,
      });

      // Apply any edits
      for (const edit of this.parseResults.edits) {
        const newEdit = new vscode.WorkspaceEdit();
        newEdit.replace(this.uri, range(edit), edit.newText);
        vscode.workspace.applyEdit(newEdit);
      }

      // Update diagnostics
      const issues = this.parseResults.diagnostics.map(
        (d) =>
          new vscode.Diagnostic(
            range(d),
            d.message,
            vscode.DiagnosticSeverity.Error,
          ),
      );
      for (const word of this.parseResults.words) {
        if (word.valid) continue;
        issues.push(unknownWordError(word));
      }
      diagnostics.set(this.uri, issues);
    } catch (err) {
      console.error(err);
    }
  }

  toString() {
    return stringifyComfort(this.mote, this.packed);
  }

  static from(uri: vscode.Uri, workspace: CrashlandsWorkspace) {
    if (this.cache.has(uri.toString())) {
      return this.cache.get(uri.toString())!;
    }
    const { moteId } = parseGameChangerUri(uri);
    assertInternalClaim(moteId, 'Expected a comfort mote id');
    const mote = workspace.packed.working.getMote(moteId);
    assertInternalClaim(mote, `No comfort mote found with id ${moteId}`);
    assertInternalClaim(isComfortMote(mote), 'Only Comforts are supported.');
    const doc = new ComfortDocument(uri, workspace.packed);
    this.cache.set(uri.toString(), doc);
    doc.parse();
    return doc;
  }
}
