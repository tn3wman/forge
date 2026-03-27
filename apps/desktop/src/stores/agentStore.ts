import { create } from "zustand";
import type { AgentChatMode, AgentState } from "@forge/shared";

export interface AgentMessage {
  id: string;
  type: "user" | "assistant" | "tool_use" | "tool_result" | "status" | "error" | "system";
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  toolUseId?: string;
  isError?: boolean;
  state?: AgentState;
  timestamp: number;
  collapsed: boolean;
}

export interface AgentTab {
  sessionId: string;
  label: string;
  cliName: string;
  mode: AgentChatMode;
  state: AgentState;
  conversationId: string | null;
  model?: string;
  totalCost: number;
}

interface AgentStore {
  tabs: AgentTab[];
  activeTabId: string | null;
  messagesBySession: Record<string, AgentMessage[]>;

  addTab: (tab: AgentTab) => void;
  removeTab: (sessionId: string) => void;
  setActiveTab: (sessionId: string) => void;

  appendMessage: (sessionId: string, message: AgentMessage) => void;
  updateLastAssistantMessage: (sessionId: string, contentDelta: string) => void;
  updateTabState: (sessionId: string, state: AgentState) => void;
  updateTabCost: (sessionId: string, cost: number) => void;
  setConversationId: (sessionId: string, conversationId: string) => void;
  setModel: (sessionId: string, model: string) => void;
  updateTabMode: (sessionId: string, mode: AgentChatMode) => void;
  toggleMessageCollapsed: (sessionId: string, messageId: string) => void;
  clearMessages: (sessionId: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  tabs: [],
  activeTabId: null,
  messagesBySession: {},

  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.sessionId,
      messagesBySession: { ...s.messagesBySession, [tab.sessionId]: [] },
    })),

  removeTab: (sessionId) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.sessionId !== sessionId);
      const activeTabId =
        s.activeTabId === sessionId
          ? tabs[tabs.length - 1]?.sessionId ?? null
          : s.activeTabId;
      const { [sessionId]: _, ...messagesBySession } = s.messagesBySession;
      return { tabs, activeTabId, messagesBySession };
    }),

  setActiveTab: (sessionId) => set({ activeTabId: sessionId }),

  appendMessage: (sessionId, message) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: [...(s.messagesBySession[sessionId] ?? []), message],
      },
    })),

  updateLastAssistantMessage: (sessionId, contentDelta) =>
    set((s) => {
      const messages = s.messagesBySession[sessionId];
      if (!messages || messages.length === 0) return s;
      const lastIdx = messages.length - 1;
      const last = messages[lastIdx];
      if (last.type !== "assistant") return s;
      const updated = [...messages];
      updated[lastIdx] = { ...last, content: last.content + contentDelta };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: updated },
      };
    }),

  updateTabState: (sessionId, state) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, state } : t,
      ),
    })),

  updateTabCost: (sessionId, cost) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, totalCost: cost } : t,
      ),
    })),

  setConversationId: (sessionId, conversationId) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, conversationId } : t,
      ),
    })),

  setModel: (sessionId, model) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, model } : t,
      ),
    })),

  updateTabMode: (sessionId, mode) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, mode } : t,
      ),
    })),

  toggleMessageCollapsed: (sessionId, messageId) =>
    set((s) => {
      const messages = s.messagesBySession[sessionId];
      if (!messages) return s;
      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: messages.map((m) =>
            m.id === messageId ? { ...m, collapsed: !m.collapsed } : m,
          ),
        },
      };
    }),

  clearMessages: (sessionId) =>
    set((s) => ({
      messagesBySession: { ...s.messagesBySession, [sessionId]: [] },
    })),
}));
