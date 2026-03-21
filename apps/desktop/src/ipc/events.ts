import { invoke } from '@tauri-apps/api/core';
import type { ForgeEvent } from '@forge/core';

export interface QueryEventsParams {
  bayId: string;
  laneId?: string;
  eventType?: string;
  limit?: number;
}

export const eventIpc = {
  append: (params: {
    bayId: string;
    laneId?: string;
    taskId?: string;
    agentId?: string;
    eventType: string;
    payload: string;
  }): Promise<ForgeEvent> => invoke('append_event', params),

  query: (params: QueryEventsParams): Promise<ForgeEvent[]> =>
    invoke('query_events', params),
};
