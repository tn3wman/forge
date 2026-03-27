import { create } from "zustand";
import type { AgentMode } from "@forge/shared";

export type TerminalLayoutMode = "tabs" | "grid" | "horizontal-scroll";

export interface TerminalTab {
  sessionId: string;
  label: string;
  cliName: string;
  mode: AgentMode;
  type: "terminal" | "chat";
}

interface TerminalStore {
  layoutMode: TerminalLayoutMode;
  tabs: TerminalTab[];
  activeTabId: string | null;
  setLayoutMode: (mode: TerminalLayoutMode) => void;
  addTab: (tab: TerminalTab) => void;
  removeTab: (sessionId: string) => void;
  setActiveTab: (sessionId: string) => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  layoutMode: "tabs",
  tabs: [],
  activeTabId: null,
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.sessionId,
    })),
  removeTab: (sessionId) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.sessionId !== sessionId);
      const activeTabId =
        s.activeTabId === sessionId
          ? tabs[tabs.length - 1]?.sessionId ?? null
          : s.activeTabId;
      return { tabs, activeTabId };
    }),
  setActiveTab: (sessionId) => set({ activeTabId: sessionId }),
}));
