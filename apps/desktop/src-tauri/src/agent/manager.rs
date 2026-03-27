use crate::models::agent::{AgentMode, AgentSessionInfo, CreateAgentSessionRequest};
use crate::util::time_from_epoch_secs;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::AppHandle;

use super::session::AgentSession;

struct AgentEntry {
    session: AgentSession,
    info: AgentMeta,
}

struct AgentMeta {
    cli_name: String,
    display_name: String,
    provider: Option<String>,
    mode: AgentMode,
    working_directory: Option<String>,
    workspace_id: String,
    created_at: String,
    model: Option<String>,
    permission_mode: Option<String>,
    agent: Option<String>,
    effort: Option<String>,
    claude_path: Option<String>,
}

pub struct AgentSessionManager {
    sessions: Mutex<HashMap<String, AgentEntry>>,
}

impl AgentSessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn create_session(
        &self,
        request: CreateAgentSessionRequest,
        app_handle: AppHandle,
    ) -> Result<AgentSessionInfo, String> {
        let id = uuid::Uuid::now_v7().to_string();

        let display_name = match request.cli_name.as_str() {
            "claude" => "Claude Code",
            "codex" => "Codex CLI",
            "aider" => "Aider",
            other => other,
        }
        .to_string();

        let session = AgentSession::spawn(
            id.clone(),
            &request.cli_name,
            &request.mode,
            request.working_directory.as_deref(),
            &request.initial_prompt,
            request.claude.as_ref(),
            app_handle,
        )?;

        let created_at = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| {
                let secs = d.as_secs();
                time_from_epoch_secs(secs)
            })
            .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string());

        let info = AgentSessionInfo {
            id: id.clone(),
            cli_name: request.cli_name.clone(),
            provider: Some(request
                .claude
                .as_ref()
                .and_then(|claude| claude.provider.clone())
                .unwrap_or_else(|| request.cli_name.clone())),
            display_name: display_name.clone(),
            mode: request.mode.clone(),
            working_directory: request.working_directory.clone(),
            workspace_id: request.workspace_id.clone(),
            conversation_id: None,
            is_alive: true,
            created_at: created_at.clone(),
            model: request.claude.as_ref().and_then(|claude| claude.model.clone()),
            permission_mode: request
                .claude
                .as_ref()
                .and_then(|claude| claude.permission_mode.clone()),
            agent: request.claude.as_ref().and_then(|claude| claude.agent.clone()),
            effort: request.claude.as_ref().and_then(|claude| claude.effort.clone()),
            claude_path: request
                .claude
                .as_ref()
                .and_then(|claude| claude.claude_path.clone()),
            capabilities_loaded: Some(false),
        };

        let entry = AgentEntry {
            session,
            info: AgentMeta {
                cli_name: request.cli_name,
                display_name,
                provider: request
                    .claude
                    .as_ref()
                    .and_then(|claude| claude.provider.clone())
                    .or_else(|| Some("unknown".to_string())),
                mode: request.mode,
                working_directory: request.working_directory,
                workspace_id: request.workspace_id,
                created_at,
                model: request.claude.as_ref().and_then(|claude| claude.model.clone()),
                permission_mode: request
                    .claude
                    .as_ref()
                    .and_then(|claude| claude.permission_mode.clone()),
                agent: request.claude.as_ref().and_then(|claude| claude.agent.clone()),
                effort: request.claude.as_ref().and_then(|claude| claude.effort.clone()),
                claude_path: request
                    .claude
                    .as_ref()
                    .and_then(|claude| claude.claude_path.clone()),
            },
        };

        self.sessions.lock().unwrap().insert(id, entry);

        Ok(info)
    }

    pub fn send_message(&self, session_id: &str, message: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Agent session '{}' not found", session_id))?;
        entry.session.send_message(message)
    }

    pub fn respond_permission(
        &self,
        session_id: &str,
        tool_use_id: &str,
        allow: bool,
    ) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Agent session '{}' not found", session_id))?;
        entry.session.respond_permission(tool_use_id, allow)
    }

    pub fn abort_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Agent session '{}' not found", session_id))?;
        entry.session.abort()
    }

    pub fn kill_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Agent session '{}' not found", session_id))?;
        entry.session.kill();
        Ok(())
    }

    pub fn list_sessions(&self, workspace_id: Option<&str>) -> Vec<AgentSessionInfo> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions
            .iter_mut()
            .filter(|(_, entry)| {
                workspace_id
                    .map(|wid| entry.info.workspace_id == wid)
                    .unwrap_or(true)
            })
            .map(|(id, entry)| AgentSessionInfo {
                id: id.clone(),
                cli_name: entry.info.cli_name.clone(),
                provider: entry.info.provider.clone(),
                display_name: entry.info.display_name.clone(),
                mode: entry.info.mode.clone(),
                working_directory: entry.info.working_directory.clone(),
                workspace_id: entry.info.workspace_id.clone(),
                conversation_id: entry.session.conversation_id(),
                is_alive: entry.session.is_alive(),
                created_at: entry.info.created_at.clone(),
                model: entry.info.model.clone(),
                permission_mode: entry.info.permission_mode.clone(),
                agent: entry.info.agent.clone(),
                effort: entry.info.effort.clone(),
                claude_path: entry.info.claude_path.clone(),
                capabilities_loaded: Some(entry.info.cli_name == "claude"),
            })
            .collect()
    }

    pub fn kill_all(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        for (_, entry) in sessions.iter_mut() {
            entry.session.kill();
        }
        sessions.clear();
    }
}

impl Drop for AgentSessionManager {
    fn drop(&mut self) {
        self.kill_all();
    }
}
