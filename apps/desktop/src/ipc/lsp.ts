import { invoke } from '@tauri-apps/api/core';
import type { LspCompletionItem, LspHoverResult, LspLocation, LspSymbol } from '@forge/core';

export const lspIpc = {
  start: (bayId: string, languageId: string, rootPath: string): Promise<void> =>
    invoke('lsp_start', { bayId, languageId, rootPath }),
  stop: (bayId: string, languageId: string): Promise<void> =>
    invoke('lsp_stop', { bayId, languageId }),
  stopAll: (bayId: string): Promise<void> => invoke('lsp_stop_all', { bayId }),
  didOpen: (bayId: string, languageId: string, uri: string, text: string): Promise<void> =>
    invoke('lsp_did_open', { bayId, languageId, uri, text }),
  didChange: (
    bayId: string,
    languageId: string,
    uri: string,
    version: number,
    text: string,
  ): Promise<void> => invoke('lsp_did_change', { bayId, languageId, uri, text, version }),
  completion: (
    bayId: string,
    languageId: string,
    uri: string,
    line: number,
    character: number,
  ): Promise<LspCompletionItem[]> =>
    invoke('lsp_completion', { bayId, languageId, uri, line, character }),
  hover: (
    bayId: string,
    languageId: string,
    uri: string,
    line: number,
    character: number,
  ): Promise<LspHoverResult | null> =>
    invoke('lsp_hover', { bayId, languageId, uri, line, character }),
  definition: (
    bayId: string,
    languageId: string,
    uri: string,
    line: number,
    character: number,
  ): Promise<LspLocation[] | null> =>
    invoke('lsp_definition', { bayId, languageId, uri, line, character }),
  documentSymbols: (bayId: string, languageId: string, uri: string): Promise<LspSymbol[]> =>
    invoke('lsp_document_symbols', { bayId, languageId, uri }),
  workspaceSymbols: (bayId: string, languageId: string, query: string): Promise<LspSymbol[]> =>
    invoke('lsp_workspace_symbols', { bayId, languageId, query }),
};
