import type { WindowState } from '@forge/core';

export const DEFAULT_WINDOW_STATE: WindowState = {
  x: 0,
  y: 0,
  width: 1400,
  height: 900,
  isMaximized: false,
  leftRailWidth: 240,
  rightRailWidth: 300,
  bottomTrayHeight: 200,
  openTabs: [],
  activeTab: null,
};

export function parseWindowState(json: string | null): WindowState {
  if (!json) return { ...DEFAULT_WINDOW_STATE };
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_WINDOW_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_WINDOW_STATE };
  }
}

export function serializeWindowState(state: WindowState): string {
  return JSON.stringify(state);
}
