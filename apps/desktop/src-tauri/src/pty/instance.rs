use base64::Engine;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalInfo {
    pub id: String,
    pub bay_id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyDataEvent {
    pub terminal_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyExitEvent {
    pub terminal_id: String,
    pub exit_code: Option<i32>,
}

pub struct PtyInstance {
    pub id: String,
    pub bay_id: String,
    pub label: String,
    writer: Arc<std::sync::Mutex<Box<dyn Write + Send>>>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    child: Arc<std::sync::Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
}

impl PtyInstance {
    pub fn spawn(
        id: String,
        bay_id: String,
        label: String,
        cwd: String,
        cols: u16,
        rows: u16,
        app_handle: tauri::AppHandle,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();
        let size = PtySize { rows, cols, pixel_width: 0, pixel_height: 0 };
        let pair = pty_system.openpty(size).map_err(|e| format!("Failed to open PTY: {e}"))?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(&cwd);

        let child = pair.slave.spawn_command(cmd).map_err(|e| format!("Failed to spawn shell: {e}"))?;
        drop(pair.slave);

        let writer = pair.master.take_writer().map_err(|e| format!("Failed to get writer: {e}"))?;
        let writer = Arc::new(std::sync::Mutex::new(writer));
        let mut reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to get reader: {e}"))?;
        let child = Arc::new(std::sync::Mutex::new(child));

        let terminal_id = id.clone();
        let app = app_handle.clone();
        let child_for_exit = Arc::clone(&child);

        tokio::task::spawn_blocking(move || {
            let mut buf = [0u8; 4096];
            let engine = base64::engine::general_purpose::STANDARD;
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let encoded = engine.encode(&buf[..n]);
                        let event = PtyDataEvent { terminal_id: terminal_id.clone(), data: encoded };
                        let event_name = format!("pty:data:{}", terminal_id);
                        let _ = app.emit(&event_name, &event);
                    }
                    Err(e) => { eprintln!("PTY reader error: {e}"); break; }
                }
            }
            let exit_code = child_for_exit.lock().ok()
                .and_then(|mut c| c.try_wait().ok().flatten())
                .map(|s| s.exit_code() as i32);
            let exit_event = PtyExitEvent { terminal_id: terminal_id.clone(), exit_code };
            let event_name = format!("pty:exit:{}", terminal_id);
            let _ = app.emit(&event_name, &exit_event);
        });

        Ok(PtyInstance { id, bay_id, label, writer, master: pair.master, child })
    }

    pub fn write(&self, data: &str) -> Result<(), String> {
        let mut writer = self.writer.lock().map_err(|e| e.to_string())?;
        writer.write_all(data.as_bytes()).map_err(|e| format!("Failed to write to PTY: {e}"))?;
        writer.flush().map_err(|e| format!("Failed to flush PTY: {e}"))?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        self.master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| format!("Failed to resize PTY: {e}"))
    }

    pub fn kill(&mut self) -> Result<(), String> {
        let mut child = self.child.lock().map_err(|e| e.to_string())?;
        child.kill().map_err(|e| format!("Failed to kill PTY: {e}"))
    }
}
