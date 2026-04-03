import { memo, useEffect, useRef, useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAgentStore, EMPTY_MESSAGES, type AgentMessage } from "@/stores/agentStore";
import { agentIpc } from "@/ipc/agent";
import { persistSingleMessage, sessionInfoToPersistedSession } from "@/lib/agentPersistence";
import { useTerminalStore } from "@/stores/terminalStore";
import type { AgentChatMode, ImageAttachment } from "@forge/shared";
import { ChatMessage } from "./ChatMessage";
import { ToolCallCard } from "./ToolCallCard";
import { PermissionPrompt } from "./PermissionPrompt";
import { PlanReviewCard } from "./PlanReviewCard";
import { AgentStatusBar } from "./AgentStatusBar";
import { UnifiedInputCard } from "./UnifiedInputCard";
import { useSlashCommands } from "@/hooks/useCliDiscovery";

const PERMISSIVE_MODES: AgentChatMode[] = ["fullAccess"];

// Static selector for store actions — functions never change, so this selector
// always returns the same references and never triggers re-renders.
const actionsSelector = (s: ReturnType<typeof useAgentStore.getState>) => ({
  appendMessage: s.appendMessage,
  createPendingAssistant: s.createPendingAssistant,
  toggleMessageCollapsed: s.toggleMessageCollapsed,
  toggleReasoningCollapsed: s.toggleReasoningCollapsed,
  updateTabState: s.updateTabState,
  updateTabMeta: s.updateTabMeta,
  updateTabMode: s.updateTabMode,
  clearMessages: s.clearMessages,
});

interface ChatViewProps {
  sessionId: string;
  variant?: "default" | "claude";
}

