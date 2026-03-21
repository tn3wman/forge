export interface Lane {
  id: string;
  bayId: string;
  goal: string;
  status: LaneStatus;
  agentId: string | null;
  modelId: string | null;
  fileScope: FileScope;
  checkpoints: string[];
  createdAt: string;
  updatedAt: string;
}

export const LANE_STATUSES = [
  'idle',
  'planning',
  'running',
  'paused',
  'awaiting_approval',
  'reviewing',
  'completed',
  'failed',
  'rolled_back',
] as const;
export type LaneStatus = (typeof LANE_STATUSES)[number];

export function isLaneStatus(value: string): value is LaneStatus {
  return (LANE_STATUSES as readonly string[]).includes(value);
}

export interface FileScope {
  readPatterns: string[];
  writePatterns: string[];
}
