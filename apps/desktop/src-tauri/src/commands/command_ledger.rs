use crate::db::Database;
use crate::models::CommandEntry;
use tauri::Emitter;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn command_ledger_insert(
    bay_id: String,
    command: String,
    cwd: String,
    lane_id: Option<String>,
    agent_id: Option<String>,
    terminal_id: Option<String>,
    env: Option<String>,
    db: State<'_, Database>,
) -> Result<CommandEntry, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO command_ledger (id, bay_id, lane_id, agent_id, terminal_id, command, cwd, env, status, started_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'running', ?9)",
        rusqlite::params![id, bay_id, lane_id, agent_id, terminal_id, command, cwd, env, now],
    )
    .map_err(|e| format!("Failed to insert command: {e}"))?;

    Ok(CommandEntry {
        id, bay_id, lane_id, agent_id, terminal_id, command, cwd, env,
        status: "running".to_string(),
        exit_code: None, started_at: now, completed_at: None,
        duration_ms: None, stdout_preview: None, stderr_preview: None, metadata: None,
    })
}

#[tauri::command]
pub fn command_ledger_complete(
    id: String,
    exit_code: Option<i32>,
    duration_ms: Option<i64>,
    stdout_preview: Option<String>,
    stderr_preview: Option<String>,
    db: State<'_, Database>,
) -> Result<CommandEntry, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let status = match exit_code {
        Some(0) => "completed",
        Some(_) => "failed",
        None => "killed",
    };

    conn.execute(
        "UPDATE command_ledger SET status = ?1, exit_code = ?2, completed_at = ?3, duration_ms = ?4, stdout_preview = ?5, stderr_preview = ?6 WHERE id = ?7",
        rusqlite::params![status, exit_code, now, duration_ms, stdout_preview, stderr_preview, id],
    )
    .map_err(|e| format!("Failed to complete command: {e}"))?;

    conn.query_row(
        "SELECT id, bay_id, lane_id, agent_id, terminal_id, command, cwd, env, status, exit_code, started_at, completed_at, duration_ms, stdout_preview, stderr_preview, metadata FROM command_ledger WHERE id = ?1",
        [&id],
        |row| {
            Ok(CommandEntry {
                id: row.get(0)?, bay_id: row.get(1)?, lane_id: row.get(2)?,
                agent_id: row.get(3)?, terminal_id: row.get(4)?, command: row.get(5)?,
                cwd: row.get(6)?, env: row.get(7)?, status: row.get(8)?,
                exit_code: row.get(9)?, started_at: row.get(10)?,
                completed_at: row.get(11)?, duration_ms: row.get(12)?,
                stdout_preview: row.get(13)?, stderr_preview: row.get(14)?,
                metadata: row.get(15)?,
            })
        },
    )
    .map_err(|e| format!("Failed to read command: {e}"))
}

#[tauri::command]
pub fn command_ledger_get(
    id: String,
    db: State<'_, Database>,
) -> Result<CommandEntry, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, bay_id, lane_id, agent_id, terminal_id, command, cwd, env, status, exit_code, started_at, completed_at, duration_ms, stdout_preview, stderr_preview, metadata FROM command_ledger WHERE id = ?1",
        [&id],
        |row| {
            Ok(CommandEntry {
                id: row.get(0)?, bay_id: row.get(1)?, lane_id: row.get(2)?,
                agent_id: row.get(3)?, terminal_id: row.get(4)?, command: row.get(5)?,
                cwd: row.get(6)?, env: row.get(7)?, status: row.get(8)?,
                exit_code: row.get(9)?, started_at: row.get(10)?,
                completed_at: row.get(11)?, duration_ms: row.get(12)?,
                stdout_preview: row.get(13)?, stderr_preview: row.get(14)?,
                metadata: row.get(15)?,
            })
        },
    )
    .map_err(|e| format!("Command not found: {e}"))
}

