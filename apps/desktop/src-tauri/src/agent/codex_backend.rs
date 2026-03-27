use crate::models::agent::{AgentEvent, AgentEventPayload, AgentExitPayload, AgentMode};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

use super::backend::AgentBackend;

/// Backend for the OpenAI Codex CLI using the `app-server` JSON-RPC protocol.
///
/// Spawns `codex app-server` which communicates via line-delimited JSON-RPC over
/// stdin/stdout. The protocol lifecycle is:
///   1. Client sends `initialize` request
///   2. Server responds with capabilities
///   3. Client sends `initialized` notification
///   4. Client sends `thread/start` request → server notifies `thread/started`
///   5. Client sends `turn/start` with user input → server streams notifications
///   6. Server may send `item/commandExecution/requestApproval` requests
///   7. Client responds with `accept`/`decline` decisions
///   8. For follow-up messages, client sends another `turn/start`
pub struct CodexBackend {
    child: Child,
    stdin: Option<ChildStdin>,
    killed: Arc<AtomicBool>,
    thread_id: Arc<Mutex<Option<String>>>,
    turn_id: Arc<Mutex<Option<String>>>,
    request_counter: Arc<AtomicU64>,
    /// Maps JSON-RPC server request IDs to their method + itemId for approval routing
    pending_approvals: Arc<Mutex<std::collections::HashMap<String, PendingApproval>>>,
}

#[derive(Clone)]
struct PendingApproval {
    jsonrpc_id: serde_json::Value,
    method: String,
}

impl CodexBackend {
    pub fn spawn(
        session_id: String,
        mode: &AgentMode,
        working_directory: Option<&str>,
        initial_prompt: &str,
        app_handle: AppHandle,
    ) -> Result<Self, String> {
        let cli_path =
            which::which("codex").map_err(|e| format!("CLI 'codex' not found: {e}"))?;

        let mut cmd = Command::new(&cli_path);
        cmd.arg("app-server")
            .arg("--listen")
            .arg("stdio://")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(dir) = working_directory {
            cmd.current_dir(dir);
        }

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn codex app-server: {e}"))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture stderr".to_string())?;
        let mut stdin = child.stdin.take();

        let killed = Arc::new(AtomicBool::new(false));
        let thread_id: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
        let turn_id: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
        let request_counter = Arc::new(AtomicU64::new(1));
        let pending_approvals: Arc<Mutex<std::collections::HashMap<String, PendingApproval>>> =
            Arc::new(Mutex::new(std::collections::HashMap::new()));

        let approval_mode = match mode {
            AgentMode::BypassPermissions | AgentMode::Auto => "never",
            AgentMode::AcceptEdits => "on-request",
            _ => "untrusted",
        };

        let sandbox_mode = match mode {
            AgentMode::BypassPermissions => "danger-full-access",
            AgentMode::Auto | AgentMode::AcceptEdits => "workspace-write",
            _ => "read-only",
        };

        // Send initialize request
        let init_id = 0u64;
        if let Some(ref mut writer) = stdin {
            let msg = serde_json::json!({
                "jsonrpc": "2.0",
                "id": init_id,
                "method": "initialize",
                "params": {
                    "clientInfo": {
                        "name": "forge",
                        "version": "0.1.0"
                    }
                }
            });
            let _ = writer.write_all(msg.to_string().as_bytes());
            let _ = writer.write_all(b"\n");
            let _ = writer.flush();
        }

        // Stdout reader thread
        {
            let killed = killed.clone();
            let thread_id = thread_id.clone();
            let turn_id = turn_id.clone();
            let pending_approvals = pending_approvals.clone();
            let session_id_clone = session_id.clone();
            let app_handle_clone = app_handle.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if killed.load(Ordering::Relaxed) {
                        break;
                    }
                    let line = match line {
                        Ok(l) => l,
                        Err(_) => break,
                    };
                    if line.trim().is_empty() {
                        continue;
                    }
                    let json: serde_json::Value = match serde_json::from_str(&line) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    // Handle JSON-RPC responses (to our requests)
                    if json.get("result").is_some() {
                        // Extract thread ID from thread/start response
                        if let Some(tid) = json.pointer("/result/thread/id").and_then(|v| v.as_str()) {
                            if let Ok(mut t) = thread_id.lock() {
                                *t = Some(tid.to_string());
                            }
                        }
                        continue;
                    }
                    if json.get("error").is_some() {
                        // Log JSON-RPC errors
                        let err_msg = json.pointer("/error/message")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown error");
                        eprintln!("[forge/codex] JSON-RPC error: {}", err_msg);
                        continue;
                    }

                    // Handle JSON-RPC notifications (server → client)
                    if let Some(method) = json.get("method").and_then(|m| m.as_str()) {
                        let params = json.get("params").cloned().unwrap_or(serde_json::Value::Null);

                        // Check if this is a server request (has "id" field = needs response)
                        let is_request = json.get("id").is_some();

                        let event = parse_codex_notification(
                            method,
                            &params,
                            is_request,
                            json.get("id"),
                            &thread_id,
                            &turn_id,
                            &pending_approvals,
                        );

                        let _ = app_handle_clone.emit(
                            "agent-event",
                            AgentEventPayload {
                                session_id: session_id_clone.clone(),
                                event,
                            },
                        );
                    }
                }

