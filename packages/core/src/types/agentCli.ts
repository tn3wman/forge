import type { AgentRole } from './agent';

export type CliType = 'claude_code' | 'codex';

export type AgentStatus = 'running' | 'completed' | 'failed' | 'killed';

export interface AgentInfo {
  id: string;
  bayId: string;
  laneId: string;
  cliType: CliType;
  status: AgentStatus;
}

export interface SpawnAgentConfig {
  bayId: string;
  laneId: string;
  cliType: CliType;
  prompt: string;
  cwd: string;
  model?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  sessionId?: string;
}

// Normalized agent stream event — parsed from CLI-specific JSON output
export type AgentStreamEvent =
  | { type: 'assistant'; message: AssistantMessage }
  | { type: 'tool_use'; name: string; id: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; output: string; isError: boolean }
  | { type: 'result'; text: string; cost?: number; duration?: number }
  | { type: 'error'; error: string };

export interface AssistantMessage {
  text: string;
  model?: string;
}

export interface DetectedCli {
  cliType: CliType;
  path: string;
  version?: string;
}

// Agent CLI configuration (stored in DB)
export interface AgentCliConfig {
  id: string;
  cliType: CliType;
  displayName: string;
  executablePath: string;
  defaultModel?: string;
  defaultAllowedTools?: string; // JSON array string from DB
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Per-role CLI mapping
export interface RoleCliMapping {
  id: string;
  role: AgentRole;
  cliConfigId: string;
  modelOverride?: string;
  systemPromptOverride?: string;
  allowedToolsOverride?: string; // JSON array string from DB
  createdAt: string;
  updatedAt: string;
}

// Tauri event payloads
export interface AgentDataEvent {
  agentId: string;
  data: string;
}

export interface AgentErrorEvent {
  agentId: string;
  error: string;
}

export interface AgentExitEvent {
  agentId: string;
  exitCode: number | null;
  status: AgentStatus;
}
