export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  isSymlink: boolean;
}

export interface FsChangeEvent {
  kind: 'create' | 'modify' | 'remove' | 'rename';
  paths: string[];
}
