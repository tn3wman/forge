export interface Task {
  id: string;
  laneId: string;
  bayId: string;
  type: TaskType;
  description: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  parentTaskId: string | null;
  dependsOn: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export const TASK_TYPES = [
  'shell_command',
  'file_edit',
  'agent_prompt',
  'browser_action',
  'test_run',
  'git_operation',
  'deploy',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export function isTaskType(value: string): value is TaskType {
  return (TASK_TYPES as readonly string[]).includes(value);
}

export const TASK_STATUSES = [
  'pending',
  'queued',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}
