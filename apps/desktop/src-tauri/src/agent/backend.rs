use crate::models::agent::ImageAttachment;

/// Abstraction over different CLI agent communication protocols.
///
/// Claude Code speaks `--output-format stream-json`, Codex uses JSON-RPC,
/// and unknown CLIs fall back to raw PTY I/O.  Implementations live in
/// sibling modules (added in later tasks).
pub trait AgentBackend: Send {
    /// Send a user message to the running agent, optionally with image attachments.
    fn send_message(&mut self, message: &str, images: Option<&[ImageAttachment]>) -> Result<(), String>;

    /// Respond to a permission/tool-use request from the agent.
    fn respond_permission(&mut self, tool_use_id: &str, allow: bool) -> Result<(), String>;

    /// Request a graceful abort of the current operation.
    fn abort(&mut self) -> Result<(), String>;

    /// Forcefully kill the agent process.
    fn kill(&mut self);

    /// Check whether the underlying process is still running.
    fn is_alive(&mut self) -> bool;

    /// Return the current conversation/session id, if one has been established.
    fn conversation_id(&self) -> Option<String>;
}

/// The communication protocol a CLI agent supports.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackendKind {
    /// Claude Code: structured streaming JSON via `--output-format stream-json`.
    ClaudeStreamJson,
    /// OpenAI Codex: JSONL output via `codex exec --json`.
    CodexJson,
    /// Raw PTY fallback for CLIs without a machine-readable protocol.
    PtyFallback,
}

/// Determine which [`BackendKind`] to use for a given CLI name.
pub fn backend_for_cli(cli_name: &str) -> BackendKind {
    match cli_name {
        "claude" => BackendKind::ClaudeStreamJson,
        "codex" => BackendKind::CodexJson,
        _ => BackendKind::PtyFallback,
    }
}
