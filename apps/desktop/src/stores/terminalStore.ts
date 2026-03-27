import { create } from "zustand";
import type { AgentMode } from "@forge/shared";

export type TerminalLayoutMode = "tabs" | "grid" | "horizontal-scroll";

export interface TerminalTab {
  tabId: string;                // client-generated UUID, primary key
  sessionId: string | null;     // null during pre-session
  workspaceId: string;
  label: string;
  cliName: string | null;       // null until selected/defaulted
  mode: AgentMode;
  type: "terminal" | "chat";
  status: "pre-session" | "active";
}

let tabCounter = 0;
function generateTabId(): string {
  return `tab-${Date.now()}-${++tabCounter}`;
}

interface TerminalStore {
  layoutMode: TerminalLayoutMode;
  tabs: TerminalTab[];
  activeTabId: string | null;   // references tabId
  setLayoutMode: (mode: TerminalLayoutMode) => void;
  addTab: (tab: TerminalTab) => void;
  addPreSessionTab: (workspaceId: string) => string;
  activateTab: (tabId: string, sessionId: string, updates: Partial<TerminalTab>) => void;
  updateTabConfig: (tabId: string, updates: Partial<Pick<TerminalTab, "cliName" | "mode" | "type">>) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  layoutMode: "tabs",
  tabs: [],
  activeTabId: null,
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.tabId,
    })),
  addPreSessionTab: (workspaceId) => {
    const tabId = generateTabId();
    set((s) => ({
      tabs: [
        ...s.tabs,
        {
          tabId,
          sessionId: null,
          workspaceId,
          label: "New Agent",
          cliName: null,
          mode: "Normal",
          type: "chat",
          status: "pre-session",
        },
      ],
      activeTabId: tabId,
    }));
    return tabId;
  },
  activateTab: (tabId, sessionId, updates) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.tabId === tabId
          ? { ...t, ...updates, sessionId, status: "active" as const }
          : t,
      ),
    })),
  updateTabConfig: (tabId, updates) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.tabId === tabId ? { ...t, ...updates } : t,
      ),
    })),
  removeTab: (tabId) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.tabId !== tabId);
      const activeTabId =
        s.activeTabId === tabId
          ? tabs[tabs.length - 1]?.tabId ?? null
          : s.activeTabId;
      return { tabs, activeTabId };
    }),
  setActiveTab: (tabId) => set({ activeTabId: tabId }),
}));
