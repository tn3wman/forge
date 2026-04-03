export interface CliInfo {
  name: string;
  displayName: string;
  path: string;
  version: string | null;
}

export type AgentMode = "Normal" | "Plan" | "DangerouslyBypassPermissions";

export interface CreateSessionRequest {
  cliName: string;
  mode: AgentMode;
  workingDirectory?: string;
  workspaceId: string;
  permissionMode?: "supervised" | "assisted" | "fullAccess";
  planMode?: boolean;
  model?: string;
  effort?: "low" | "medium" | "high";
  initialCols?: number;
  initialRows?: number;
}

export interface SessionInfo {
  id: string;
  cliName: string;
  displayName: string;
  mode: AgentMode;
  workingDirectory: string | null;
  workspaceId: string;
  isAlive: boolean;
  createdAt: string;
}
