import { useEffect, useRef, useMemo, useCallback } from "react";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useAgentStore, type AgentMessage } from "@/stores/agentStore";
import { agentIpc } from "@/ipc/agent";
import { ChatMessage } from "./ChatMessage";
import { ToolCallCard } from "./ToolCallCard";
import { PermissionPrompt } from "./PermissionPrompt";
import { ChatInput } from "./ChatInput";
import { AgentStatusBar } from "./AgentStatusBar";
import { ModeSelector } from "./ModeSelector";

interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  useAgentSession(sessionId);

  const tab = useAgentStore((s) => s.tabs.find((t) => t.sessionId === sessionId));
  const messages = useAgentStore((s) => s.messagesBySession[sessionId] ?? []);
  const appendMessage = useAgentStore((s) => s.appendMessage);
  const toggleMessageCollapsed = useAgentStore((s) => s.toggleMessageCollapsed);
  const updateTabMode = useAgentStore((s) => s.updateTabMode);
  const clearMessages = useAgentStore((s) => s.clearMessages);
  const activeTabId = useAgentStore((s) => s.activeTabId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputFocusedRef = useRef(false);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

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

  // Find the pending permission prompt (last awaiting_approval status message without a tool_result)
  const pendingPermission = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.type === "status" && msg.state === "awaiting_approval" && msg.toolUseId) {
        // Check if it already has a tool_result
        if (!toolResultMap.has(msg.toolUseId)) {
          return msg;
        }
      }
      // Stop scanning once we hit a non-status message going backwards
      if (msg.type === "assistant" || msg.type === "user") break;
    }
    return null;
  }, [messages, toolResultMap]);

  // Keyboard shortcut for permission prompts (y/n)
  useEffect(() => {
    if (!pendingPermission || activeTabId !== sessionId) return;

    const handler = (e: KeyboardEvent) => {
      // Don't intercept if input is focused or modifier keys are held
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
    (text: string) => {
      appendMessage(sessionId, {
        id: `user-${Date.now()}`,
        type: "user",
        content: text,
        timestamp: Date.now(),
        collapsed: false,
      });
      agentIpc.sendMessage(sessionId, text);
    },
    [sessionId, appendMessage],
  );

  const handleAbort = useCallback(() => {
    agentIpc.abort(sessionId);
  }, [sessionId]);

  if (!tab) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <ModeSelector
          value={tab.mode}
          onChange={(mode) => updateTabMode(sessionId, mode)}
        />
        <div className="flex-1" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => {
          // Skip tool_result messages — shown inside ToolCallCard
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

          if (msg.type === "status" && msg.state === "awaiting_approval") {
            return (
              <PermissionPrompt key={msg.id} message={msg} sessionId={sessionId} />
            );
          }

          if (msg.type === "user" || msg.type === "assistant") {
            return <ChatMessage key={msg.id} message={msg} />;
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

      <AgentStatusBar state={tab.state} model={tab.model} totalCost={tab.totalCost} />
      <ChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        agentState={tab.state}
        onModeChange={(mode) => updateTabMode(sessionId, mode)}
        onClear={() => clearMessages(sessionId)}
        onFocusChange={(focused) => { inputFocusedRef.current = focused; }}
      />
    </div>
  );
}
