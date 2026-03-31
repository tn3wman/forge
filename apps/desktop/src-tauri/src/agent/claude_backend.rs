use crate::models::agent::{
    AgentEvent, AgentEventPayload, AgentExitPayload, AgentMode, ClaudeLaunchOptions,
    SlashCommandInfo,
};
use serde_json::json;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

use super::backend::AgentBackend;

type PendingCommands = Arc<Mutex<HashMap<String, mpsc::Sender<Result<serde_json::Value, String>>>>>;
type ApprovalLookup = Arc<Mutex<HashMap<String, String>>>;

pub struct ClaudeBackend {
    session_id: String,
    child: Child,
    stdin: Option<ChildStdin>,
    killed: Arc<AtomicBool>,
    conversation_id: Arc<Mutex<Option<String>>>,
    pending_commands: PendingCommands,
    approval_lookup: ApprovalLookup,
}

impl ClaudeBackend {
    pub fn spawn(
        session_id: String,
        mode: &AgentMode,
        working_directory: Option<&str>,
        initial_prompt: &str,
        claude: Option<&ClaudeLaunchOptions>,
        app_handle: AppHandle,
    ) -> Result<Self, String> {
        let node_path = resolve_node_path()?;
        let host_script = resolve_host_script_path(&app_handle)?;

        let mut cmd = Command::new(node_path);
        crate::shell_env::apply_env(&mut cmd);
        cmd.arg(host_script)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(dir) = working_directory {
            cmd.current_dir(dir);
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn Claude host: {e}"))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture Claude host stdout".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture Claude host stderr".to_string())?;
        let stdin = child.stdin.take();

        let killed = Arc::new(AtomicBool::new(false));
        let conversation_id: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
        let pending_commands: PendingCommands = Arc::new(Mutex::new(HashMap::new()));
        let approval_lookup: ApprovalLookup = Arc::new(Mutex::new(HashMap::new()));

        {
            let killed = killed.clone();
            let conversation_id = conversation_id.clone();
            let pending_commands = pending_commands.clone();
            let approval_lookup = approval_lookup.clone();
            let session_id = session_id.clone();
            let app_handle = app_handle.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if killed.load(Ordering::Relaxed) {
                        break;
                    }
                    let line = match line {
                        Ok(line) => line,
                        Err(_) => break,
                    };
                    if line.trim().is_empty() {
                        continue;
                    }

                    let json: serde_json::Value = match serde_json::from_str(&line) {
                        Ok(value) => value,
                        Err(_) => continue,
                    };

                    if json.get("type").and_then(|v| v.as_str()) == Some("command_result") {
                        handle_command_result(&pending_commands, &json);
                        continue;
                    }

                    let events = parse_host_events(&json, &conversation_id, &approval_lookup);
                    for event in events {
                        let _ = app_handle.emit(
                            "agent-event",
                            AgentEventPayload {
                                session_id: session_id.clone(),
                                event,
                            },
                        );
                    }
                }

                let _ = app_handle.emit(
                    "agent-exit",
                    AgentExitPayload {
                        session_id,
                        exit_code: None,
                    },
                );
            });
        }

        {
            let killed = killed.clone();
            let session_id = session_id.clone();
            let app_handle = app_handle.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if killed.load(Ordering::Relaxed) {
                        break;
                    }
                    let line = match line {
                        Ok(line) => line,
                        Err(_) => break,
                    };
                    if line.trim().is_empty() {
                        continue;
                    }

                    let _ = app_handle.emit(
                        "agent-event",
                        AgentEventPayload {
                            session_id: session_id.clone(),
                            event: AgentEvent::Raw {
                                data: json!({
                                    "type": "claude_host_stderr",
                                    "message": line,
                                }),
                            },
                        },
                    );
                }
            });
        }

        let mut backend = Self {
            session_id: session_id.clone(),
            child,
            stdin,
            killed,
            conversation_id,
            pending_commands,
            approval_lookup,
        };

        backend.call_host(
            "start_session",
            json!({
                "sessionId": session_id,
                "cwd": working_directory,
                "prompt": initial_prompt,
                "model": claude.and_then(|opts| opts.model.clone()),
                "permissionMode": claude
                    .and_then(|opts| opts.permission_mode.clone())
                    .or_else(|| Some(mode_to_permission_mode(mode).to_string())),
                "effort": claude.and_then(|opts| opts.effort.clone()),
                "agent": claude.and_then(|opts| opts.agent.clone()),
                "claudePath": claude.and_then(|opts| opts.claude_path.clone()),
            }),
        )?;

        Ok(backend)
    }

    pub fn discover_slash_commands() -> Result<Vec<SlashCommandInfo>, String> {
        let node_path = resolve_node_path()?;
        let host_script = resolve_host_script_path_from_cwd()?;

        let mut cmd = Command::new(node_path);
        crate::shell_env::apply_env(&mut cmd);
        cmd.arg(host_script)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn Claude host for capabilities: {e}"))?;
        let mut stdin = child.stdin.take().ok_or_else(|| "Missing stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Missing stdout".to_string())?;

        let request_id = uuid::Uuid::now_v7().to_string();
        let command = json!({
            "type": "get_capabilities",
            "requestId": request_id,
        });
        stdin
            .write_all(command.to_string().as_bytes())
            .map_err(|e| format!("Failed to write capabilities request: {e}"))?;
        stdin
            .write_all(b"\n")
            .map_err(|e| format!("Failed to write capabilities newline: {e}"))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush capabilities request: {e}"))?;

        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let line = line.map_err(|e| format!("Failed to read capabilities output: {e}"))?;
            if line.trim().is_empty() {
                continue;
            }
            let json: serde_json::Value =
                serde_json::from_str(&line).map_err(|e| format!("Invalid capabilities JSON: {e}"))?;
            if json.get("type").and_then(|v| v.as_str()) != Some("command_result") {
                continue;
            }
            if json
                .get("requestId")
                .and_then(|v| v.as_str())
                != Some(request_id.as_str())
            {
                continue;
            }

            if !json.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) {
                return Err(json
                    .get("error")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Claude capability lookup failed")
                    .to_string());
            }

            let slash_commands = json
                .pointer("/result/slashCommands")
                .and_then(|v| serde_json::from_value::<Vec<SlashCommandInfo>>(v.clone()).ok())
                .unwrap_or_default();
            return Ok(slash_commands);
        }

        Err("Claude capability lookup did not return a result".to_string())
    }

    fn write_host_command(&mut self, value: &serde_json::Value) -> Result<(), String> {
        let stdin = self
            .stdin
            .as_mut()
            .ok_or_else(|| "Claude host stdin not available".to_string())?;
        stdin
            .write_all(value.to_string().as_bytes())
            .map_err(|e| format!("Failed to write Claude host command: {e}"))?;
        stdin
            .write_all(b"\n")
            .map_err(|e| format!("Failed to write Claude host newline: {e}"))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush Claude host command: {e}"))
    }

    fn call_host(
        &mut self,
        command_type: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        let request_id = uuid::Uuid::now_v7().to_string();
        let (tx, rx) = mpsc::channel::<Result<serde_json::Value, String>>();
        self.pending_commands
            .lock()
            .map_err(|e| e.to_string())?
            .insert(request_id.clone(), tx);

        let mut command = match payload {
            serde_json::Value::Object(map) => map,
            _ => serde_json::Map::new(),
        };
        command.insert("type".to_string(), json!(command_type));
        command.insert("requestId".to_string(), json!(request_id));
        self.write_host_command(&serde_json::Value::Object(command))?;

        match rx.recv_timeout(Duration::from_secs(30)) {
            Ok(result) => result,
            Err(_) => Err(format!("Timed out waiting for Claude host '{command_type}'")),
        }
    }
}

