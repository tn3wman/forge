import { invoke } from '@tauri-apps/api/core';
import type { Bay } from '@forge/core';

export const bayIpc = {
  create: (name: string, projectPath: string): Promise<Bay> =>
    invoke('create_bay', { name, projectPath }),

  list: (): Promise<Bay[]> => invoke('list_bays'),

  get: (id: string): Promise<Bay> => invoke('get_bay', { id }),

  delete: (id: string): Promise<void> => invoke('delete_bay', { id }),
};
