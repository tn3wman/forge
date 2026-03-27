import { create } from "zustand";
import type {
  AgentChatMode,
  AgentProvider,
  AgentState,
  AgentStreamState,
  ClaudeEffort,
  ImageAttachment,
  SlashCommandInfo,
} from "@forge/shared";

export interface AgentMessage {
  id: string;
  type: "user" | "assistant" | "tool_use" | "tool_result" | "status" | "error" | "system";
  content: string;
  timestamp: number;
  collapsed: boolean;
  messageId?: string;
  turnId?: string;
  streamState?: AgentStreamState;
  reasoning?: string;
  reasoningState?: AgentStreamState;
  reasoningCollapsed?: boolean;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolInputText?: string;
  toolUseId?: string;
  toolStatus?: string;
  detail?: string;
  approvalId?: string;
  resolved?: boolean;
  isError?: boolean;
  state?: AgentState;
  images?: ImageAttachment[];
}

export interface AgentTab {
  sessionId: string;
  label: string;
  cliName: string;
  mode: AgentChatMode;
  state: AgentState;
  conversationId: string | null;
  model?: string;
  provider?: AgentProvider;
  permissionMode?: string;
  agent?: string;
  effort?: ClaudeEffort | null;
  claudePath?: string | null;
  capabilitiesLoaded?: boolean;
  slashCommands?: SlashCommandInfo[];
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
  createPendingAssistant: (sessionId: string, turnId?: string) => void;
  startAssistantMessage: (sessionId: string, messageId: string, turnId?: string) => void;
  appendAssistantDelta: (sessionId: string, messageId: string, contentDelta: string) => void;
  completeAssistantMessage: (sessionId: string, messageId: string, finalText?: string, turnId?: string) => void;
  appendReasoningDelta: (sessionId: string, contentDelta: string, messageId?: string, turnId?: string) => void;
  completeReasoning: (sessionId: string, messageId?: string, turnId?: string) => void;
  startToolUse: (sessionId: string, toolUseId: string, toolName: string, toolInput?: Record<string, unknown>, turnId?: string) => void;
  appendToolInputDelta: (sessionId: string, toolUseId: string, inputDelta: string) => void;
  updateToolProgress: (sessionId: string, toolUseId?: string, toolName?: string, status?: string) => void;
  appendToolResultDelta: (sessionId: string, toolUseId: string, contentDelta: string, isError?: boolean) => void;
  completeToolResult: (sessionId: string, toolUseId: string, content?: string, isError?: boolean) => void;
  resolveApproval: (sessionId: string, approvalId: string, allow: boolean) => void;
  fillEmptyAssistant: (sessionId: string, text: string) => void;
  markAssistantError: (sessionId: string, content?: string) => void;
  updateTabState: (sessionId: string, state: AgentState) => void;
  updateTabCost: (sessionId: string, cost: number) => void;
  setConversationId: (sessionId: string, conversationId: string) => void;
  setModel: (sessionId: string, model: string) => void;
  updateTabMeta: (sessionId: string, patch: Partial<AgentTab>) => void;
  updateTabMode: (sessionId: string, mode: AgentChatMode) => void;
  toggleMessageCollapsed: (sessionId: string, messageId: string) => void;
  toggleReasoningCollapsed: (sessionId: string, messageId: string) => void;
  clearMessages: (sessionId: string) => void;
}