                // EOF — emit exit
                let _ = app_handle_clone.emit(
                    "agent-exit",
                    AgentExitPayload {
                        session_id: session_id_clone,
                        exit_code: None,
                    },
                );
            });
        }

        // Stderr reader thread
        {
            let killed = killed.clone();
            let session_id_clone = session_id.clone();
            let app_handle_clone = app_handle.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if killed.load(Ordering::Relaxed) {
                        break;
                    }
                    let line = match line {
                        Ok(l) => l,
                        Err(_) => break,
                    };
                    if line.contains("Error") || line.contains("error") {
                        let _ = app_handle_clone.emit(
                            "agent-event",
                            AgentEventPayload {
                                session_id: session_id_clone.clone(),
                                event: AgentEvent::Raw {
                                    data: serde_json::json!({
                                        "type": "stderr",
                                        "message": line,
                                    }),
                                },
                            },
                        );
                    }
                }
            });
        }

        // Wait briefly for initialize response, then send initialized + thread/start + turn/start
        // We send them sequentially via stdin
        if let Some(ref mut writer) = stdin {
            // Send `initialized` notification (no id)
            let msg = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "initialized",
                "params": {}
            });
            let _ = writer.write_all(msg.to_string().as_bytes());
            let _ = writer.write_all(b"\n");

            // Send thread/start request
            let thread_start_id = request_counter.fetch_add(1, Ordering::Relaxed);
            let msg = serde_json::json!({
                "jsonrpc": "2.0",
                "id": thread_start_id,
                "method": "thread/start",
                "params": {
                    "approvalPolicy": approval_mode,
                    "cwd": working_directory,
                    "sandboxPermissions": [sandbox_mode],
                }
            });
            let _ = writer.write_all(msg.to_string().as_bytes());
            let _ = writer.write_all(b"\n");
            let _ = writer.flush();

            // Small delay to let thread/start complete before sending turn/start
            std::thread::sleep(std::time::Duration::from_millis(200));

            // We need the thread_id from the thread/started notification.
            // Wait for it to be populated (up to 5 seconds)
            let start = std::time::Instant::now();
            let resolved_thread_id = loop {
                if let Ok(tid) = thread_id.lock() {
                    if let Some(ref id) = *tid {
                        break id.clone();
                    }
                }
                if start.elapsed() > std::time::Duration::from_secs(5) {
                    // Fall back to a generated ID — the reader thread will update it
                    break format!("pending-{}", uuid::Uuid::now_v7());
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            };

            // Send turn/start with the initial prompt
            let turn_start_id = request_counter.fetch_add(1, Ordering::Relaxed);
            let msg = serde_json::json!({
                "jsonrpc": "2.0",
                "id": turn_start_id,
                "method": "turn/start",
                "params": {
                    "threadId": resolved_thread_id,
                    "input": [{
                        "type": "text",
                        "text": initial_prompt
                    }]
                }
            });
            let _ = writer.write_all(msg.to_string().as_bytes());
            let _ = writer.write_all(b"\n");
            let _ = writer.flush();
        }

        // Emit synthetic system_init event for the frontend
        let _ = app_handle.emit(
            "agent-event",
            AgentEventPayload {
                session_id: session_id.clone(),
                event: AgentEvent::SystemInit {
                    session_id: session_id.clone(),
                    model: Some("codex".to_string()),
                    permission_mode: Some(approval_mode.to_string()),
                    tools: None,
                },
            },
        );

        Ok(Self {
            child,
            stdin,
            killed,
            thread_id,
            turn_id,
            request_counter,
            pending_approvals,
        })
    }

    fn next_id(&self) -> u64 {
        self.request_counter.fetch_add(1, Ordering::Relaxed)
    }

    fn write_jsonrpc(&mut self, msg: &serde_json::Value) -> Result<(), String> {
        let stdin = self
            .stdin
            .as_mut()
            .ok_or_else(|| "stdin not available".to_string())?;
        stdin
            .write_all(msg.to_string().as_bytes())
            .map_err(|e| format!("Failed to write: {e}"))?;
        stdin
            .write_all(b"\n")
            .map_err(|e| format!("Failed to write newline: {e}"))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush: {e}"))?;
        Ok(())
    }
}

