import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { Bay } from '@forge/core';

export const bayIpc = {
  create: (name: string, projectPath: string): Promise<Bay> =>
    invoke('create_bay', { name, projectPath }),

  list: (): Promise<Bay[]> => invoke('list_bays'),

  get: (id: string): Promise<Bay> => invoke('get_bay', { id }),

  delete: (id: string): Promise<void> => invoke('delete_bay', { id }),

  open: (id: string): Promise<Bay> => invoke('open_bay', { id }),

  updateWindowState: (id: string, windowState: string): Promise<void> =>
    invoke('update_bay_window_state', { id, windowState }),

  /** Opens native folder picker, creates a Bay, returns it. Returns null if user cancels. */
  openFolder: async (): Promise<Bay | null> => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return null;
    const path = typeof selected === 'string' ? selected : selected;
    const name = path.split(/[\\/]/).pop() ?? path;
    return invoke('create_bay', { name, projectPath: path });
  },
};
