import { useEffect, useRef } from "react";
import { agentIpc } from "@/ipc/agent";
import { useAgentStore } from "@/stores/agentStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { fromPersisted, initSeqCounter } from "@/lib/agentPersistence";
import type { AgentChatMode, PersistedSession } from "@forge/shared";

function restoreSessionToStores(session: PersistedSession) {
  const terminalStore = useTerminalStore.getState();
  const agentStore = useAgentStore.getState();

  // Check if already restored (avoid duplicates)
  if (agentStore.tabs.some((t) => t.sessionId === session.id)) {
    return;
  }

  // Add to terminal store
  const tabId = `restored-${session.id}`;
  terminalStore.addTab({
    tabId,
    sessionId: session.id,
    workspaceId: session.workspaceId,
    label: session.displayName,
    cliName: session.cliName,
    mode: "Normal",
    type: "chat",
    status: "active",
    workingDirectory: session.workingDirectory ?? undefined,
  });

  // Add to agent store as completed (dead) session
  agentStore.addTab({
    sessionId: session.id,
    label: session.displayName,
    cliName: session.cliName,
    mode: (session.mode as AgentChatMode) ?? "supervised",
    state: "completed",
    conversationId: session.conversationId ?? null,
    provider: session.provider as any,
    model: session.model,
    permissionMode: session.permissionMode,
    agent: session.agent,
    effort: session.effort as any,
    claudePath: session.claudePath,
    workingDirectory: session.workingDirectory ?? undefined,
    planMode: session.planMode,
    totalCost: session.totalCost,
  });
}

async function loadMessagesForSession(sessionId: string) {
  const agentStore = useAgentStore.getState();
  // Skip if messages already loaded
  if ((agentStore.messagesBySession[sessionId]?.length ?? 0) > 0) {
    return;
  }

  try {
    const persisted = await agentIpc.loadMessages(sessionId, 0, 5000);
    if (persisted.length === 0) return;

    // Init seq counter from max seq
    const maxSeq = Math.max(...persisted.map((m) => m.seq));
    initSeqCounter(sessionId, maxSeq);

    // Convert and set messages
    const messages = persisted.map(fromPersisted);
    const store = useAgentStore.getState();
    // Set messages directly — we need to build up the messagesBySession
    for (const msg of messages) {
      store.appendMessage(sessionId, msg);
    }
  } catch (err) {
    console.error("Failed to load messages for session:", sessionId, err);
  }
}

export function useRestoreAgentSessions(workspaceId: string | null) {
  const restoredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!workspaceId) return;
    if (restoredRef.current.has(workspaceId)) return;

    restoredRef.current.add(workspaceId);

    void (async () => {
      try {
        const sessions = await agentIpc.loadPersistedSessions(workspaceId);
        for (const session of sessions) {
          restoreSessionToStores(session);
          // Load messages eagerly for each restored session
          void loadMessagesForSession(session.id);
        }
      } catch (err) {
        console.error("Failed to restore agent sessions:", err);
      }
    })();
  }, [workspaceId]);
}