fn resolve_node_path() -> Result<PathBuf, String> {
    crate::shell_env::which("node").map_err(|_| "Node.js not found in PATH".to_string())
}

fn resolve_host_script_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    // In development, resolve from the workspace directory structure
    if let Ok(path) = resolve_host_script_path_from_cwd() {
        return Ok(path);
    }

    // In production (packaged app), the bundled script is in Tauri resources
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to resolve app resources: {e}"))?;
    let candidates = [
        resource_dir.join("claude-host").join("index.js"),
        resource_dir.join("index.js"),
    ];
    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.clone());
        }
    }

    Err(format!(
        "Claude host script not found. Checked: {}",
        candidates
            .iter()
            .map(|p| p.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    ))
}

fn resolve_host_script_path_from_cwd() -> Result<PathBuf, String> {
    let cwd = std::env::current_dir().map_err(|e| format!("Failed to resolve cwd: {e}"))?;
    let candidates = [
        cwd.join("apps").join("claude-host").join("dist").join("index.js"),
        cwd.join("..").join("claude-host").join("dist").join("index.js"),
        cwd.join("..").join("..").join("claude-host").join("dist").join("index.js"),
    ];

    candidates
        .into_iter()
        .find(|candidate| candidate.exists())
        .ok_or_else(|| "Claude host dist/index.js not found".to_string())
}

