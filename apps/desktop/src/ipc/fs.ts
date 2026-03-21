import { invoke } from '@tauri-apps/api/core';
import type { DirEntry } from '@forge/core';

export const fsIpc = {
  readDirectory: (path: string, showHidden = false): Promise<DirEntry[]> =>
    invoke('read_directory', { path, showHidden }),
};
