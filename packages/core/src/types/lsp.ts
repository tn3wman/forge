export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspDiagnostic {
  uri: string;
  range: LspRange;
  severity: 1 | 2 | 3 | 4;
  message: string;
  source?: string;
}

export interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  insertText?: string;
  sortText?: string;
}

export interface LspHoverResult {
  contents: string;
  range?: LspRange;
}

export interface LspLocation {
  uri: string;
  range: LspRange;
}

export interface LspSymbol {
  name: string;
  kind: number;
  location: LspLocation;
  containerName?: string;
}

export interface LspDiagnosticsEvent {
  bayId: string;
  languageId: string;
  uri: string;
  diagnostics: LspDiagnostic[];
}
