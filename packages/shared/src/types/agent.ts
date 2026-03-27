export type AgentChatMode = "supervised" | "assisted" | "fullAccess";
export type AgentState = "idle" | "thinking" | "executing" | "awaiting_approval" | "completed" | "error";
export type AgentStreamState = "pending" | "streaming" | "completed" | "error";
export type AgentProvider = "claude" | "codex" | "aider" | "unknown";
export type ClaudePermissionMode = AgentChatMode;
export type ClaudeEffort = "low" | "medium" | "high";

export interface ClaudeLaunchOptions {
  provider?: "claude";
  model?: string;
  permissionMode?: ClaudePermissionMode;
  effort?: ClaudeEffort;
  agent?: string;
  claudePath?: string;
}

export interface CreateAgentSessionRequest {
  cliName: string;
  mode: AgentChatMode;
  workingDirectory?: string;
  workspaceId: string;
  initialPrompt: string;
  claude?: ClaudeLaunchOptions;
}

export interface AgentSessionInfo {
  id: string;
  cliName: string;
  provider?: AgentProvider;
  displayName: string;
  mode: AgentChatMode;
  workingDirectory?: string;
  workspaceId: string;
  conversationId?: string;
  isAlive: boolean;
  createdAt: string;
  model?: string;
  permissionMode?: string;
  agent?: string;
  effort?: ClaudeEffort;
  claudePath?: string;
  capabilitiesLoaded?: boolean;
}

export type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export interface ImageAttachment {
  /** base64-encoded image data (no data-uri prefix) */
  data: string;
  /** MIME type */
  mediaType: ImageMediaType;
  /** Optional display filename */
  fileName?: string;
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
  | {
      type: "session_meta";
      provider?: AgentProvider;
      conversationId?: string;
      agent?: string | null;
      effort?: ClaudeEffort | null;
      claudePath?: string | null;
      slashCommands?: SlashCommandInfo[];
    }
  | { type: "assistant_message_start"; messageId: string; turnId?: string }
  | { type: "assistant_message_delta"; messageId: string; contentDelta: string }
  | { type: "assistant_message_complete"; messageId: string; turnId?: string; content?: string }
  | { type: "thinking_start"; messageId: string; turnId?: string }
  | { type: "reasoning_delta"; contentDelta: string; messageId?: string; turnId?: string }
  | { type: "reasoning_complete"; messageId?: string; turnId?: string }
  | { type: "tool_use_start"; toolUseId: string; name: string; input: Record<string, unknown>; turnId?: string }
  | { type: "tool_input_delta"; toolUseId: string; inputDelta: string }
  | { type: "tool_progress"; toolUseId?: string; name?: string; status: string }
  | { type: "tool_result_delta"; toolUseId: string; contentDelta: string; isError?: boolean }
  | { type: "tool_result_complete"; toolUseId: string; content?: string; isError: boolean }
  | {
      type: "approval_requested";
      approvalId: string;
      toolUseId?: string;
      toolName: string;
      input?: Record<string, unknown>;
      detail: string;
    }
  | { type: "approval_resolved"; approvalId: string; allow: boolean }
  | { type: "status"; state: AgentState; tool?: string; toolUseId?: string; messageId?: string; turnId?: string }
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

export type SlashCommandCategory = "local" | "builtin" | "plugin" | "skill";

export interface SlashCommandInfo {
  /** Command name without leading "/" (e.g. "commit") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Where the command comes from */
  category: SlashCommandCategory;
  /** Plugin name if category is "plugin" or "skill" */
  source?: string;
}
