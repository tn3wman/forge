import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AgentEventPayload, AgentExitPayload, AgentChatMode } from "@forge/shared";
import { useAgentStore } from "@/stores/agentStore";
import { agentIpc } from "@/ipc/agent";
import { persistMessagesForSession, persistSingleMessage } from "@/lib/agentPersistence";

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

function shouldAutoApprove(mode: AgentChatMode): boolean {
  return mode === "fullAccess";
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
      // Sync plan mode state from SDK permission mode transitions
      if (event.permissionMode) {
        const tab = store.tabs.find((t) => t.sessionId === sessionId);
        if (tab) {
          if (event.permissionMode === "plan") {
            // SDK entered plan mode
            store.updateTabMeta(sessionId, { planMode: true });
          } else if (tab.planMode && event.permissionMode !== "plan") {
            // SDK exited plan mode (plan approved, now executing)
            // Keep planMode true in UI, permissionMode reflects execution phase
          }
          // Only sync UI mode selector for non-plan permission modes
          if (event.permissionMode !== "plan" && tab.mode !== event.permissionMode) {
            const mapped = event.permissionMode as AgentChatMode;
            if (mapped === "supervised" || mapped === "assisted" || mapped === "fullAccess") {
              store.updateTabMode(sessionId, mapped);
            }
          }
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
      // Persist session meta updates
      void agentIpc.updatePersistedSessionMeta(sessionId, {
        ...(event.provider ? { provider: event.provider } : {}),
        ...(event.conversationId ? { conversationId: event.conversationId } : {}),
        ...(event.agent ? { agent: event.agent } : {}),
        ...(event.effort ? { effort: event.effort } : {}),
      }).catch(() => {});
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
      // Persist completed assistant message for crash safety
      {
        const msgs = useAgentStore.getState().messagesBySession[sessionId];
        if (msgs) {
          let assistantMsg: typeof msgs[number] | undefined;
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].type === "assistant" && msgs[i].messageId === event.messageId) {
              assistantMsg = msgs[i];
              break;
            }
          }
          if (assistantMsg) {
            persistSingleMessage(sessionId, assistantMsg);
          }
        }
      }
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
      // Persist tool_use + tool_result pair
      {
        const msgs = useAgentStore.getState().messagesBySession[sessionId];
        if (msgs) {
          const toPersist: typeof msgs = [];
          for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (m.toolUseId === event.toolUseId && (m.type === "tool_use" || m.type === "tool_result")) {
              toPersist.push(m);
            }
          }
          if (toPersist.length > 0) {
            persistMessagesForSession(sessionId, toPersist);
          }
        }
      }
      break;
    }
    case "approval_requested": {
      const tab = store.tabs.find((t) => t.sessionId === sessionId);
      const currentMode = tab?.mode ?? "supervised";

      if (event.toolUseId && shouldAutoApprove(currentMode)) {
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
        store.finalizeAllPending(sessionId);
        store.updateTabState(sessionId, "error");
      } else {
        // Fallback: if streaming events were lost, populate the assistant
        // message with the final result text so the user sees *something*.
        if (event.resultText) {
          store.fillEmptyAssistant(sessionId, event.resultText);
        }
        store.completeReasoning(sessionId);
        store.finalizeAllPending(sessionId);

        // Check if this is a plan mode completion — show plan review UI
        const planTab = store.tabs.find((t) => t.sessionId === sessionId);
        if (planTab?.planMode) {
          const messages = store.messagesBySession[sessionId] ?? [];
          // Find the last Write tool that wrote to a plan file
          let planFilePath = "";
          let planContent = "";
          for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.type === "tool_use" && m.toolName?.toLowerCase() === "write" && m.toolInput) {
              const fp = m.toolInput.file_path as string | undefined;
              if (fp && (fp.includes("/plans/") || fp.includes(".claude/plans"))) {
                planFilePath = fp;
                planContent = (m.toolInput.content as string) ?? "";
                break;
              }
            }
          }
          if (planFilePath || event.resultText) {
            store.updateTabMeta(sessionId, {
              planReview: {
                filePath: planFilePath || "plan",
                content: planContent || event.resultText || "",
                underlyingMode: planTab.mode,
              },
            });
            store.updateTabState(sessionId, "awaiting_approval");
          } else {
            store.updateTabState(sessionId, "completed");
          }
        } else {
          store.updateTabState(sessionId, "completed");
        }
      }
      // Batch-persist all messages as safety net and update session cost
      {
        const allMsgs = useAgentStore.getState().messagesBySession[sessionId];
        if (allMsgs) {
          persistMessagesForSession(sessionId, allMsgs);
        }
        const tab = useAgentStore.getState().tabs.find((t) => t.sessionId === sessionId);
        void agentIpc.updatePersistedSessionMeta(sessionId, {
          totalCost: event.totalCostUsd ?? 0,
          conversationId: tab?.conversationId ?? undefined,
        }).catch(() => {});
      }
      break;
    }
    case "plan_delta": {
      // Map plan deltas to assistant message deltas so plan content is visible
      store.appendAssistantDelta(sessionId, event.itemId, event.contentDelta ?? "");
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "plan_updated": {
      // Format plan steps as an assistant message for display
      const steps = (event as any).steps as Array<{ step: string; status: string }> | undefined;
      if (steps?.length) {
        const formatted = steps
          .map((s) => {
            const icon = s.status === "completed" ? "✓" : s.status === "inProgress" ? "→" : "○";
            return `${icon} ${s.step}`;
          })
          .join("\n");
        store.fillEmptyAssistant(sessionId, formatted);
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
  store.finalizeAllPending(payload.sessionId);
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