export const ChatView = memo(function ChatView({ sessionId, variant = "default" }: ChatViewProps) {
  // Single data selector with shallow equality — only re-renders when this
  // session's tab or messages actually change, not when other sessions update.
  const { tab, messages, activeTabId } = useAgentStore(
    useShallow((s) => ({
      tab: s.tabs.find((t) => t.sessionId === sessionId),
      messages: s.messagesBySession[sessionId] ?? EMPTY_MESSAGES,
      activeTabId: s.activeTabId,
    })),
  );

  // Actions never change — single subscription, stable references
  const {
    appendMessage,
    createPendingAssistant,
    toggleMessageCollapsed,
    toggleReasoningCollapsed,
    updateTabState,
    updateTabMeta,
    updateTabMode,
    clearMessages,
  } = useAgentStore(actionsSelector);
  const { data: discoveredSlashCommands } = useSlashCommands(tab?.cliName ?? null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputFocusedRef = useRef(false);
  const isClaude = tab?.provider === "claude" || variant === "claude" || tab?.cliName === "claude";
  const slashCommands =
    isClaude && tab?.slashCommands?.length
      ? tab.slashCommands
      : (discoveredSlashCommands ?? []);

  // Auto-scroll on new messages — debounced with rAF to avoid layout thrashing
  // during high-frequency streaming updates
  const scrollRafRef = useRef<number>(0);
  useEffect(() => {
    cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(scrollRafRef.current);
  }, [messages]);

  // Build a map of toolUseId -> tool_result message
  const toolResultMap = useMemo(() => {
    const map = new Map<string, AgentMessage>();
    for (const msg of messages) {
      if (msg.type === "tool_result" && msg.toolUseId) {
        map.set(msg.toolUseId, msg);
      }
    }
    return map;
  }, [messages]);

  // Find the pending permission prompt
  const pendingPermission = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.type === "status" && msg.state === "awaiting_approval" && msg.toolUseId) {
        if (!msg.resolved && !toolResultMap.has(msg.toolUseId)) {
          return msg;
        }
      }
      if (msg.type === "assistant" || msg.type === "user") break;
    }
    return null;
  }, [messages, toolResultMap]);

  // Keyboard shortcut for permission prompts (y/n)
  useEffect(() => {
    if (!pendingPermission || activeTabId !== sessionId) return;

    const handler = (e: KeyboardEvent) => {
      if (inputFocusedRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const toolUseId = pendingPermission.toolUseId;
      if (!toolUseId) return;

      if (e.key === "y") {
        e.preventDefault();
        agentIpc.respondPermission(sessionId, toolUseId, true);
      } else if (e.key === "n") {
        e.preventDefault();
        agentIpc.respondPermission(sessionId, toolUseId, false);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [pendingPermission, sessionId, activeTabId]);

  const handleSend = useCallback(
    async (text: string, images?: ImageAttachment[]) => {
      const now = Date.now();
      const userMsg = {
        id: `user-${now}`,
        type: "user" as const,
        content: text,
        timestamp: now,
        collapsed: false,
        images: images?.length ? images : undefined,
        streamState: "completed" as const,
      };

      // Check if this is a dead/restored session that needs a new backend
      if (tab?.state === "completed" || tab?.state === "error") {
        try {
          const liveSessions = await agentIpc.listSessions();
          const isAlive = liveSessions.some((s) => s.id === sessionId);
          if (!isAlive) {
            // Look up terminal tab first so we can pass workspace/cwd to the new session
            const agentStore = useAgentStore.getState();
            const termStore = useTerminalStore.getState();
            const termTab = termStore.tabs.find((t) => t.sessionId === sessionId);

            // Resume: create a new backend session with same config
            const newSession = await agentIpc.createSession({
              cliName: tab.cliName,
              mode: tab.mode,
              workingDirectory: termTab?.workingDirectory ?? tab.workingDirectory,
              workspaceId: termTab?.workspaceId ?? "",
              initialPrompt: text,
              planMode: tab.planMode,
              claude: tab.cliName === "claude" ? {
                provider: "claude",
                model: tab.model,
                permissionMode: tab.mode,
                effort: tab.effort ?? undefined,
                planMode: tab.planMode,
                agent: tab.agent,
                claudePath: tab.claudePath ?? undefined,
              } : undefined,
            });
            if (termTab) {
              termStore.activateTab(termTab.tabId, newSession.id, {
                label: newSession.displayName,
                cliName: newSession.cliName,
                type: "chat",
              });
            }

            // Move messages to new session in agent store, add new tab
            const oldMessages = agentStore.messagesBySession[sessionId] ?? [];
            agentStore.removeTab(sessionId);
            agentStore.addTab({
              sessionId: newSession.id,
              label: newSession.displayName,
              cliName: newSession.cliName,
              mode: tab.mode,
              state: "thinking",
              conversationId: newSession.conversationId ?? null,
              provider: tab.provider,
              model: newSession.model ?? tab.model,
              permissionMode: newSession.permissionMode ?? tab.permissionMode,
              agent: newSession.agent ?? tab.agent,
              effort: newSession.effort ?? tab.effort,
              claudePath: newSession.claudePath ?? tab.claudePath,
              workingDirectory: tab.workingDirectory,
              planMode: tab.planMode,
              totalCost: 0,
            });

            // Re-add old messages for continuity in UI
            for (const msg of oldMessages) {
              agentStore.appendMessage(newSession.id, msg);
            }

            // Add the new user message and persist
            agentStore.appendMessage(newSession.id, userMsg);
            agentStore.createPendingAssistant(newSession.id);

            // Persist new session
            const persisted = sessionInfoToPersistedSession(
              newSession.id,
              termTab?.workspaceId ?? "",
              newSession.cliName,
              newSession.displayName,
              tab.mode,
              {
                provider: newSession.provider ?? tab.provider,
                model: newSession.model ?? tab.model,
                permissionMode: newSession.permissionMode ?? tab.permissionMode,
                agent: newSession.agent ?? tab.agent,
                effort: newSession.effort ?? tab.effort ?? undefined,
                claudePath: newSession.claudePath ?? tab.claudePath ?? undefined,
                planMode: tab.planMode,
                workingDirectory: tab.workingDirectory,
                conversationId: newSession.conversationId,
                createdAt: newSession.createdAt,
              },
            );
            void agentIpc.persistSession(persisted).catch(() => {});

            // Delete old persisted session
            void agentIpc.deletePersistedSession(sessionId).catch(() => {});

            return;
          }
        } catch {
          // If check fails, try sending normally
        }
      }

      appendMessage(sessionId, userMsg);
      createPendingAssistant(sessionId);
      updateTabState(sessionId, "thinking");
      // Persist user message immediately
      persistSingleMessage(sessionId, userMsg);
      void agentIpc.sendMessage(sessionId, text, images).catch((error) => {
        console.error("Failed to send agent message:", error);
      });
    },
    [sessionId, tab, appendMessage, createPendingAssistant, updateTabState],
  );

  const handleModeChange = useCallback(
    (mode: AgentChatMode) => {
      updateTabMode(sessionId, mode);
      void agentIpc.updatePermissionMode(sessionId, mode).catch((err) => {
        console.error("Failed to update permission mode:", err);
      });

      // Auto-resolve any pending approvals when switching to a permissive mode
      if (PERMISSIVE_MODES.includes(mode)) {
        const currentMessages = useAgentStore.getState().messagesBySession[sessionId] ?? [];
        for (const msg of currentMessages) {
          if (
            msg.type === "status" &&
            msg.state === "awaiting_approval" &&
            !msg.resolved &&
            msg.toolUseId
          ) {
            void agentIpc.respondPermission(sessionId, msg.toolUseId, true).catch((err) => {
              console.error("Failed to auto-approve pending:", err);
            });
          }
        }
      }
    },
    [sessionId, updateTabMode],
  );

  const handlePlanModeChange = useCallback(
    (newPlanMode: boolean) => {
      updateTabMeta(sessionId, { planMode: newPlanMode });
      // Send /plan or /default as a message to toggle mid-session
      const cmd = newPlanMode ? "/plan" : "/default";
      void agentIpc.sendMessage(sessionId, cmd).catch((err) => {
        console.error("Failed to toggle plan mode:", err);
      });
    },
    [sessionId, updateTabMeta],
  );

  const handleAbort = useCallback(() => {
    void agentIpc.abort(sessionId).catch((error) => {
      console.error("Failed to abort agent session:", error);
    });
  }, [sessionId]);

  if (!tab) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Session not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => {
          if (msg.type === "tool_result") return null;

          if (msg.type === "tool_use") {
            const result = msg.toolUseId ? toolResultMap.get(msg.toolUseId) : undefined;
            return (
              <ToolCallCard
                key={msg.id}
                toolUse={msg}
                toolResult={result}
                collapsed={msg.collapsed}
                onToggle={() => toggleMessageCollapsed(sessionId, msg.id)}
              />
            );
          }

          if (msg.type === "status" && msg.state === "awaiting_approval" && !msg.resolved) {
            return (
              <PermissionPrompt key={msg.id} message={msg} sessionId={sessionId} />
            );
          }

          if (msg.type === "status") {
            return (
              <p key={msg.id} className="text-center text-xs text-muted-foreground">
                {msg.content}
              </p>
            );
          }

          // Skip empty completed assistant messages (issue #6)
          if (
            msg.type === "assistant" &&
            msg.streamState !== "pending" &&
            msg.streamState !== "streaming" &&
            !msg.content?.trim() &&
            !msg.reasoning?.trim()
          ) {
            return null;
          }

          if (msg.type === "user" || msg.type === "assistant") {
            return (
              <ChatMessage
                key={msg.id}
                message={msg}
                onToggleReasoning={
                  msg.type === "assistant"
                    ? () => toggleReasoningCollapsed(sessionId, msg.id)
                    : undefined
                }
              />
            );
          }

          if (msg.type === "system") {
            return (
              <p key={msg.id} className="text-center text-xs text-muted-foreground">
                {msg.content}
              </p>
            );
          }

          if (msg.type === "error") {
            return (
              <p key={msg.id} className="text-center text-xs text-red-400">
                {msg.content}
              </p>
            );
          }

          return null;
        })}

        {tab.planReview && (
          <PlanReviewCard
            planFilePath={tab.planReview.filePath}
            planContent={tab.planReview.content}
            sessionId={sessionId}
            underlyingMode={tab.planReview.underlyingMode}
            exitPlanToolUseId={tab.planReview.exitPlanToolUseId}
          />
        )}
      </div>

      <AgentStatusBar
        state={tab.state}
        model={tab.model}
        permissionMode={tab.permissionMode}
        agent={tab.agent}
        effort={tab.effort}
        totalCost={tab.totalCost}
        planMode={tab?.planMode}
      />

      <UnifiedInputCard
        onSend={handleSend}
        onAbort={handleAbort}
        agentState={tab.state}
        planReviewActive={!!tab.planReview}
        mode={tab.mode}
        onModeChange={handleModeChange}
        planMode={tab?.planMode}
        onPlanModeChange={handlePlanModeChange}
        slashCommands={slashCommands ?? []}
        onFocusChange={(focused) => {
          inputFocusedRef.current = focused;
        }}
        onClear={() => clearMessages(sessionId)}
      />
    </div>
  );
});
