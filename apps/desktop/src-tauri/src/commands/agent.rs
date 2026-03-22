use crate::agent::AgentManager;
use crate::agent::adapter::{SpawnAgentConfig, detect_installed_clis};
use crate::db::Database;
use crate::models::agent_cli::{AgentInfo, AgentStatus, DetectedCli};
use rusqlite;
use tauri::State;

#[tauri::command]
pub async fn agent_spawn(
    config: SpawnAgentConfig,
    app: tauri::AppHandle,
    manager: State<'_, AgentManager>,
    db: State<'_, Database>,
) -> Result<AgentInfo, String> {
    // Resolve the executable path from the config or use default
    let executable = resolve_executable(&config, &db)?;

    // Capture prompt and model before config is moved into the spawn_blocking closure
    let prompt = config.prompt.clone();
    let model = config.model.clone();

    let mgr = manager.inner().clone();
    let info = tokio::task::spawn_blocking(move || mgr.spawn_agent(config, &executable, app))
        .await
        .map_err(|e| format!("Task join error: {e}"))??;

    // Insert agent_sessions row in the database
    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let cli_type_str = info.cli_type.to_string();
        let _ = conn.execute(
            "INSERT INTO agent_sessions (id, bay_id, lane_id, cli_type, prompt, status, model) VALUES (?1, ?2, ?3, ?4, ?5, 'running', ?6)",
            rusqlite::params![info.id, info.bay_id, info.lane_id, cli_type_str, prompt, model],
        );

        // Insert a lifecycle event for agent spawn
        let event_id = uuid::Uuid::now_v7().to_string();
        let payload = serde_json::json!({
            "agentId": info.id,
        })
        .to_string();
        let _ = conn.execute(
            "INSERT INTO events (id, bay_id, lane_id, type, payload) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![event_id, info.bay_id, info.lane_id, "agent.spawned", payload],
        );
    }

    Ok(info)
}

#[tauri::command]
pub async fn agent_send(
    agent_id: String,
    message: String,
    manager: State<'_, AgentManager>,
) -> Result<(), String> {
    let mgr = manager.inner().clone();
    tokio::task::spawn_blocking(move || mgr.send_message(&agent_id, &message))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub fn agent_kill(
    agent_id: String,
    manager: State<'_, AgentManager>,
) -> Result<(), String> {
    manager.kill_agent(&agent_id)
}

#[tauri::command]
pub fn agent_kill_all(
    bay_id: String,
    manager: State<'_, AgentManager>,
) -> Result<(), String> {
    manager.kill_all_for_bay(&bay_id)
}

#[tauri::command]
pub fn agent_list(
    bay_id: String,
    manager: State<'_, AgentManager>,
) -> Result<Vec<AgentInfo>, String> {
    manager.list_agents_for_bay(&bay_id)
}

#[tauri::command]
pub fn agent_status(
    agent_id: String,
    manager: State<'_, AgentManager>,
) -> Result<AgentStatus, String> {
    manager.get_agent_status(&agent_id)
}

#[tauri::command]
pub async fn agent_detect_clis() -> Result<Vec<DetectedCli>, String> {
    tokio::task::spawn_blocking(detect_installed_clis)
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

/// Resolve the executable path: look up the CLI config from DB if possible,
/// otherwise fall back to the CLI type name.
fn resolve_executable(config: &SpawnAgentConfig, db: &Database) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Try to find a default config for this CLI type
    let cli_type_str = config.cli_type.to_string();
    let result: Result<String, _> = conn.query_row(
        "SELECT executable_path FROM agent_cli_configs WHERE cli_type = ?1 AND is_default = 1 LIMIT 1",
        [&cli_type_str],
        |row| row.get(0),
    );

    match result {
        Ok(path) => Ok(path),
        Err(_) => {
            // Fall back to CLI name on PATH
            match config.cli_type {
                crate::models::agent_cli::CliType::ClaudeCode => Ok("claude".to_string()),
                crate::models::agent_cli::CliType::Codex => Ok("codex".to_string()),
            }
        }
    }
}
