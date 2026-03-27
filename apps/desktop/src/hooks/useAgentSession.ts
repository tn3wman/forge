import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AgentEventPayload, AgentExitPayload } from "@forge/shared";
import { useAgentStore } from "@/stores/agentStore";

let idCounter = 0;
function nextId() {
  return `msg-${Date.now()}-${idCounter++}`;
}

export function useAgentSession(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const unlisteners: Array<Promise<() => void>> = [];

    unlisteners.push(
      listen<AgentEventPayload>("agent-event", (ev) => {
        if (ev.payload.sessionId !== sessionId) return;
        const { event } = ev.payload;
        const store = useAgentStore.getState();
        const now = Date.now();

        switch (event.type) {
          case "system_init": {
            if (event.model) store.setModel(sessionId, event.model);
            store.updateTabState(sessionId, "thinking");
            store.appendMessage(sessionId, {
              id: nextId(),
              type: "system",
              content: `Session initialized${event.model ? ` (model: ${event.model})` : ""}${event.permissionMode ? ` [${event.permissionMode}]` : ""}`,
              timestamp: now,
              collapsed: false,
            });
            break;
          }
          case "assistant_message": {
            for (const block of event.content) {
              if (block.type === "text" && block.text) {
                store.appendMessage(sessionId, {
                  id: nextId(),
                  type: "assistant",
                  content: block.text,
                  timestamp: now,
                  collapsed: false,
                });
              } else if (block.type === "tool_use") {
                store.appendMessage(sessionId, {
                  id: nextId(),
                  type: "tool_use",
                  content: "",
                  toolName: block.name,
                  toolUseId: block.id,
                  toolInput: block.input,
                  timestamp: now,
                  collapsed: false,
                });
              }
            }
            store.updateTabState(sessionId, "thinking");
            break;
          }
          case "assistant_message_delta": {
            store.updateLastAssistantMessage(sessionId, event.contentDelta);
            break;
          }
          case "tool_use": {
            store.appendMessage(sessionId, {
              id: nextId(),
              type: "tool_use",
              content: "",
              toolName: event.name,
              toolUseId: event.toolUseId,
              toolInput: event.input,
              timestamp: now,
              collapsed: false,
            });
            store.updateTabState(sessionId, "executing");
            break;
          }
          case "tool_result": {
            store.appendMessage(sessionId, {
              id: nextId(),
              type: "tool_result",
              content: event.content,
              toolUseId: event.toolUseId,
              isError: event.isError,
              timestamp: now,
              collapsed: false,
            });
            store.updateTabState(sessionId, "thinking");
            break;
          }
          case "status": {
            store.updateTabState(sessionId, event.state);
            if (event.state === "awaiting_approval") {
              store.appendMessage(sessionId, {
                id: nextId(),
                type: "status",
                content: `Awaiting approval${event.tool ? ` for ${event.tool}` : ""}`,
                state: event.state,
                toolUseId: event.toolUseId,
                timestamp: now,
                collapsed: false,
              });
            }
            break;
          }
          case "result": {
            store.updateTabState(sessionId, event.isError ? "error" : "completed");
            store.updateTabCost(sessionId, event.totalCostUsd);
            store.appendMessage(sessionId, {
              id: nextId(),
              type: event.isError ? "error" : "assistant",
              content: event.resultText,
              timestamp: now,
              collapsed: false,
            });
            break;
          }
          case "raw":
            // Ignore raw events
            break;
        }
      }),
    );

    unlisteners.push(
      listen<AgentExitPayload>("agent-exit", (ev) => {
        if (ev.payload.sessionId !== sessionId) return;
        useAgentStore.getState().updateTabState(sessionId, "completed");
      }),
    );

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [sessionId]);
}
