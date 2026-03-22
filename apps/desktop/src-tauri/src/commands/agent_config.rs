use crate::db::Database;
use crate::models::agent_cli::{AgentCliConfig, RoleCliMapping};
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn agent_cli_config_create(
    cli_type: String,
    display_name: String,
    executable_path: String,
    default_model: Option<String>,
    default_allowed_tools: Option<String>,
    is_default: bool,
    db: State<'_, Database>,
) -> Result<AgentCliConfig, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let is_default_int: i32 = if is_default { 1 } else { 0 };

    conn.execute(
        "INSERT INTO agent_cli_configs (id, cli_type, display_name, executable_path, default_model, default_allowed_tools, is_default, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, cli_type, display_name, executable_path, default_model, default_allowed_tools, is_default_int, now, now],
    )
    .map_err(|e| format!("Failed to create agent CLI config: {e}"))?;

    Ok(AgentCliConfig {
        id,
        cli_type,
        display_name,
        executable_path,
        default_model,
        default_allowed_tools,
        is_default,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn agent_cli_config_list(
    db: State<'_, Database>,
) -> Result<Vec<AgentCliConfig>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, cli_type, display_name, executable_path, default_model, default_allowed_tools, is_default, created_at, updated_at FROM agent_cli_configs ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let configs = stmt
        .query_map([], |row| {
            let is_default_int: i32 = row.get(6)?;
            Ok(AgentCliConfig {
                id: row.get(0)?,
                cli_type: row.get(1)?,
                display_name: row.get(2)?,
                executable_path: row.get(3)?,
                default_model: row.get(4)?,
                default_allowed_tools: row.get(5)?,
                is_default: is_default_int != 0,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to query configs: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect configs: {e}"))?;

    Ok(configs)
}

#[tauri::command]
pub fn agent_cli_config_update(
    id: String,
    display_name: Option<String>,
    default_model: Option<String>,
    default_allowed_tools: Option<String>,
    is_default: Option<bool>,
    db: State<'_, Database>,
) -> Result<AgentCliConfig, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(ref name) = display_name {
        conn.execute(
            "UPDATE agent_cli_configs SET display_name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, now, id],
        )
        .map_err(|e| format!("Failed to update display_name: {e}"))?;
    }
    if let Some(ref model) = default_model {
        conn.execute(
            "UPDATE agent_cli_configs SET default_model = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![model, now, id],
        )
        .map_err(|e| format!("Failed to update default_model: {e}"))?;
    }
    if let Some(ref tools) = default_allowed_tools {
        conn.execute(
            "UPDATE agent_cli_configs SET default_allowed_tools = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![tools, now, id],
        )
        .map_err(|e| format!("Failed to update default_allowed_tools: {e}"))?;
    }
    if let Some(is_def) = is_default {
        let val: i32 = if is_def { 1 } else { 0 };
        conn.execute(
            "UPDATE agent_cli_configs SET is_default = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![val, now, id],
        )
        .map_err(|e| format!("Failed to update is_default: {e}"))?;
    }

    conn.query_row(
        "SELECT id, cli_type, display_name, executable_path, default_model, default_allowed_tools, is_default, created_at, updated_at FROM agent_cli_configs WHERE id = ?1",
        [&id],
        |row| {
            let is_default_int: i32 = row.get(6)?;
            Ok(AgentCliConfig {
                id: row.get(0)?,
                cli_type: row.get(1)?,
                display_name: row.get(2)?,
                executable_path: row.get(3)?,
                default_model: row.get(4)?,
                default_allowed_tools: row.get(5)?,
                is_default: is_default_int != 0,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| format!("Config not found: {e}"))
}

#[tauri::command]
pub fn agent_cli_config_delete(
    id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM agent_cli_configs WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete config: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn role_cli_mapping_set(
    role: String,
    cli_config_id: String,
    model_override: Option<String>,
    system_prompt_override: Option<String>,
    allowed_tools_override: Option<String>,
    db: State<'_, Database>,
) -> Result<RoleCliMapping, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO role_cli_mappings (id, role, cli_config_id, model_override, system_prompt_override, allowed_tools_override, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(role) DO UPDATE SET cli_config_id = ?3, model_override = ?4, system_prompt_override = ?5, allowed_tools_override = ?6, updated_at = ?8",
        rusqlite::params![id, role, cli_config_id, model_override, system_prompt_override, allowed_tools_override, now, now],
    )
    .map_err(|e| format!("Failed to set role mapping: {e}"))?;

    conn.query_row(
        "SELECT id, role, cli_config_id, model_override, system_prompt_override, allowed_tools_override, created_at, updated_at FROM role_cli_mappings WHERE role = ?1",
        [&role],
        |row| {
            Ok(RoleCliMapping {
                id: row.get(0)?,
                role: row.get(1)?,
                cli_config_id: row.get(2)?,
                model_override: row.get(3)?,
                system_prompt_override: row.get(4)?,
                allowed_tools_override: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| format!("Failed to read role mapping: {e}"))
}

#[tauri::command]
pub fn role_cli_mapping_list(
    db: State<'_, Database>,
) -> Result<Vec<RoleCliMapping>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, role, cli_config_id, model_override, system_prompt_override, allowed_tools_override, created_at, updated_at FROM role_cli_mappings ORDER BY role")
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let mappings = stmt
        .query_map([], |row| {
            Ok(RoleCliMapping {
                id: row.get(0)?,
                role: row.get(1)?,
                cli_config_id: row.get(2)?,
                model_override: row.get(3)?,
                system_prompt_override: row.get(4)?,
                allowed_tools_override: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query mappings: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect mappings: {e}"))?;

    Ok(mappings)
}

#[tauri::command]
pub fn role_cli_mapping_delete(
    role: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM role_cli_mappings WHERE role = ?1", [&role])
        .map_err(|e| format!("Failed to delete role mapping: {e}"))?;
    Ok(())
}
