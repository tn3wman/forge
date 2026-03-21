import { invoke } from '@tauri-apps/api/core';
import type { DirEntry } from '@forge/core';

export const fsIpc = {
  readDirectory: (path: string, showHidden = false): Promise<DirEntry[]> =>
    invoke('read_directory', { path, showHidden }),

  startWatcher: (bayId: string, path: string): Promise<void> =>
    invoke('start_file_watcher', { bayId, path }),

  stopWatcher: (bayId: string): Promise<void> => invoke('stop_file_watcher', { bayId }),

  readFile: (path: string): Promise<string> => invoke('read_file', { path }),

  writeFile: (path: string, content: string): Promise<void> =>
    invoke('write_file', { path, content }),
};
