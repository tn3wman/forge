import { invoke } from '@tauri-apps/api/core';
import type { CommandEntry, CommandFilters } from '@forge/core';

export const commandLedgerIpc = {
  insert: (params: {
    bayId: string;
    command: string;
    cwd: string;
    laneId?: string;
    agentId?: string;
    terminalId?: string;
    env?: string;
  }): Promise<CommandEntry> => invoke('command_ledger_insert', params),

  complete: (params: {
    id: string;
    exitCode?: number;
    durationMs?: number;
    stdoutPreview?: string;
    stderrPreview?: string;
  }): Promise<CommandEntry> => invoke('command_ledger_complete', params),

  query: (bayId: string, filters?: CommandFilters): Promise<CommandEntry[]> =>
    invoke('command_ledger_query', { bayId, ...filters }),

  get: (id: string): Promise<CommandEntry> => invoke('command_ledger_get', { id }),

  execute: (params: {
    bayId: string;
    command: string;
    cwd: string;
    laneId?: string;
    agentId?: string;
  }): Promise<CommandEntry> => invoke('command_execute', params),
};
