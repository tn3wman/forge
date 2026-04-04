import { invoke } from "@tauri-apps/api/core";
import type { CliInfo, SessionInfo, CreateSessionRequest } from "@forge/shared";

export const terminalIpc = {
  discoverClis: () => invoke<CliInfo[]>("terminal_discover_clis"),
  createSession: (request: CreateSessionRequest) =>
    invoke<SessionInfo>("terminal_create_session", { request }),
  attach: (sessionId: string) =>
    invoke<void>("terminal_attach", { sessionId }),
  listSessions: () => invoke<SessionInfo[]>("terminal_list_sessions"),
  write: (sessionId: string, data: number[]) =>
    invoke<void>("terminal_write", { sessionId, data: Array.from(data) }),
  resize: (sessionId: string, cols: number, rows: number) =>
    invoke<void>("terminal_resize", { sessionId, cols, rows }),
  kill: (sessionId: string) => invoke<void>("terminal_kill", { sessionId }),
};
