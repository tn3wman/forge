use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use crate::models::agent_cli::{AgentInfo, AgentStatus, CliType};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentDataEvent {
    pub agent_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentErrorEvent {
    pub agent_id: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentExitEvent {
    pub agent_id: String,
    pub exit_code: Option<i32>,
    pub status: AgentStatus,
}

pub struct AgentInstance {
    pub id: String,
    pub bay_id: String,
    pub lane_id: String,
    pub cli_type: CliType,
    pub status: Arc<Mutex<AgentStatus>>,
    writer: Arc<Mutex<ChildStdin>>,
    child: Arc<Mutex<Child>>,
}

impl AgentInstance {
    pub fn spawn(
        id: String,
        bay_id: String,
        lane_id: String,
        cli_type: CliType,
        mut cmd: Command,
        app_handle: tauri::AppHandle,
        db_path: PathBuf,
    ) -> Result<Self, String> {
        cmd.stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn agent process: {e}"))?;

        let stdin = child.stdin.take().ok_or("Failed to capture agent stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to capture agent stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to capture agent stderr")?;

        let writer = Arc::new(Mutex::new(stdin));
        let child = Arc::new(Mutex::new(child));
        let status = Arc::new(Mutex::new(AgentStatus::Running));

        // Spawn stdout reader thread
        let agent_id_stdout = id.clone();
        let app_stdout = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let event = AgentDataEvent {
                            agent_id: agent_id_stdout.clone(),
                            data: line,
                        };
                        let event_name = format!("agent:data:{}", agent_id_stdout);
                        let _ = app_stdout.emit(&event_name, &event);
                    }
                    Err(e) => {
                        eprintln!("Agent stdout reader error: {e}");
                        break;
                    }
                }
            }
        });

        // Spawn stderr reader thread
        let agent_id_stderr = id.clone();
        let app_stderr = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let event = AgentErrorEvent {
                            agent_id: agent_id_stderr.clone(),
                            error: line,
                        };
                        let event_name = format!("agent:error:{}", agent_id_stderr);
                        let _ = app_stderr.emit(&event_name, &event);
                    }
                    Err(e) => {
                        eprintln!("Agent stderr reader error: {e}");
                        break;
                    }
                }
            }
        });

        // Spawn exit watcher thread
        let agent_id_exit = id.clone();
        let bay_id_for_exit = bay_id.clone();
        let lane_id_for_exit = lane_id.clone();
        let child_for_exit = Arc::clone(&child);
        let status_for_exit = Arc::clone(&status);
        let app_exit = app_handle;
        let db_path_for_exit = db_path;
        std::thread::spawn(move || {
            let exit_code = loop {
                let result = child_for_exit.lock().ok().and_then(|mut c| c.try_wait().ok());
                match result {
                    Some(Some(status)) => break status.code(),
                    Some(None) => {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                    }
                    None => break None,
                }
            };

            let final_status = match exit_code {
                Some(0) => AgentStatus::Completed,
                Some(_) => AgentStatus::Failed,
                None => AgentStatus::Killed,
            };

            if let Ok(mut s) = status_for_exit.lock() {
                *s = final_status.clone();
            }

            // Update agent_sessions row and insert event in the database
            if let Ok(conn) = rusqlite::Connection::open(&db_path_for_exit) {
                let status_str = match final_status {
                    AgentStatus::Completed => "completed",
                    AgentStatus::Failed => "failed",
                    AgentStatus::Killed => "killed",
                    AgentStatus::Running => "running",
                };
                let _ = conn.execute(
                    "UPDATE agent_sessions SET status = ?1, exit_code = ?2, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?3",
                    rusqlite::params![status_str, exit_code, agent_id_exit],
                );

                // Insert lifecycle event
                let event_id = uuid::Uuid::now_v7().to_string();
                let event_type = match final_status {
                    AgentStatus::Completed => "agent.completed",
                    AgentStatus::Failed => "agent.failed",
                    AgentStatus::Killed => "agent.killed",
                    AgentStatus::Running => "agent.running",
                };
                let payload = serde_json::json!({
                    "agentId": agent_id_exit,
                    "exitCode": exit_code,
                })
                .to_string();
                let _ = conn.execute(
                    "INSERT INTO events (id, bay_id, lane_id, type, payload) VALUES (?1, ?2, ?3, ?4, ?5)",
                    rusqlite::params![event_id, bay_id_for_exit, lane_id_for_exit, event_type, payload],
                );
            }

            let exit_event = AgentExitEvent {
                agent_id: agent_id_exit.clone(),
                exit_code,
                status: final_status,
            };
            let event_name = format!("agent:exit:{}", agent_id_exit);
            let _ = app_exit.emit(&event_name, &exit_event);
        });

        Ok(AgentInstance {
            id,
            bay_id,
            lane_id,
            cli_type,
            status,
            writer,
            child,
        })
    }

    pub fn write(&self, data: &str) -> Result<(), String> {
        let mut writer = self.writer.lock().map_err(|e| e.to_string())?;
        writer.write_all(data.as_bytes()).map_err(|e| format!("Failed to write to agent: {e}"))?;
        writer.flush().map_err(|e| format!("Failed to flush agent stdin: {e}"))?;
        Ok(())
    }

    pub fn kill(&mut self) -> Result<(), String> {
        let mut child = self.child.lock().map_err(|e| e.to_string())?;
        child.kill().map_err(|e| format!("Failed to kill agent: {e}"))?;
        if let Ok(mut s) = self.status.lock() {
            *s = AgentStatus::Killed;
        }
        Ok(())
    }

    pub fn info(&self) -> AgentInfo {
        let status = self.status.lock().map(|s| s.clone()).unwrap_or(AgentStatus::Running);
        AgentInfo {
            id: self.id.clone(),
            bay_id: self.bay_id.clone(),
            lane_id: self.lane_id.clone(),
            cli_type: self.cli_type.clone(),
            status,
        }
    }
}
