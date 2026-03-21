export interface Bay {
  id: string;
  name: string;
  projectPath: string;
  gitBranch: string | null;
  status: BayStatus;
  windowState: WindowState;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export const BAY_STATUSES = ['active', 'inactive', 'loading', 'error'] as const;
export type BayStatus = (typeof BAY_STATUSES)[number];

export function isBayStatus(value: string): value is BayStatus {
  return (BAY_STATUSES as readonly string[]).includes(value);
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  leftRailWidth: number;
  rightRailWidth: number;
  bottomTrayHeight: number;
  openTabs: string[];
  activeTab: string | null;
}