fn parse_codex_notification(
    method: &str,
    params: &serde_json::Value,
    is_request: bool,
    request_id: Option<&serde_json::Value>,
    thread_id: &Arc<Mutex<Option<String>>>,
    turn_id: &Arc<Mutex<Option<String>>>,
    pending_approvals: &Arc<Mutex<std::collections::HashMap<String, PendingApproval>>>,
) -> AgentEvent {
    let current_turn_id = turn_id.lock().ok().and_then(|t| t.clone());

    match method {
        "thread/started" => {
            // Extract thread ID from the thread object
            if let Some(tid) = params
                .pointer("/thread/id")
                .and_then(|v| v.as_str())
            {
                if let Ok(mut t) = thread_id.lock() {
                    *t = Some(tid.to_string());
                }
            }
            // Don't emit a visible event for this
            AgentEvent::Raw {
                data: serde_json::json!({"type": "thread_started"}),
            }
        }

        "turn/started" => {
            if let Some(tid) = params
                .pointer("/turn/id")
                .and_then(|v| v.as_str())
            {
                if let Ok(mut t) = turn_id.lock() {
                    *t = Some(tid.to_string());
                }
            }
            AgentEvent::Raw {
                data: serde_json::json!({"type": "turn_started"}),
            }
        }

        "turn/completed" => {
            let is_error = params
                .pointer("/turn/status")
                .and_then(|v| v.as_str())
                == Some("failed");
            let error_msg = params
                .pointer("/turn/error/message")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            AgentEvent::Result {
                result_text: error_msg,
                duration_ms: 0,
                total_cost_usd: 0.0,
                is_error,
            }
        }

        "item/agentMessage/delta" => {
            let delta = params
                .get("delta")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let item_id = params
                .get("itemId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            AgentEvent::AssistantMessageDelta {
                message_id: item_id,
                content_delta: delta,
            }
        }

        "item/started" => {
            let item_type = params
                .pointer("/item/type")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let item_id = params
                .pointer("/item/id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            match item_type {
                "agentMessage" => {
                    AgentEvent::AssistantMessageStart {
                        message_id: item_id,
                        turn_id: current_turn_id,
                    }
                }
                "commandExecution" => {
                    let command = params
                        .pointer("/item/command")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    AgentEvent::ToolUseStart {
                        tool_use_id: item_id,
                        name: "shell".to_string(),
                        input: serde_json::json!({"command": command}),
                        turn_id: current_turn_id,
                    }
                }
                "fileChange" => {
                    let filename = params
                        .pointer("/item/filename")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    AgentEvent::ToolUseStart {
                        tool_use_id: item_id,
                        name: "file_edit".to_string(),
                        input: serde_json::json!({"filename": filename}),
                        turn_id: current_turn_id,
                    }
                }
                "reasoning" => AgentEvent::Raw {
                    data: serde_json::json!({"type": "reasoning_started"}),
                },
                _ => AgentEvent::Raw {
                    data: serde_json::json!({"type": "item_started", "item_type": item_type}),
                },
            }
        }

        "item/completed" => {
            let item_type = params
                .pointer("/item/type")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let item_id = params
                .pointer("/item/id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            match item_type {
                "agentMessage" => {
                    let text = params
                        .pointer("/item/text")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    AgentEvent::AssistantMessageComplete {
                        message_id: item_id,
                        turn_id: current_turn_id,
                        content: if text.is_empty() { None } else { Some(text) },
                    }
                }
                "commandExecution" => {
                    let exit_code = params
                        .pointer("/item/exitCode")
                        .and_then(|v| v.as_i64());
                    let output = params
                        .pointer("/item/stdout")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    AgentEvent::ToolResultComplete {
                        tool_use_id: item_id,
                        content: if output.is_empty() { None } else { Some(output) },
                        is_error: exit_code.map(|c| c != 0).unwrap_or(false),
                    }
                }
                "fileChange" => AgentEvent::ToolResultComplete {
                    tool_use_id: item_id,
                    content: None,
                    is_error: false,
                },
                "reasoning" => AgentEvent::ReasoningComplete {
                    message_id: None,
                    turn_id: current_turn_id,
                },
                _ => AgentEvent::Raw {
                    data: serde_json::json!({"type": "item_completed", "item_type": item_type}),
                },
            }
        }

        "item/commandExecution/outputDelta" => {
            let delta = params
                .get("delta")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let item_id = params
                .get("itemId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            AgentEvent::ToolResultDelta {
                tool_use_id: item_id,
                content_delta: delta,
                is_error: Some(false),
            }
        }

        // Approval requests from the server
        "item/commandExecution/requestApproval"
        | "item/fileChange/requestApproval"
        | "item/permissions/requestApproval" => {
            if is_request {
                let item_id = params
                    .get("itemId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                // Store the pending approval so we can respond later
                if let Some(rid) = request_id {
                    if let Ok(mut approvals) = pending_approvals.lock() {
                        approvals.insert(
                            item_id.clone(),
                            PendingApproval {
                                jsonrpc_id: rid.clone(),
                                method: method.to_string(),
                            },
                        );
                    }
                }

                let tool_name = if method.contains("commandExecution") {
                    let cmd = params
                        .get("command")
                        .and_then(|v| v.as_str())
                        .unwrap_or("command");
                    format!("shell: {}", cmd)
                } else if method.contains("fileChange") {
                    "file modification".to_string()
                } else {
                    "permission request".to_string()
                };

                AgentEvent::Status {
                    state: crate::models::agent::AgentState::AwaitingApproval,
                    tool: Some(tool_name),
                    tool_use_id: Some(item_id),
                    message_id: None,
                    turn_id: current_turn_id,
                }
            } else {
                AgentEvent::Raw {
                    data: serde_json::json!({"type": method}),
                }
            }
        }

        "item/reasoning/summaryTextDelta" => {
            let delta = params
                .get("delta")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            AgentEvent::ReasoningDelta {
                content_delta: delta,
                message_id: None,
                turn_id: current_turn_id,
            }
        }

        "thread/tokenUsage/updated" => {
            // Could extract cost info here in the future
            AgentEvent::Raw {
                data: serde_json::json!({"type": "token_usage"}),
            }
        }

        "error" => {
            let message = params
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown error")
                .to_string();
            AgentEvent::Result {
                result_text: message,
                duration_ms: 0,
                total_cost_usd: 0.0,
                is_error: true,
            }
        }

        _ => {
            eprintln!("[forge/codex] unhandled notification: {method}");
            AgentEvent::Raw {
                data: serde_json::json!({"type": method}),
            }
        }
    }
}

impl AgentBackend for CodexBackend {
    fn send_message(&mut self, message: &str, _images: Option<&[crate::models::agent::ImageAttachment]>) -> Result<(), String> {
        // For follow-up messages, send a new turn/start on the existing thread
        let tid = self
            .thread_id
            .lock()
            .ok()
            .and_then(|t| t.clone())
            .ok_or_else(|| "No active thread".to_string())?;

        let id = self.next_id();
        let msg = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": "turn/start",
            "params": {
                "threadId": tid,
                "input": [{
                    "type": "text",
                    "text": message
                }]
            }
        });
        self.write_jsonrpc(&msg)
    }

    fn respond_permission(&mut self, tool_use_id: &str, allow: bool) -> Result<(), String> {
        // Look up the pending approval to get the JSON-RPC request ID and method
        let approval = {
            let mut approvals = self.pending_approvals.lock().map_err(|e| e.to_string())?;
            approvals.remove(tool_use_id)
        };

        if let Some(approval) = approval {
            let decision = if allow { "accept" } else { "decline" };

            let response = if approval.method.contains("commandExecution") {
                serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": approval.jsonrpc_id,
                    "result": {
                        "decision": decision
                    }
                })
            } else {
                // fileChange and permissions use similar accept/decline
                serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": approval.jsonrpc_id,
                    "result": {
                        "decision": decision
                    }
                })
            };

            self.write_jsonrpc(&response)
        } else {
            Err(format!(
                "No pending approval found for item '{}'",
                tool_use_id
            ))
        }
    }

    fn abort(&mut self) -> Result<(), String> {
        // Send turn/interrupt if we have an active turn
        let tid = self.thread_id.lock().ok().and_then(|t| t.clone());
        let tuid = self.turn_id.lock().ok().and_then(|t| t.clone());

        if let (Some(thread_id), Some(turn_id)) = (tid, tuid) {
            let id = self.next_id();
            let msg = serde_json::json!({
                "jsonrpc": "2.0",
                "id": id,
                "method": "turn/interrupt",
                "params": {
                    "threadId": thread_id,
                    "turnId": turn_id
                }
            });
            self.write_jsonrpc(&msg)?;
        }

        // Also send SIGINT as backup
        #[cfg(unix)]
        {
            let pid = self.child.id() as i32;
            unsafe {
                libc::kill(pid, libc::SIGINT);
            }
        }
        Ok(())
    }

    fn kill(&mut self) {
        if !self.killed.swap(true, Ordering::Relaxed) {
            let _ = self.child.kill();
        }
    }

    fn is_alive(&mut self) -> bool {
        if self.killed.load(Ordering::Relaxed) {
            return false;
        }
        match self.child.try_wait() {
            Ok(Some(_)) => false,
            _ => true,
        }
    }

    fn conversation_id(&self) -> Option<String> {
        self.thread_id
            .lock()
            .ok()
            .and_then(|tid| tid.clone())
    }
}

