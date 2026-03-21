import { useReducer, useCallback } from 'react';
import type { TerminalTab } from '@forge/core';
import { ptyIpc } from '../ipc/pty';

export interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
}

type TerminalTabAction =
  | { type: 'ADD_TAB'; tab: TerminalTab }
  | { type: 'REMOVE_TAB'; tabId: string }
  | { type: 'SELECT_TAB'; tabId: string }
  | { type: 'RENAME_TAB'; tabId: string; label: string }
  | { type: 'MARK_EXITED'; tabId: string; exitCode: number | null }
  | { type: 'SET_TABS'; tabs: TerminalTab[] };

export function terminalTabsReducer(
  state: TerminalTabsState,
  action: TerminalTabAction,
): TerminalTabsState {
  switch (action.type) {
    case 'ADD_TAB':
      return { tabs: [...state.tabs, action.tab], activeTabId: action.tab.id };
    case 'REMOVE_TAB': {
      const idx = state.tabs.findIndex((t) => t.id === action.tabId);
      const next = state.tabs.filter((t) => t.id !== action.tabId);
      let nextActive = state.activeTabId;
      if (state.activeTabId === action.tabId) {
        nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null;
      }
      return { tabs: next, activeTabId: nextActive };
    }
    case 'SELECT_TAB':
      return { ...state, activeTabId: action.tabId };
    case 'RENAME_TAB':
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === action.tabId ? { ...t, label: action.label } : t)),
      };
    case 'MARK_EXITED':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, isExited: true, exitCode: action.exitCode } : t,
        ),
      };
    case 'SET_TABS':
      return { tabs: action.tabs, activeTabId: action.tabs[0]?.id ?? null };
    default:
      return state;
  }
}

export function useTerminalTabs(bayId: string) {
  const [state, dispatch] = useReducer(terminalTabsReducer, { tabs: [], activeTabId: null });

  const addTab = useCallback(
    async (cwd: string, cols: number, rows: number) => {
      const info = await ptyIpc.spawn(bayId, cwd, cols, rows);
      dispatch({
        type: 'ADD_TAB',
        tab: { id: info.id, label: info.label, isExited: false, exitCode: null },
      });
      return info;
    },
    [bayId],
  );

  const removeTab = useCallback(async (tabId: string) => {
    await ptyIpc.kill(tabId).catch(() => {});
    dispatch({ type: 'REMOVE_TAB', tabId });
  }, []);

  const selectTab = useCallback((tabId: string) => dispatch({ type: 'SELECT_TAB', tabId }), []);

  const renameTab = useCallback(async (tabId: string, label: string) => {
    await ptyIpc.rename(tabId, label);
    dispatch({ type: 'RENAME_TAB', tabId, label });
  }, []);

  const markExited = useCallback(
    (tabId: string, exitCode: number | null) => dispatch({ type: 'MARK_EXITED', tabId, exitCode }),
    [],
  );

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    addTab,
    removeTab,
    selectTab,
    renameTab,
    markExited,
  };
}
