import { invoke } from "@tauri-apps/api/core";
import type {
  CreateAgentSessionRequest,
  AgentSessionInfo,
  AgentChatMode,
  SlashCommandInfo,
  ImageAttachment,
  PersistedSession,
  PersistedMessage,
} from "@forge/shared";

export const agentIpc = {
  createSession: (request: CreateAgentSessionRequest) =>
    invoke<AgentSessionInfo>("agent_create_session", { request }),
  sendMessage: (sessionId: string, message: string, images?: ImageAttachment[]) =>
    invoke<void>("agent_send_message", { sessionId, message, images: images?.length ? images : null }),
  respondPermission: (sessionId: string, toolUseId: string, allow: boolean, resultText?: string) =>
    invoke<void>("agent_respond_permission", { sessionId, toolUseId, allow, resultText: resultText ?? null }),
  updatePermissionMode: (sessionId: string, mode: AgentChatMode) =>
    invoke<void>("agent_update_permission_mode", { sessionId, mode }),
  abort: (sessionId: string) =>
    invoke<void>("agent_abort", { sessionId }),
  kill: (sessionId: string) =>
    invoke<void>("agent_kill", { sessionId }),
  listSessions: (workspaceId?: string) =>
    invoke<AgentSessionInfo[]>("agent_list_sessions", { workspaceId }),
  discoverSlashCommands: (cliName: string) =>
    invoke<SlashCommandInfo[]>("agent_discover_slash_commands", { cliName }),

  // Persistence
  loadPersistedSessions: (workspaceId: string) =>
    invoke<PersistedSession[]>("agent_load_persisted_sessions", { workspaceId }),
  loadMessages: (sessionId: string, offset: number, limit: number) =>
    invoke<PersistedMessage[]>("agent_load_messages", { sessionId, offset, limit }),
  persistSession: (session: PersistedSession) =>
    invoke<void>("agent_persist_session", { session }),
  persistMessages: (messages: PersistedMessage[]) =>
    invoke<void>("agent_persist_messages", { messages }),
  updatePersistedSessionMeta: (
    sessionId: string,
    meta: {
      conversationId?: string;
      totalCost?: number;
      model?: string;
      provider?: string;
      permissionMode?: string;
      agent?: string;
      effort?: string;
      label?: string;
    },
  ) =>
    invoke<void>("agent_update_persisted_session_meta", { sessionId, ...meta }),
  deletePersistedSession: (sessionId: string) =>
    invoke<void>("agent_delete_persisted_session", { sessionId }),
};
