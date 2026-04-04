use crate::models::terminal::{AgentMode, CreateSessionRequest, SessionInfo};
use crate::terminal::session::PtySession;
use crate::util::time_from_epoch_secs;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::AppHandle;

struct SessionEntry {
    session: PtySession,
    info: SessionMeta,
}

struct SessionMeta {
    cli_name: String,
    display_name: String,
    mode: AgentMode,
    working_directory: Option<String>,
    workspace_id: String,
    created_at: String,
}

pub struct SessionManager {
    sessions: Mutex<HashMap<String, SessionEntry>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    const ALLOWED_CLIS: &[&str] = &["claude", "codex", "aider", "shell"];

    pub fn create_session(
        &self,
        request: CreateSessionRequest,
    ) -> Result<SessionInfo, String> {
        if !Self::ALLOWED_CLIS.contains(&request.cli_name.as_str()) {
            return Err(format!("CLI '{}' is not permitted", request.cli_name));
        }

        let id = uuid::Uuid::now_v7().to_string();

        let display_name = match request.cli_name.as_str() {
            "claude" => "Claude Code",
            "codex" => "Codex CLI",
            "aider" => "Aider",
            "shell" => "Terminal",
            other => other,
        }
        .to_string();

        let session = PtySession::spawn(
            id.clone(),
            &request.cli_name,
            &request.mode,
            request.working_directory.as_deref(),
            request.permission_mode.as_deref(),
            request.plan_mode.unwrap_or(false),
            request.model.as_deref(),
            request.effort.as_deref(),
            request.initial_cols,
            request.initial_rows,
        )?;

        let created_at = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| {
                // ISO 8601 timestamp
                let secs = d.as_secs();
                let naive_dt = time_from_epoch_secs(secs);
                naive_dt
            })
            .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string());

        let info = SessionInfo {
            id: id.clone(),
            cli_name: request.cli_name.clone(),
            display_name: display_name.clone(),
            mode: request.mode.clone(),
            working_directory: request.working_directory.clone(),
            workspace_id: request.workspace_id.clone(),
            is_alive: true,
            created_at: created_at.clone(),
        };

        let entry = SessionEntry {
            session,
            info: SessionMeta {
                cli_name: request.cli_name,
                display_name,
                mode: request.mode,
                working_directory: request.working_directory,
                workspace_id: request.workspace_id,
                created_at,
            },
        };

        self.sessions.lock().unwrap().insert(id, entry);

        Ok(info)
    }

    pub fn attach_session(&self, session_id: &str, app_handle: AppHandle) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Session '{}' not found", session_id))?;
        entry.session.start_reading(app_handle);
        Ok(())
    }

    pub fn list_sessions(&self, workspace_id: Option<&str>) -> Vec<SessionInfo> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions
            .iter_mut()
            .filter(|(_, entry)| {
                workspace_id
                    .map(|wid| entry.info.workspace_id == wid)
                    .unwrap_or(true)
            })
            .map(|(id, entry)| SessionInfo {
                id: id.clone(),
                cli_name: entry.info.cli_name.clone(),
                display_name: entry.info.display_name.clone(),
                mode: entry.info.mode.clone(),
                working_directory: entry.info.working_directory.clone(),
                workspace_id: entry.info.workspace_id.clone(),
                is_alive: entry.session.is_alive(),
                created_at: entry.info.created_at.clone(),
            })
            .collect()
    }

    pub fn write_to_session(&self, session_id: &str, data: &[u8]) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Session '{}' not found", session_id))?;
        entry.session.write(data)
    }

    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get(session_id)
            .ok_or_else(|| format!("Session '{}' not found", session_id))?;
        entry.session.resize(cols, rows)
    }

    pub fn kill_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let entry = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Session '{}' not found", session_id))?;
        entry.session.kill();
        Ok(())
    }

    pub fn kill_all(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        for (_, entry) in sessions.iter_mut() {
            entry.session.kill();
        }
        sessions.clear();
    }
}

impl Drop for SessionManager {
    fn drop(&mut self) {
        self.kill_all();
    }
}

