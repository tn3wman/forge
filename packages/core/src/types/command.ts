export type CommandStatus = 'running' | 'completed' | 'failed' | 'killed';

export interface CommandEntry {
  id: string;
  bayId: string;
  laneId: string | null;
  agentId: string | null;
  terminalId: string | null;
  command: string;
  cwd: string;
  env: string | null;
  status: CommandStatus;
  exitCode: number | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  stdoutPreview: string | null;
  stderrPreview: string | null;
  metadata: string | null;
}

export interface CommandFilters {
  laneId?: string;
  agentId?: string;
  status?: CommandStatus;
  timeFrom?: string;
  timeTo?: string;
  limit?: number;
  offset?: number;
}
