export interface ForgeEvent {
  id: string;
  bayId: string;
  laneId: string | null;
  taskId: string | null;
  agentId: string | null;
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export const EVENT_TYPES = [
  'bay.created',
  'bay.opened',
  'bay.closed',
  'lane.created',
  'lane.status_changed',
  'lane.checkpoint_created',
  'lane.checkpoint_restored',
  'task.created',
  'task.started',
  'task.completed',
  'task.failed',
  'file.read',
  'file.edited',
  'file.created',
  'file.deleted',
  'command.executed',
  'command.approved',
  'command.rejected',
  'agent.started',
  'agent.stopped',
  'agent.message',
  'diff.proposed',
  'diff.approved',
  'diff.rejected',
  'browser.action',
  'browser.screenshot',
  'error.occurred',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}
