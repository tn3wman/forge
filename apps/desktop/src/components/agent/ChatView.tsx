import { useEffect, useRef, useMemo, useCallback } from "react";
import { useAgentStore, type AgentMessage } from "@/stores/agentStore";
import { agentIpc } from "@/ipc/agent";
import type { AgentChatMode, ImageAttachment } from "@forge/shared";
import { ChatMessage } from "./ChatMessage";
import { ToolCallCard } from "./ToolCallCard";
import { PermissionPrompt } from "./PermissionPrompt";
import { AgentStatusBar } from "./AgentStatusBar";
import { UnifiedInputCard } from "./UnifiedInputCard";
import { useSlashCommands } from "@/hooks/useCliDiscovery";

const PERMISSIVE_MODES: AgentChatMode[] = ["bypassPermissions", "dontAsk"];

interface ChatViewProps {
  sessionId: string;
  variant?: "default" | "claude";
}

export function ChatView({ sessionId, variant = "default" }: ChatViewProps) {
  const tab = useAgentStore((s) => s.tabs.find((t) => t.sessionId === sessionId));
  const messages = useAgentStore((s) => s.messagesBySession[sessionId] ?? []);
  const appendMessage = useAgentStore((s) => s.appendMessage);
  const createPendingAssistant = useAgentStore((s) => s.createPendingAssistant);
  const toggleMessageCollapsed = useAgentStore((s) => s.toggleMessageCollapsed);
  const toggleReasoningCollapsed = useAgentStore((s) => s.toggleReasoningCollapsed);
  const updateTabState = useAgentStore((s) => s.updateTabState);
  const updateTabMode = useAgentStore((s) => s.updateTabMode);
  const clearMessages = useAgentStore((s) => s.clearMessages);
  const activeTabId = useAgentStore((s) => s.activeTabId);
  const { data: discoveredSlashCommands } = useSlashCommands(tab?.cliName ?? null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputFocusedRef = useRef(false);
  const isClaude = tab?.provider === "claude" || variant === "claude" || tab?.cliName === "claude";
  const slashCommands =
    isClaude && tab?.slashCommands?.length
      ? tab.slashCommands
      : (discoveredSlashCommands ?? []);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
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
    (text: string, images?: ImageAttachment[]) => {
      const now = Date.now();
      appendMessage(sessionId, {
        id: `user-${Date.now()}`,
        type: "user",
        content: text,
        timestamp: now,
        collapsed: false,
        images: images?.length ? images : undefined,
      });
      createPendingAssistant(sessionId);
      updateTabState(sessionId, "thinking");
      void agentIpc.sendMessage(sessionId, text, images).catch((error) => {
        console.error("Failed to send agent message:", error);
      });
    },
    [sessionId, appendMessage, createPendingAssistant, updateTabState],
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
      </div>

      <AgentStatusBar
        state={tab.state}
        model={tab.model}
        permissionMode={tab.permissionMode}
        agent={tab.agent}
        effort={tab.effort}
        totalCost={tab.totalCost}
      />

      <UnifiedInputCard
        onSend={handleSend}
        onAbort={handleAbort}
        agentState={tab.state}
        mode={tab.mode}
        onModeChange={handleModeChange}
        slashCommands={slashCommands ?? []}
        onFocusChange={(focused) => {
          inputFocusedRef.current = focused;
        }}
        onClear={() => clearMessages(sessionId)}
      />
    </div>
  );
}
