import { create } from "zustand";
import type { AgentMode } from "@forge/shared";

export interface TerminalTab {
  sessionId: string;
  label: string;
  cliName: string;
  mode: AgentMode;
}

interface TerminalStore {
  isOpen: boolean;
  panelHeight: number;
  tabs: TerminalTab[];
  activeTabId: string | null;
  togglePanel: () => void;
  openPanel: () => void;
  setPanelHeight: (height: number) => void;
  addTab: (tab: TerminalTab) => void;
  removeTab: (sessionId: string) => void;
  setActiveTab: (sessionId: string) => void;
}

const DEFAULT_PANEL_HEIGHT = 300;

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  isOpen: false,
  panelHeight: DEFAULT_PANEL_HEIGHT,
  tabs: [],
  activeTabId: null,
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  setPanelHeight: (height) => set({ panelHeight: Math.max(150, Math.min(height, 600)) }),
  addTab: (tab) => set((s) => ({
    tabs: [...s.tabs, tab],
    activeTabId: tab.sessionId,
    isOpen: true,
  })),
  removeTab: (sessionId) => set((s) => {
    const tabs = s.tabs.filter((t) => t.sessionId !== sessionId);
    const activeTabId = s.activeTabId === sessionId
      ? tabs[tabs.length - 1]?.sessionId ?? null
      : s.activeTabId;
    return { tabs, activeTabId, isOpen: tabs.length > 0 ? s.isOpen : false };
  }),
  setActiveTab: (sessionId) => set({ activeTabId: sessionId }),
}));
