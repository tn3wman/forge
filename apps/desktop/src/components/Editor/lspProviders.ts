import type { Monaco } from '@monaco-editor/react';
import { lspIpc } from '../../ipc';

interface Disposable {
  dispose(): void;
}

export function registerLspProviders(
  monaco: Monaco,
  bayId: string,
  languageId: string,
): Disposable[] {
  const disposables: Disposable[] = [];

  // Completion provider
  disposables.push(
    monaco.languages.registerCompletionItemProvider(languageId, {
      provideCompletionItems: async (model, position) => {
        try {
          const uri = model.uri.toString();
          const items = await lspIpc.completion(
            bayId,
            languageId,
            uri,
            position.lineNumber - 1,
            position.column - 1,
          );
          return {
            suggestions: items.map((item) => ({
              label: item.label,
              kind: item.kind ?? 1,
              detail: item.detail,
              insertText: item.insertText ?? item.label,
              sortText: item.sortText,
              range: undefined as any,
            })),
          };
        } catch {
          return { suggestions: [] };
        }
      },
    }),
  );

  // Hover provider
  disposables.push(
    monaco.languages.registerHoverProvider(languageId, {
      provideHover: async (model, position) => {
        try {
          const uri = model.uri.toString();
          const result = await lspIpc.hover(
            bayId,
            languageId,
            uri,
            position.lineNumber - 1,
            position.column - 1,
          );
          if (!result) return null;
          return { contents: [{ value: result.contents }] };
        } catch {
          return null;
        }
      },
    }),
  );

  // Definition provider
  disposables.push(
    monaco.languages.registerDefinitionProvider(languageId, {
      provideDefinition: async (model, position) => {
        try {
          const uri = model.uri.toString();
          const locations = await lspIpc.definition(
            bayId,
            languageId,
            uri,
            position.lineNumber - 1,
            position.column - 1,
          );
          if (!locations) return null;
          return locations.map((loc) => ({
            uri: monaco.Uri.parse(loc.uri),
            range: {
              startLineNumber: loc.range.start.line + 1,
              startColumn: loc.range.start.character + 1,
              endLineNumber: loc.range.end.line + 1,
              endColumn: loc.range.end.character + 1,
            },
          }));
        } catch {
          return null;
        }
      },
    }),
  );

  return disposables;
}

// Helper to set diagnostics on a Monaco model
export function setModelDiagnostics(
  monaco: Monaco,
  uri: string,
  diagnostics: Array<{
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    severity: number;
    message: string;
    source?: string;
  }>,
): void {
  const model = monaco.editor.getModel(monaco.Uri.parse(uri));
  if (!model) return;

  const markers = diagnostics.map((d) => ({
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
    message: d.message,
    severity: d.severity as 1 | 2 | 4 | 8,
    source: d.source,
  }));

  monaco.editor.setModelMarkers(model, 'lsp', markers);
}
