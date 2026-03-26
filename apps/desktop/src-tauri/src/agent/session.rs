use super::backend::{backend_for_cli, AgentBackend, BackendKind};
use super::claude_backend::ClaudeBackend;
use crate::models::agent::AgentMode;
use tauri::AppHandle;

pub struct AgentSession {
    backend: Box<dyn AgentBackend>,
}

impl AgentSession {
    pub fn spawn(
        session_id: String,
        cli_name: &str,
        mode: &AgentMode,
        working_directory: Option<&str>,
        initial_prompt: &str,
        app_handle: AppHandle,
    ) -> Result<Self, String> {
        let kind = backend_for_cli(cli_name);

        let backend: Box<dyn AgentBackend> = match kind {
            BackendKind::StreamJson => Box::new(ClaudeBackend::spawn(
                session_id,
                mode,
                working_directory,
                initial_prompt,
                app_handle,
            )?),
            BackendKind::PtyFallback => {
                return Err(format!(
                    "PtyFallback backend is not yet implemented for CLI '{}'",
                    cli_name
                ));
            }
        };

        Ok(Self { backend })
    }

    pub fn send_message(&mut self, message: &str) -> Result<(), String> {
        self.backend.send_message(message)
    }

    pub fn respond_permission(&mut self, tool_use_id: &str, allow: bool) -> Result<(), String> {
        self.backend.respond_permission(tool_use_id, allow)
    }

    pub fn abort(&mut self) -> Result<(), String> {
        self.backend.abort()
    }

    pub fn kill(&mut self) {
        self.backend.kill();
    }

    pub fn is_alive(&mut self) -> bool {
        self.backend.is_alive()
    }

    pub fn conversation_id(&self) -> Option<String> {
        self.backend.conversation_id()
    }
}

impl Drop for AgentSession {
    fn drop(&mut self) {
        self.kill();
    }
}