let localIdCounter = 0;
function nextLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${localIdCounter++}`;
}

function serializeToolInput(toolInput?: Record<string, unknown>) {
  if (!toolInput) return undefined;
  if (Object.keys(toolInput).length === 0) return undefined;
  return JSON.stringify(toolInput, null, 2);
}

function getMessagesForSession(
  messagesBySession: Record<string, AgentMessage[]>,
  sessionId: string,
) {
  return messagesBySession[sessionId] ?? [];
}

function findMessageIndex(
  messages: AgentMessage[],
  predicate: (message: AgentMessage) => boolean,
) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (predicate(messages[i])) return i;
  }
  return -1;
}

function findAssistantIndex(messages: AgentMessage[], messageId?: string, turnId?: string) {
  if (messageId) {
    const exact = findMessageIndex(
      messages,
      (message) => message.type === "assistant" && message.messageId === messageId,
    );
    if (exact >= 0) return exact;
  }

  if (turnId) {
    const turnMatch = findMessageIndex(
      messages,
      (message) =>
        message.type === "assistant" &&
        message.turnId === turnId &&
        message.streamState !== "completed" &&
        message.streamState !== "error",
    );
    if (turnMatch >= 0) return turnMatch;
  }

  return findMessageIndex(
    messages,
    (message) =>
      message.type === "assistant" &&
      (message.streamState === "pending" || message.streamState === "streaming"),
  );
}

function upsertAssistant(
  messages: AgentMessage[],
  messageId?: string,
  turnId?: string,
) {
  const idx = findAssistantIndex(messages, messageId, turnId);
  if (idx >= 0) {
    return { messages: [...messages], idx };
  }

  const next = [...messages];
  next.push({
    id: nextLocalId("assistant"),
    type: "assistant",
    content: "",
    timestamp: Date.now(),
    collapsed: false,
    messageId,
    turnId,
    streamState: "pending",
    reasoning: "",
    reasoningState: "pending",
    reasoningCollapsed: false,
  });
  return { messages: next, idx: next.length - 1 };
}

function upsertToolResult(messages: AgentMessage[], toolUseId: string) {
  const idx = findMessageIndex(
    messages,
    (message) => message.type === "tool_result" && message.toolUseId === toolUseId,
  );
  if (idx >= 0) {
    return { messages: [...messages], idx };
  }

  const next = [...messages];
  next.push({
    id: nextLocalId("tool-result"),
    type: "tool_result",
    content: "",
    timestamp: Date.now(),
    collapsed: false,
    toolUseId,
    streamState: "pending",
  });
  return { messages: next, idx: next.length - 1 };
}

export const useAgentStore = create<AgentStore>((set) => ({
  tabs: [],
  activeTabId: null,
  messagesBySession: {},

  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.sessionId,
      messagesBySession: {
        ...s.messagesBySession,
        [tab.sessionId]: s.messagesBySession[tab.sessionId] ?? [],
      },
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
        [sessionId]: [...getMessagesForSession(s.messagesBySession, sessionId), message],
      },
    })),

  createPendingAssistant: (sessionId, turnId) =>
    set((s) => {
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      const idx = findAssistantIndex(messages, undefined, turnId);
      if (idx >= 0) return s;

      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: [
            ...messages,
            {
              id: nextLocalId("assistant"),
              type: "assistant",
              content: "",
              timestamp: Date.now(),
              collapsed: false,
              turnId,
              streamState: "pending",
              reasoning: "",
              reasoningState: "pending",
              reasoningCollapsed: false,
            },
          ],
        },
      };
    }),

  startAssistantMessage: (sessionId, messageId, turnId) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const { messages, idx } = upsertAssistant(current, messageId, turnId);
      const existing = messages[idx];
      messages[idx] = {
        ...existing,
        messageId,
        turnId: turnId ?? existing.turnId,
        streamState: existing.content ? "streaming" : "pending",
      };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      };
    }),

  appendAssistantDelta: (sessionId, messageId, contentDelta) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const { messages, idx } = upsertAssistant(current, messageId);
      const existing = messages[idx];
      messages[idx] = {
        ...existing,
        messageId,
        content: `${existing.content}${contentDelta}`,
        streamState: "streaming",
      };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      };
    }),

  completeAssistantMessage: (sessionId, messageId, finalText, turnId) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const { messages, idx } = upsertAssistant(current, messageId, turnId);
      const existing = messages[idx];
      const content =
        finalText && finalText.length >= existing.content.length
          ? finalText
          : existing.content;
      messages[idx] = {
        ...existing,
        messageId,
        turnId: turnId ?? existing.turnId,
        content,
        streamState: "completed",
      };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      };
    }),

  appendReasoningDelta: (sessionId, contentDelta, messageId, turnId) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const { messages, idx } = upsertAssistant(current, messageId, turnId);
      const existing = messages[idx];
      messages[idx] = {
        ...existing,
        messageId: messageId ?? existing.messageId,
        turnId: turnId ?? existing.turnId,
        reasoning: `${existing.reasoning ?? ""}${contentDelta}`,
        reasoningState: "streaming",
        reasoningCollapsed: false,
      };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      };
    }),

  completeReasoning: (sessionId, messageId, turnId) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const idx = findAssistantIndex(current, messageId, turnId);
      if (idx < 0) return s;
      const messages = [...current];
      const existing = messages[idx];
      messages[idx] = {
        ...existing,
        reasoningState: existing.reasoning ? "completed" : existing.reasoningState,
        reasoningCollapsed: existing.reasoning ? true : existing.reasoningCollapsed,
      };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      };
    }),

  startToolUse: (sessionId, toolUseId, toolName, toolInput, turnId) =>
    set((s) => {
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      const idx = findMessageIndex(
        messages,
        (message) => message.type === "tool_use" && message.toolUseId === toolUseId,
      );
      const next = [...messages];

      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          toolName,
          toolInput,
          toolInputText: serializeToolInput(toolInput) ?? next[idx].toolInputText,
          turnId: turnId ?? next[idx].turnId,
          streamState: "streaming",
        };
      } else {
        next.push({
          id: nextLocalId("tool"),
          type: "tool_use",
          content: "",
          timestamp: Date.now(),
          collapsed: false,
          toolName,
          toolInput,
          toolInputText: serializeToolInput(toolInput),
          toolUseId,
          turnId,
          streamState: "streaming",
        });
      }

      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: next },
      };
    }),

  appendToolInputDelta: (sessionId, toolUseId, inputDelta) =>
    set((s) => {
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      const idx = findMessageIndex(
        messages,
        (message) => message.type === "tool_use" && message.toolUseId === toolUseId,
      );
      if (idx < 0) return s;

      const next = [...messages];
      const existing = next[idx];
      const toolInputText = `${existing.toolInputText ?? ""}${inputDelta}`;
      let toolInput = existing.toolInput;
      try {
        const parsed = JSON.parse(toolInputText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          toolInput = parsed as Record<string, unknown>;
        }
      } catch {
        // Partial JSON is expected while the tool input is streaming.
      }

      next[idx] = {
        ...existing,
        toolInputText,
        toolInput,
        streamState: "streaming",
      };

      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: next },
      };
    }),

  updateToolProgress: (sessionId, toolUseId, toolName, status) =>
    set((s) => {
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      const idx = findMessageIndex(
        messages,
        (message) =>
          message.type === "tool_use" &&
          (Boolean(toolUseId && message.toolUseId === toolUseId) ||
            Boolean(!toolUseId && toolName && message.toolName === toolName)),
      );
      if (idx < 0) return s;

      const next = [...messages];
      next[idx] = {
        ...next[idx],
        toolName: toolName ?? next[idx].toolName,
        toolStatus: status ?? next[idx].toolStatus,
        streamState: "streaming",
      };

      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: next },
      };
    }),

  appendToolResultDelta: (sessionId, toolUseId, contentDelta, isError) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const { messages, idx } = upsertToolResult(current, toolUseId);
      const existing = messages[idx];
      messages[idx] = {
        ...existing,
        content: `${existing.content}${contentDelta}`,
        isError: isError ?? existing.isError,
        streamState: "streaming",
      };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      };
    }),

  completeToolResult: (sessionId, toolUseId, content, isError) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const { messages, idx } = upsertToolResult(current, toolUseId);
      const existing = messages[idx];
      messages[idx] = {
        ...existing,
        content:
          content && content.length >= existing.content.length ? content : existing.content,
        isError: isError ?? existing.isError,
        streamState: isError ? "error" : "completed",
      };

      const toolIdx = findMessageIndex(
        messages,
        (message) => message.type === "tool_use" && message.toolUseId === toolUseId,
      );
      if (toolIdx >= 0) {
        messages[toolIdx] = {
          ...messages[toolIdx],
          streamState: isError ? "error" : "completed",
        };
      }

      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      };
    }),

  resolveApproval: (sessionId, approvalId, allow) =>
    set((s) => {
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      const next = messages.map((message) => {
        if (message.type !== "status" || message.approvalId !== approvalId) {
          return message;
        }

        return {
          ...message,
          resolved: true,
          streamState: "completed" as const,
          content: allow
            ? `Approved${message.toolName ? ` ${message.toolName}` : ""}`
            : `Denied${message.toolName ? ` ${message.toolName}` : ""}`,
        };
      });

      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: next },
      };
    }),

  fillEmptyAssistant: (sessionId, text) =>
    set((s) => {
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      const idx = findMessageIndex(
        messages,
        (message) => message.type === "assistant",
      );
      if (idx < 0) return s;
      const existing = messages[idx];
      if (existing.content && existing.content.trim().length > 0) return s;
      const next = [...messages];
      next[idx] = {
        ...existing,
        content: text,
        streamState: "completed",
      };
      return {
        messagesBySession: { ...s.messagesBySession, [sessionId]: next },
      };
    }),

  markAssistantError: (sessionId, content) =>
    set((s) => {
      const current = getMessagesForSession(s.messagesBySession, sessionId);
      const idx = findMessageIndex(
        current,
        (message) =>
          message.type === "assistant" &&
          message.streamState !== "completed" &&
          message.streamState !== "error",
      );

      if (idx >= 0) {
        const messages = [...current];
        const existing = messages[idx];
        messages[idx] = {
          ...existing,
          content: content || existing.content,
          streamState: "error",
          reasoningCollapsed: true,
          reasoningState:
            existing.reasoning && existing.reasoningState !== "completed"
              ? "completed"
              : existing.reasoningState,
        };
        return {
          messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
        };
      }

      if (!content) return s;

      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: [
            ...current,
            {
              id: nextLocalId("assistant-error"),
              type: "error",
              content,
              timestamp: Date.now(),
              collapsed: false,
            },
          ],
        },
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

  updateTabMeta: (sessionId, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, ...patch } : t,
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
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: messages.map((message) =>
            message.id === messageId
              ? { ...message, collapsed: !message.collapsed }
              : message,
          ),
        },
      };
    }),

  toggleReasoningCollapsed: (sessionId, messageId) =>
    set((s) => {
      const messages = getMessagesForSession(s.messagesBySession, sessionId);
      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  reasoningCollapsed: !message.reasoningCollapsed,
                }
              : message,
          ),
        },
      };
    }),

  clearMessages: (sessionId) =>
    set((s) => ({
      messagesBySession: { ...s.messagesBySession, [sessionId]: [] },
    })),
}));
