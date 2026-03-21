import { invoke } from '@tauri-apps/api/core';
import type { TerminalInfo } from '@forge/core';

export const ptyIpc = {
  spawn: (
    bayId: string,
    cwd: string,
    cols: number,
    rows: number,
    label?: string,
  ): Promise<TerminalInfo> => invoke('pty_spawn', { bayId, cwd, cols, rows, label }),
  write: (terminalId: string, data: string): Promise<void> =>
    invoke('pty_write', { terminalId, data }),
  resize: (terminalId: string, cols: number, rows: number): Promise<void> =>
    invoke('pty_resize', { terminalId, cols, rows }),
  kill: (terminalId: string): Promise<void> => invoke('pty_kill', { terminalId }),
  killAll: (bayId: string): Promise<void> => invoke('pty_kill_all', { bayId }),
  rename: (terminalId: string, label: string): Promise<void> =>
    invoke('pty_rename', { terminalId, label }),
  list: (bayId: string): Promise<TerminalInfo[]> => invoke('pty_list', { bayId }),
};
