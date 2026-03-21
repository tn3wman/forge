import { invoke } from '@tauri-apps/api/core';
import type { Lane } from '@forge/core';

export const laneIpc = {
  create: (bayId: string, goal: string): Promise<Lane> => invoke('create_lane', { bayId, goal }),

  list: (bayId: string): Promise<Lane[]> => invoke('list_lanes', { bayId }),

  listAll: (): Promise<Lane[]> => invoke('list_all_lanes'),

  updateStatus: (id: string, status: string): Promise<void> =>
    invoke('update_lane_status', { id, status }),
};
