export interface CommitInfo {
  oid: string;
  shortId: string;
  message: string;
  author: string;
  authorEmail: string;
  timestamp: number;
  parents: string[];
}

export interface BranchInfo {
  name: string;
  isHead: boolean;
  isRemote: boolean;
  upstream: string | null;
  commitOid: string;
}

export interface FileStatus {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked" | "conflicted";
  staged: boolean;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

export interface DiffLine {
  content: string;
  origin: "+" | "-" | " ";
  oldLineNo: number | null;
  newLineNo: number | null;
}

export interface DiffEntry {
  path: string;
  status: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface GraphRow {
  commit: CommitInfo;
  column: number;
  lines: GraphLine[];
}

export interface GraphLine {
  fromColumn: number;
  toColumn: number;
  colorIndex: number;
}

export interface StashEntry {
  index: number;
  message: string;
  timestamp: number;
}
