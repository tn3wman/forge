export interface TerminalInfo {
  id: string;
  bayId: string;
  label: string;
}

export interface TerminalTab {
  id: string;
  label: string;
  isExited: boolean;
  exitCode: number | null;
}

export interface PtyDataEvent {
  terminalId: string;
  data: string;
}

export interface PtyExitEvent {
  terminalId: string;
  exitCode: number | null;
}