#[tauri::command]
pub fn command_ledger_query(
    bay_id: String,
    lane_id: Option<String>,
    agent_id: Option<String>,
    status: Option<String>,
    time_from: Option<String>,
    time_to: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
    db: State<'_, Database>,
) -> Result<Vec<CommandEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut sql = String::from(
        "SELECT id, bay_id, lane_id, agent_id, terminal_id, command, cwd, env, status, exit_code, started_at, completed_at, duration_ms, stdout_preview, stderr_preview, metadata FROM command_ledger WHERE bay_id = ?1",
    );
    let mut param_idx = 2;

    if lane_id.is_some() { sql.push_str(&format!(" AND lane_id = ?{param_idx}")); param_idx += 1; }
    if agent_id.is_some() { sql.push_str(&format!(" AND agent_id = ?{param_idx}")); param_idx += 1; }
    if status.is_some() { sql.push_str(&format!(" AND status = ?{param_idx}")); param_idx += 1; }
    if time_from.is_some() { sql.push_str(&format!(" AND started_at >= ?{param_idx}")); param_idx += 1; }
    if time_to.is_some() { sql.push_str(&format!(" AND started_at <= ?{param_idx}")); param_idx += 1; }
    sql.push_str(&format!(" ORDER BY started_at DESC LIMIT ?{param_idx} OFFSET ?{}", param_idx + 1));

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare query: {e}"))?;

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(bay_id)];
    if let Some(ref v) = lane_id { params.push(Box::new(v.clone())); }
    if let Some(ref v) = agent_id { params.push(Box::new(v.clone())); }
    if let Some(ref v) = status { params.push(Box::new(v.clone())); }
    if let Some(ref v) = time_from { params.push(Box::new(v.clone())); }
    if let Some(ref v) = time_to { params.push(Box::new(v.clone())); }
    params.push(Box::new(limit));
    params.push(Box::new(offset));

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let entries = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(CommandEntry {
                id: row.get(0)?, bay_id: row.get(1)?, lane_id: row.get(2)?,
                agent_id: row.get(3)?, terminal_id: row.get(4)?, command: row.get(5)?,
                cwd: row.get(6)?, env: row.get(7)?, status: row.get(8)?,
                exit_code: row.get(9)?, started_at: row.get(10)?,
                completed_at: row.get(11)?, duration_ms: row.get(12)?,
                stdout_preview: row.get(13)?, stderr_preview: row.get(14)?,
                metadata: row.get(15)?,
            })
        })
        .map_err(|e| format!("Failed to query commands: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect commands: {e}"))?;

    Ok(entries)
}

#[tauri::command]
pub async fn command_execute(
    bay_id: String,
    command: String,
    cwd: String,
    lane_id: Option<String>,
    agent_id: Option<String>,
    app: tauri::AppHandle,
    db: State<'_, Database>,
) -> Result<CommandEntry, String> {
    // Step 1: Insert running entry (acquire + release DB lock)
    let id = Uuid::now_v7().to_string();
    let started_at = chrono::Utc::now().to_rfc3339();
    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO command_ledger (id, bay_id, lane_id, agent_id, command, cwd, status, started_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'running', ?7)",
            rusqlite::params![id, bay_id, lane_id, agent_id, command, cwd, started_at],
        )
        .map_err(|e| format!("Failed to insert command: {e}"))?;
    } // DB lock released here

    // Step 2: Execute command (no DB lock held)
    let start = std::time::Instant::now();
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&command)
        .current_dir(&cwd)
        .output()
        .await
        .map_err(|e| format!("Failed to execute command: {e}"))?;

    let duration_ms = start.elapsed().as_millis() as i64;
    let exit_code = output.status.code();
    let status = match exit_code {
        Some(0) => "completed",
        Some(_) => "failed",
        None => "killed",
    };

    // Truncate previews at ~4KB, respecting UTF-8 boundaries
    let stdout_preview = truncate_utf8(&String::from_utf8_lossy(&output.stdout), 4096);
    let stderr_preview = truncate_utf8(&String::from_utf8_lossy(&output.stderr), 4096);
    let completed_at = chrono::Utc::now().to_rfc3339();

    // Step 3: Update ledger + insert event (acquire + release DB lock)
    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE command_ledger SET status = ?1, exit_code = ?2, completed_at = ?3, duration_ms = ?4, stdout_preview = ?5, stderr_preview = ?6 WHERE id = ?7",
            rusqlite::params![status, exit_code, completed_at, duration_ms, stdout_preview, stderr_preview, id],
        )
        .map_err(|e| format!("Failed to update command: {e}"))?;

        // Insert audit event
        let event_id = Uuid::now_v7().to_string();
        let event_now = chrono::Utc::now().to_rfc3339();
        let payload = serde_json::json!({ "commandId": id }).to_string();
        conn.execute(
            "INSERT INTO events (id, bay_id, lane_id, agent_id, type, payload, timestamp)
             VALUES (?1, ?2, ?3, ?4, 'command.executed', ?5, ?6)",
            rusqlite::params![event_id, bay_id, lane_id, agent_id, payload, event_now],
        )
        .map_err(|e| format!("Failed to insert event: {e}"))?;
    } // DB lock released here

    // Step 4: Emit UI refresh event
    let _ = app.emit("command-ledger:updated", &bay_id);

    Ok(CommandEntry {
        id,
        bay_id,
        lane_id,
        agent_id,
        terminal_id: None,
        command,
        cwd,
        env: None,
        status: status.to_string(),
        exit_code,
        started_at,
        completed_at: Some(completed_at),
        duration_ms: Some(duration_ms),
        stdout_preview: if stdout_preview.is_empty() { None } else { Some(stdout_preview) },
        stderr_preview: if stderr_preview.is_empty() { None } else { Some(stderr_preview) },
        metadata: None,
    })
}

fn truncate_utf8(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    s[..end].to_string()
}
