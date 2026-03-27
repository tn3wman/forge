export type AgentChatMode = "Default" | "Plan" | "AcceptEdits" | "BypassPermissions" | "DontAsk" | "Auto";
export type AgentState = "idle" | "thinking" | "executing" | "awaiting_approval" | "completed" | "error";

export interface CreateAgentSessionRequest {
  cliName: string;
  mode: AgentChatMode;
  workingDirectory?: string;
  workspaceId: string;
  initialPrompt: string;
}

export interface AgentSessionInfo {
  id: string;
  cliName: string;
  displayName: string;
  mode: AgentChatMode;
  workingDirectory?: string;
  workspaceId: string;
  conversationId?: string;
  isAlive: boolean;
  createdAt: string;
}

export interface ContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export type AgentEvent =
  | { type: "system_init"; sessionId: string; model?: string; permissionMode?: string; tools?: string[] }
  | { type: "assistant_message"; messageId: string; content: ContentBlock[] }
  | { type: "assistant_message_delta"; messageId: string; contentDelta: string }
  | { type: "tool_use"; toolUseId: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; toolUseId: string; content: string; isError: boolean }
  | { type: "status"; state: AgentState; tool?: string; toolUseId?: string }
  | { type: "result"; resultText: string; durationMs: number; totalCostUsd: number; isError: boolean }
  | { type: "raw"; data: unknown };

export interface AgentEventPayload {
  sessionId: string;
  event: AgentEvent;
}

export interface AgentExitPayload {
  sessionId: string;
  exitCode?: number;
}