impl Drop for CodexBackend {
    fn drop(&mut self) {
        self.kill();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state() -> (
        Arc<Mutex<Option<String>>>,
        Arc<Mutex<Option<String>>>,
        Arc<Mutex<std::collections::HashMap<String, PendingApproval>>>,
    ) {
        (
            Arc::new(Mutex::new(Some("thread-1".to_string()))),
            Arc::new(Mutex::new(Some("turn-1".to_string()))),
            Arc::new(Mutex::new(std::collections::HashMap::new())),
        )
    }

    #[test]
    fn parses_agent_message_start_and_complete_without_duplicates() {
        let (thread_id, turn_id, pending_approvals) = test_state();

        let start = parse_codex_notification(
            "item/started",
            &serde_json::json!({
                "item": {
                    "type": "agentMessage",
                    "id": "msg-1"
                }
            }),
            false,
            None,
            &thread_id,
            &turn_id,
            &pending_approvals,
        );
        assert!(matches!(
            start,
            AgentEvent::AssistantMessageStart { message_id, turn_id }
                if message_id == "msg-1" && turn_id.as_deref() == Some("turn-1")
        ));

        let complete = parse_codex_notification(
            "item/completed",
            &serde_json::json!({
                "item": {
                    "type": "agentMessage",
                    "id": "msg-1",
                    "text": "done"
                }
            }),
            false,
            None,
            &thread_id,
            &turn_id,
            &pending_approvals,
        );
        assert!(matches!(
            complete,
            AgentEvent::AssistantMessageComplete { message_id, content, .. }
                if message_id == "msg-1" && content.as_deref() == Some("done")
        ));
    }

    #[test]
    fn reasoning_delta_is_not_mapped_to_assistant_text() {
        let (thread_id, turn_id, pending_approvals) = test_state();

        let event = parse_codex_notification(
            "item/reasoning/summaryTextDelta",
            &serde_json::json!({
                "itemId": "reasoning-1",
                "delta": "thinking"
            }),
            false,
            None,
            &thread_id,
            &turn_id,
            &pending_approvals,
        );

        assert!(matches!(
            event,
            AgentEvent::ReasoningDelta { content_delta, turn_id, .. }
                if content_delta == "thinking" && turn_id.as_deref() == Some("turn-1")
        ));
    }

    #[test]
    fn command_output_stays_in_tool_result_events() {
        let (thread_id, turn_id, pending_approvals) = test_state();

        let delta = parse_codex_notification(
            "item/commandExecution/outputDelta",
            &serde_json::json!({
                "itemId": "cmd-1",
                "delta": "partial"
            }),
            false,
            None,
            &thread_id,
            &turn_id,
            &pending_approvals,
        );
        assert!(matches!(
            delta,
            AgentEvent::ToolResultDelta { tool_use_id, content_delta, .. }
                if tool_use_id == "cmd-1" && content_delta == "partial"
        ));

        let complete = parse_codex_notification(
            "item/completed",
            &serde_json::json!({
                "item": {
                    "type": "commandExecution",
                    "id": "cmd-1",
                    "stdout": "partial\nfinal",
                    "exitCode": 0
                }
            }),
            false,
            None,
            &thread_id,
            &turn_id,
            &pending_approvals,
        );
        assert!(matches!(
            complete,
            AgentEvent::ToolResultComplete { tool_use_id, content, is_error }
                if tool_use_id == "cmd-1"
                    && content.as_deref() == Some("partial\nfinal")
                    && !is_error
        ));
    }
}
