import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AgentEventPayload, AgentExitPayload, AgentChatMode } from "@forge/shared";
import { useAgentStore } from "@/stores/agentStore";
import { agentIpc } from "@/ipc/agent";

declare global {
  var __forgeAgentBridgePromise: Promise<void> | undefined;
}

function hasPendingApproval(
  messages: ReturnType<typeof useAgentStore.getState>["messagesBySession"][string] | undefined,
  toolUseId?: string,
) {
  if (!messages || !toolUseId) return false;
  return messages.some(
    (message) =>
      message.type === "status" &&
      message.state === "awaiting_approval" &&
      message.toolUseId === toolUseId &&
      !message.resolved,
  );
}

const EDIT_TOOL_NAMES = ["Write", "Edit", "Bash", "NotebookEdit"];

function shouldAutoApprove(mode: AgentChatMode, toolName?: string): boolean {
  if (mode === "bypassPermissions" || mode === "dontAsk") return true;
  if (mode === "acceptEdits" && toolName && EDIT_TOOL_NAMES.includes(toolName)) return true;
  return false;
}

function handleAgentEvent(payload: AgentEventPayload) {
  const { sessionId, event } = payload;
  const store = useAgentStore.getState();
  const now = Date.now();

  switch (event.type) {
    case "system_init": {
      if (event.model) store.setModel(sessionId, event.model);
      if (event.sessionId) store.setConversationId(sessionId, event.sessionId);
      store.updateTabMeta(sessionId, {
        ...(event.sessionId ? { conversationId: event.sessionId } : {}),
        ...(event.model ? { model: event.model } : {}),
        ...(event.permissionMode ? { permissionMode: event.permissionMode } : {}),
      });
      // Sync the UI mode selector when the SDK reports a mode transition
      // (e.g., plan mode → default after ExitPlanMode approval)
      if (event.permissionMode) {
        const tab = store.tabs.find((t) => t.sessionId === sessionId);
        if (tab && tab.mode !== event.permissionMode) {
          store.updateTabMode(sessionId, event.permissionMode as AgentChatMode);
        }
      }
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "session_meta": {
      store.updateTabMeta(sessionId, {
        ...(event.provider ? { provider: event.provider } : {}),
        ...(event.conversationId ? { conversationId: event.conversationId } : {}),
        ...(event.agent ? { agent: event.agent } : {}),
        ...(event.effort ? { effort: event.effort } : {}),
        ...(event.claudePath ? { claudePath: event.claudePath } : {}),
        ...(event.slashCommands ? { slashCommands: event.slashCommands } : {}),
        ...(Array.isArray(event.slashCommands)
          ? { capabilitiesLoaded: true }
          : {}),
      });
      if (event.conversationId) {
        store.setConversationId(sessionId, event.conversationId);
      }
      break;
    }
    case "assistant_message_start": {
      store.startAssistantMessage(sessionId, event.messageId, event.turnId);
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "assistant_message_delta": {
      store.appendAssistantDelta(sessionId, event.messageId, event.contentDelta ?? "");
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "assistant_message_complete": {
      store.completeAssistantMessage(
        sessionId,
        event.messageId,
        event.content,
        event.turnId,
      );
      store.completeReasoning(sessionId, event.messageId, event.turnId);
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "thinking_start": {
      store.createPendingAssistant(sessionId, event.turnId);
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "reasoning_delta": {
      store.appendReasoningDelta(
        sessionId,
        event.contentDelta ?? "",
        event.messageId,
        event.turnId,
      );
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "reasoning_complete": {
      store.completeReasoning(sessionId, event.messageId, event.turnId);
      break;
    }
    case "tool_use_start": {
      store.startToolUse(
        sessionId,
        event.toolUseId,
        event.name,
        event.input,
        event.turnId,
      );
      store.updateTabState(sessionId, "executing");
      break;
    }
    case "tool_input_delta": {
      store.appendToolInputDelta(sessionId, event.toolUseId, event.inputDelta);
      store.updateTabState(sessionId, "executing");
      break;
    }
    case "tool_progress": {
      store.updateToolProgress(
        sessionId,
        event.toolUseId,
        event.name,
        event.status,
      );
      store.updateTabState(sessionId, "executing");
      break;
    }
    case "tool_result_delta": {
      store.appendToolResultDelta(
        sessionId,
        event.toolUseId,
        event.contentDelta,
        event.isError,
      );
      store.updateTabState(sessionId, "executing");
      break;
    }
    case "tool_result_complete": {
      store.completeToolResult(
        sessionId,
        event.toolUseId,
        event.content,
        event.isError,
      );
      store.updateTabState(sessionId, event.isError ? "error" : "thinking");
      break;
    }
    case "approval_requested": {
      const tab = store.tabs.find((t) => t.sessionId === sessionId);
      const currentMode = tab?.mode ?? "default";

      if (event.toolUseId && shouldAutoApprove(currentMode, event.toolName)) {
        void agentIpc.respondPermission(sessionId, event.toolUseId, true).catch((err) => {
          console.error("Failed to auto-approve:", err);
        });
        store.appendMessage(sessionId, {
          id: `auto-approved-${event.approvalId}-${now}`,
          type: "status",
          content: `Auto-approved ${event.toolName ?? "tool"} (${currentMode} mode)`,
          state: "awaiting_approval",
          approvalId: event.approvalId,
          toolUseId: event.toolUseId,
          toolName: event.toolName,
          toolInput: event.input,
          timestamp: now,
          collapsed: false,
          resolved: true,
        });
        store.updateTabState(sessionId, "executing");
        break;
      }

      store.appendMessage(sessionId, {
        id: `approval-${event.approvalId}-${now}`,
        type: "status",
        content: event.detail,
        detail: event.detail,
        state: "awaiting_approval",
        approvalId: event.approvalId,
        toolUseId: event.toolUseId,
        toolName: event.toolName,
        toolInput: event.input,
        timestamp: now,
        collapsed: false,
      });
      store.updateTabState(sessionId, "awaiting_approval");
      break;
    }
    case "approval_resolved": {
      store.resolveApproval(sessionId, event.approvalId, event.allow);
      store.updateTabState(sessionId, event.allow ? "executing" : "thinking");
      break;
    }
    case "status": {
      store.updateTabState(sessionId, event.state);
      if (event.state === "awaiting_approval") {
        const messages = store.messagesBySession[sessionId];
        if (!hasPendingApproval(messages, event.toolUseId)) {
          store.appendMessage(sessionId, {
            id: `status-${sessionId}-${event.toolUseId ?? now}-${now}`,
            type: "status",
            content: `Awaiting approval${event.tool ? ` for ${event.tool}` : ""}`,
            state: event.state,
            toolUseId: event.toolUseId,
            toolName: event.tool,
            turnId: event.turnId,
            messageId: event.messageId,
            timestamp: now,
            collapsed: false,
          });
        }
      }
      break;
    }
    case "result": {
      store.updateTabCost(sessionId, event.totalCostUsd ?? 0);
      if (event.isError) {
        store.markAssistantError(sessionId, event.resultText);
        store.updateTabState(sessionId, "error");
      } else {
        // Fallback: if streaming events were lost, populate the assistant
        // message with the final result text so the user sees *something*.
        if (event.resultText) {
          store.fillEmptyAssistant(sessionId, event.resultText);
        }
        store.completeReasoning(sessionId);
        store.updateTabState(sessionId, "completed");
      }
      break;
    }
    case "raw":
      break;
  }
}

function handleAgentExit(payload: AgentExitPayload) {
  const store = useAgentStore.getState();
  const tab = store.tabs.find((entry) => entry.sessionId === payload.sessionId);
  if (!tab) return;
  if (tab.state === "completed" || tab.state === "error") return;
  store.completeReasoning(payload.sessionId);
  store.updateTabState(payload.sessionId, "completed");
}

async function initAgentEventBridge() {
  if (!globalThis.__forgeAgentBridgePromise) {
    globalThis.__forgeAgentBridgePromise = Promise.all([
      listen<AgentEventPayload>("agent-event", (event) => {
        handleAgentEvent(event.payload);
      }),
      listen<AgentExitPayload>("agent-exit", (event) => {
        handleAgentExit(event.payload);
      }),
    ]).then(() => undefined);
  }

  return globalThis.__forgeAgentBridgePromise;
}

export function useAgentEventBridge() {
  useEffect(() => {
    void initAgentEventBridge();
  }, []);
}
