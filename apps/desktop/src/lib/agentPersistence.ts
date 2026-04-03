import { agentIpc } from "@/ipc/agent";
import type { AgentMessage } from "@/stores/agentStore";
import type { PersistedMessage, PersistedSession } from "@forge/shared";

// Track sequence numbers per session (module-level, not in store)
const seqCounters = new Map<string, number>();

export function getNextSeq(sessionId: string): number {
  const current = seqCounters.get(sessionId) ?? 0;
  const next = current + 1;
  seqCounters.set(sessionId, next);
  return next;
}

export function initSeqCounter(sessionId: string, maxSeq: number) {
  seqCounters.set(sessionId, maxSeq);
}

export function clearSeqCounter(sessionId: string) {
  seqCounters.delete(sessionId);
}

export function toPersisted(msg: AgentMessage, sessionId: string, seq: number): PersistedMessage {
  return {
    id: msg.id,
    sessionId,
    seq,
    type: msg.type,
    content: msg.content ?? "",
    reasoning: msg.reasoning || undefined,
    messageId: msg.messageId,
    turnId: msg.turnId,
    toolUseId: msg.toolUseId,
    toolName: msg.toolName,
    toolInput: msg.toolInputText ?? (msg.toolInput ? JSON.stringify(msg.toolInput) : undefined),
    toolStatus: msg.toolStatus,
    detail: msg.detail,
    approvalId: msg.approvalId,
    resolved: msg.resolved,
    isError: msg.isError,
    state: msg.state,
    streamState: msg.streamState ?? "completed",
    reasoningState: msg.reasoningState,
    images: msg.images ? JSON.stringify(msg.images) : undefined,
    timestamp: msg.timestamp,
  };
}

export function fromPersisted(msg: PersistedMessage): AgentMessage {
  let toolInput: Record<string, unknown> | undefined;
  if (msg.toolInput) {
    try {
      const parsed = JSON.parse(msg.toolInput);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        toolInput = parsed;
      }
    } catch {
      // Not valid JSON, skip
    }
  }

  let images: AgentMessage["images"];
  if (msg.images) {
    try {
      images = JSON.parse(msg.images);
    } catch {
      // Not valid JSON, skip
    }
  }

  const isToolType = msg.type === "tool_use" || msg.type === "tool_result";

  return {
    id: msg.id,
    type: msg.type as AgentMessage["type"],
    content: msg.content,
    timestamp: msg.timestamp,
    collapsed: isToolType, // Collapse tool calls on restore
    messageId: msg.messageId,
    turnId: msg.turnId,
    streamState: "completed", // All restored messages are completed
    reasoning: msg.reasoning,
    reasoningState: msg.reasoning ? "completed" : undefined,
    reasoningCollapsed: true, // Collapse reasoning on restore
    toolName: msg.toolName,
    toolInput,
    toolInputText: msg.toolInput,
    toolUseId: msg.toolUseId,
    toolStatus: msg.toolStatus,
    detail: msg.detail,
    approvalId: msg.approvalId,
    resolved: msg.resolved,
    isError: msg.isError,
    state: msg.state as AgentMessage["state"],
    images,
  };
}

export function persistMessagesForSession(sessionId: string, messages: AgentMessage[]) {
  const persisted: PersistedMessage[] = [];
  for (const msg of messages) {
    // Only persist terminal-state messages
    if (msg.streamState === "pending" || msg.streamState === "streaming") continue;
    const seq = getNextSeq(sessionId);
    persisted.push(toPersisted(msg, sessionId, seq));
  }
  if (persisted.length > 0) {
    void agentIpc.persistMessages(persisted).catch((err) => {
      console.error("Failed to persist messages:", err);
    });
  }
}

export function persistSingleMessage(sessionId: string, msg: AgentMessage) {
  const seq = getNextSeq(sessionId);
  const persisted = toPersisted(msg, sessionId, seq);
  void agentIpc.persistMessages([persisted]).catch((err) => {
    console.error("Failed to persist message:", err);
  });
}

export function sessionInfoToPersistedSession(
  sessionId: string,
  workspaceId: string,
  cliName: string,
  displayName: string,
  mode: string,
  opts: {
    provider?: string;
    model?: string;
    permissionMode?: string;
    agent?: string;
    effort?: string;
    claudePath?: string;
    planMode?: boolean;
    workingDirectory?: string;
    conversationId?: string;
    createdAt?: string;
    tabLabel?: string;
  },
): PersistedSession {
  const now = new Date().toISOString();
  return {
    id: sessionId,
    workspaceId,
    cliName,
    displayName,
    mode,
    provider: opts.provider,
    model: opts.model,
    permissionMode: opts.permissionMode,
    agent: opts.agent,
    effort: opts.effort,
    claudePath: opts.claudePath,
    planMode: opts.planMode,
    workingDirectory: opts.workingDirectory,
    conversationId: opts.conversationId,
    totalCost: 0,
    label: opts.tabLabel ?? displayName,
    createdAt: opts.createdAt ?? now,
    updatedAt: now,
  };
}