fn handle_command_result(pending_commands: &PendingCommands, json: &serde_json::Value) {
    let Some(request_id) = json.get("requestId").and_then(|v| v.as_str()) else {
        return;
    };
    let sender = pending_commands
        .lock()
        .ok()
        .and_then(|mut pending| pending.remove(request_id));
    let Some(sender) = sender else {
        return;
    };

    let result = if json.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) {
        Ok(json.get("result").cloned().unwrap_or(serde_json::Value::Null))
    } else {
        Err(json
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Claude host command failed")
            .to_string())
    };
    let _ = sender.send(result);
}

fn parse_host_events(
    json: &serde_json::Value,
    conversation_id: &Arc<Mutex<Option<String>>>,
    approval_lookup: &ApprovalLookup,
) -> Vec<AgentEvent> {
    let event_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
    match event_type {
        "session_init" => {
            let claude_session_id = json
                .get("claudeSessionId")
                .and_then(|v| v.as_str())
                .map(str::to_string);
            if let Some(ref session_id) = claude_session_id {
                if let Ok(mut cid) = conversation_id.lock() {
                    *cid = Some(session_id.clone());
                }
            }
            vec![AgentEvent::SystemInit {
                session_id: claude_session_id.unwrap_or_default(),
                model: json.get("model").and_then(|v| v.as_str()).map(str::to_string),
                permission_mode: json
                    .get("permissionMode")
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
                tools: json
                    .get("tools")
                    .and_then(|v| v.as_array())
                    .map(|tools| {
                        tools
                            .iter()
                            .filter_map(|tool| tool.as_str().map(str::to_string))
                            .collect()
                    }),
            }]
        }
        "session_meta" => {
            let slash_commands = json
                .get("slashCommands")
                .and_then(|v| serde_json::from_value::<Vec<SlashCommandInfo>>(v.clone()).ok());
            vec![AgentEvent::SessionMeta {
                provider: Some("claude".to_string()),
                conversation_id: conversation_id
                    .lock()
                    .ok()
                    .and_then(|cid| cid.clone()),
                agent: json.get("agent").and_then(|v| v.as_str()).map(str::to_string),
                effort: json.get("effort").and_then(|v| v.as_str()).map(str::to_string),
                claude_path: json
                    .get("claudePath")
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
                slash_commands,
            }]
        }
        "assistant_start" => vec![AgentEvent::AssistantMessageStart {
            message_id: json
                .get("messageId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            turn_id: None,
        }],
        "assistant_delta" => vec![AgentEvent::AssistantMessageDelta {
            message_id: json
                .get("messageId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            content_delta: json
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
        }],
        "assistant_complete" => vec![AgentEvent::AssistantMessageComplete {
            message_id: json
                .get("messageId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            turn_id: None,
            content: json.get("content").and_then(|v| v.as_str()).map(str::to_string),
        }],
        "thinking_start" => vec![AgentEvent::ThinkingStart {
            message_id: json
                .get("messageId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            turn_id: None,
        }],
        "thinking_delta" => vec![AgentEvent::ReasoningDelta {
            content_delta: json
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            message_id: json.get("messageId").and_then(|v| v.as_str()).map(str::to_string),
            turn_id: None,
        }],
        "thinking_complete" => vec![AgentEvent::ReasoningComplete {
            message_id: json.get("messageId").and_then(|v| v.as_str()).map(str::to_string),
            turn_id: None,
        }],
        "tool_start" => vec![AgentEvent::ToolUseStart {
            tool_use_id: json
                .get("toolUseId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            name: json
                .get("toolName")
                .and_then(|v| v.as_str())
                .unwrap_or("tool")
                .to_string(),
            input: json
                .get("input")
                .cloned()
                .unwrap_or(serde_json::Value::Null),
            turn_id: None,
        }],
        "tool_input_delta" => vec![AgentEvent::ToolInputDelta {
            tool_use_id: json
                .get("toolUseId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            input_delta: json
                .get("inputDelta")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
        }],
        "tool_progress" => vec![AgentEvent::ToolProgress {
            tool_use_id: json.get("toolUseId").and_then(|v| v.as_str()).map(str::to_string),
            name: json.get("toolName").and_then(|v| v.as_str()).map(str::to_string),
            status: json
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("working")
                .to_string(),
        }],
        "tool_output_delta" => vec![AgentEvent::ToolResultDelta {
            tool_use_id: json
                .get("toolUseId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            content_delta: json
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            is_error: json.get("isError").and_then(|v| v.as_bool()),
        }],
        "tool_complete" => vec![AgentEvent::ToolResultComplete {
            tool_use_id: json
                .get("toolUseId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            content: json.get("content").and_then(|v| v.as_str()).map(str::to_string),
            is_error: json.get("isError").and_then(|v| v.as_bool()).unwrap_or(false),
        }],
        "approval_requested" => {
            let tool_use_id = json
                .get("toolUseId")
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let approval_id = json
                .get("approvalId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            if let Some(ref tool_use_id) = tool_use_id {
                if let Ok(mut lookup) = approval_lookup.lock() {
                    lookup.insert(tool_use_id.clone(), approval_id.clone());
                }
            }
            vec![
                AgentEvent::ApprovalRequested {
                    approval_id: approval_id.clone(),
                    tool_use_id: tool_use_id.clone(),
                    tool_name: json
                        .get("toolName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("tool")
                        .to_string(),
                    input: json.get("input").cloned(),
                    detail: json
                        .get("detail")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string(),
                },
                AgentEvent::Status {
                    state: crate::models::agent::AgentState::AwaitingApproval,
                    tool: json.get("toolName").and_then(|v| v.as_str()).map(str::to_string),
                    tool_use_id: Some(tool_use_id.unwrap_or(approval_id)),
                    message_id: None,
                    turn_id: None,
                },
            ]
        }
        "approval_resolved" => vec![AgentEvent::ApprovalResolved {
            approval_id: json
                .get("approvalId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            allow: json.get("allow").and_then(|v| v.as_bool()).unwrap_or(false),
        }],
        "result" => vec![AgentEvent::Result {
            result_text: json
                .get("resultText")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            duration_ms: json.get("durationMs").and_then(|v| v.as_u64()).unwrap_or(0),
            total_cost_usd: json
                .get("totalCostUsd")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            is_error: json.get("isError").and_then(|v| v.as_bool()).unwrap_or(false),
        }],
        "runtime_error" => vec![AgentEvent::Result {
            result_text: json
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Claude host error")
                .to_string(),
            duration_ms: 0,
            total_cost_usd: 0.0,
            is_error: true,
        }],
        _ => vec![AgentEvent::Raw { data: json.clone() }],
    }
}

fn mode_to_permission_mode(mode: &AgentMode) -> &'static str {
    match mode {
        AgentMode::Supervised => "supervised",
        AgentMode::Assisted => "assisted",
        AgentMode::FullAccess => "fullAccess",
    }
}

impl AgentBackend for ClaudeBackend {
    fn send_message(&mut self, message: &str, images: Option<&[crate::models::agent::ImageAttachment]>) -> Result<(), String> {
        let mut payload = json!({
            "sessionId": self.session_id,
            "prompt": message,
        });
        if let Some(imgs) = images {
            if !imgs.is_empty() {
                payload.as_object_mut().unwrap().insert(
                    "images".to_string(),
                    json!(imgs.iter().map(|img| json!({
                        "data": img.data,
                        "mediaType": img.media_type,
                    })).collect::<Vec<_>>()),
                );
            }
        }
        self.call_host("send_user_message", payload)?;
        Ok(())
    }

    fn respond_permission(&mut self, tool_use_id: &str, allow: bool) -> Result<(), String> {
        let approval_id = self
            .approval_lookup
            .lock()
            .map_err(|e| e.to_string())?
            .remove(tool_use_id)
            .unwrap_or_else(|| tool_use_id.to_string());
        self.call_host(
            "respond_approval",
            json!({
                "sessionId": self.session_id,
                "approvalId": approval_id,
                "allow": allow,
            }),
        )?;
        Ok(())
    }

    fn abort(&mut self) -> Result<(), String> {
        self.call_host(
            "interrupt_turn",
            json!({
                "sessionId": self.session_id,
            }),
        )?;
        Ok(())
    }

    fn kill(&mut self) {
        if !self.killed.swap(true, Ordering::Relaxed) {
            let _ = self.call_host(
                "end_session",
                json!({
                    "sessionId": self.session_id,
                }),
            );
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
        self.conversation_id
            .lock()
            .ok()
            .and_then(|cid| cid.clone())
    }
}

impl Drop for ClaudeBackend {
    fn drop(&mut self) {
        self.kill();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_session_init_from_host() {
        let conversation_id = Arc::new(Mutex::new(None));
        let approvals = Arc::new(Mutex::new(HashMap::new()));
        let events = parse_host_events(
            &json!({
                "type": "session_init",
                "claudeSessionId": "claude-session-1",
                "model": "claude-sonnet",
                "permissionMode": "default",
                "tools": ["Read", "Edit"],
            }),
            &conversation_id,
            &approvals,
        );
        assert!(matches!(
            events.as_slice(),
            [AgentEvent::SystemInit { session_id, model, permission_mode, tools }]
            if session_id == "claude-session-1"
                && model.as_deref() == Some("claude-sonnet")
                && permission_mode.as_deref() == Some("default")
                && tools.as_ref().is_some_and(|tools| tools.len() == 2)
        ));
    }

    #[test]
    fn parses_approval_request_into_rich_event_and_status() {
        let conversation_id = Arc::new(Mutex::new(None));
        let approvals = Arc::new(Mutex::new(HashMap::new()));
        let events = parse_host_events(
            &json!({
                "type": "approval_requested",
                "approvalId": "approval-1",
                "toolUseId": "tool-1",
                "toolName": "Bash",
                "input": {"command": "git status"},
                "detail": "Bash {\"command\":\"git status\"}",
            }),
            &conversation_id,
            &approvals,
        );
        assert!(matches!(
            events.as_slice(),
            [
                AgentEvent::ApprovalRequested { approval_id, tool_use_id, tool_name, .. },
                AgentEvent::Status { state: crate::models::agent::AgentState::AwaitingApproval, tool_use_id: status_tool, .. }
            ] if approval_id == "approval-1"
                && tool_use_id.as_deref() == Some("tool-1")
                && tool_name == "Bash"
                && status_tool.as_deref() == Some("tool-1")
        ));
    }
}
