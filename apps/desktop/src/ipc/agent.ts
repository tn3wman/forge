import { invoke } from "@tauri-apps/api/core";
import type { CreateAgentSessionRequest, AgentSessionInfo } from "@forge/shared";

export const agentIpc = {
  createSession: (request: CreateAgentSessionRequest) =>
    invoke<AgentSessionInfo>("agent_create_session", { request }),
  sendMessage: (sessionId: string, message: string) =>
    invoke<void>("agent_send_message", { sessionId, message }),
  respondPermission: (sessionId: string, toolUseId: string, allow: boolean) =>
    invoke<void>("agent_respond_permission", { sessionId, toolUseId, allow }),
  abort: (sessionId: string) =>
    invoke<void>("agent_abort", { sessionId }),
  kill: (sessionId: string) =>
    invoke<void>("agent_kill", { sessionId }),
  listSessions: (workspaceId?: string) =>
    invoke<AgentSessionInfo[]>("agent_list_sessions", { workspaceId }),
};
