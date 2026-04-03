use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedSession {
    pub id: String,
    pub workspace_id: String,
    pub cli_name: String,
    pub display_name: String,
    pub mode: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub agent: Option<String>,
    pub effort: Option<String>,
    pub claude_path: Option<String>,
    pub plan_mode: Option<bool>,
    pub working_directory: Option<String>,
    pub conversation_id: Option<String>,
    pub total_cost: f64,
    pub label: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedMessage {
    pub id: String,
    pub session_id: String,
    pub seq: i64,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub content: String,
    pub reasoning: Option<String>,
    pub message_id: Option<String>,
    pub turn_id: Option<String>,
    pub tool_use_id: Option<String>,
    pub tool_name: Option<String>,
    pub tool_input: Option<String>,
    pub tool_status: Option<String>,
    pub detail: Option<String>,
    pub approval_id: Option<String>,
    pub resolved: Option<bool>,
    pub is_error: Option<bool>,
    pub state: Option<String>,
    pub stream_state: String,
    pub reasoning_state: Option<String>,
    pub images: Option<String>,
    pub timestamp: i64,
}

pub fn save_session(conn: &Connection, session: &PersistedSession) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR REPLACE INTO agent_sessions (
            id, workspace_id, cli_name, display_name, mode, provider, model,
            permission_mode, agent, effort, claude_path, plan_mode,
            working_directory, conversation_id, total_cost, label,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        params![
            session.id,
            session.workspace_id,
            session.cli_name,
            session.display_name,
            session.mode,
            session.provider,
            session.model,
            session.permission_mode,
            session.agent,
            session.effort,
            session.claude_path,
            session.plan_mode.map(|b| b as i32),
            session.working_directory,
            session.conversation_id,
            session.total_cost,
            session.label,
            session.created_at,
            session.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_session_meta(
    conn: &Connection,
    session_id: &str,
    conversation_id: Option<&str>,
    total_cost: Option<f64>,
    model: Option<&str>,
    provider: Option<&str>,
    permission_mode: Option<&str>,
    agent: Option<&str>,
    effort: Option<&str>,
    label: Option<&str>,
) -> Result<(), rusqlite::Error> {
    // Build dynamic SET clause for non-None fields
    let mut sets = vec!["updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(v) = conversation_id {
        sets.push(format!("conversation_id = ?{}", values.len() + 1));
        values.push(Box::new(v.to_string()));
    }
    if let Some(v) = total_cost {
        sets.push(format!("total_cost = ?{}", values.len() + 1));
        values.push(Box::new(v));
    }
    if let Some(v) = model {
        sets.push(format!("model = ?{}", values.len() + 1));
        values.push(Box::new(v.to_string()));
    }
    if let Some(v) = provider {
        sets.push(format!("provider = ?{}", values.len() + 1));
        values.push(Box::new(v.to_string()));
    }
    if let Some(v) = permission_mode {
        sets.push(format!("permission_mode = ?{}", values.len() + 1));
        values.push(Box::new(v.to_string()));
    }
    if let Some(v) = agent {
        sets.push(format!("agent = ?{}", values.len() + 1));
        values.push(Box::new(v.to_string()));
    }
    if let Some(v) = effort {
        sets.push(format!("effort = ?{}", values.len() + 1));
        values.push(Box::new(v.to_string()));
    }
    if let Some(v) = label {
        sets.push(format!("label = ?{}", values.len() + 1));
        values.push(Box::new(v.to_string()));
    }

    let id_param = values.len() + 1;
    values.push(Box::new(session_id.to_string()));

    let sql = format!(
        "UPDATE agent_sessions SET {} WHERE id = ?{}",
        sets.join(", "),
        id_param
    );

    let params: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params.as_slice())?;
    Ok(())
}

pub fn save_messages_batch(
    conn: &Connection,
    messages: &[PersistedMessage],
) -> Result<(), rusqlite::Error> {
    if messages.is_empty() {
        return Ok(());
    }

    let tx = conn.unchecked_transaction()?;
    for msg in messages {
        save_message_inner(&tx, msg)?;
    }
    tx.commit()?;
    Ok(())
}

fn save_message_inner(conn: &Connection, msg: &PersistedMessage) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR REPLACE INTO agent_messages (
            id, session_id, seq, type, content, reasoning, message_id, turn_id,
            tool_use_id, tool_name, tool_input, tool_status, detail,
            approval_id, resolved, is_error, state, stream_state,
            reasoning_state, images, timestamp
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
        params![
            msg.id,
            msg.session_id,
            msg.seq,
            msg.msg_type,
            msg.content,
            msg.reasoning,
            msg.message_id,
            msg.turn_id,
            msg.tool_use_id,
            msg.tool_name,
            msg.tool_input,
            msg.tool_status,
            msg.detail,
            msg.approval_id,
            msg.resolved.map(|b| b as i32),
            msg.is_error.map(|b| b as i32),
            msg.state,
            msg.stream_state,
            msg.reasoning_state,
            msg.images,
            msg.timestamp,
        ],
    )?;
    Ok(())
}

pub fn load_sessions(
    conn: &Connection,
    workspace_id: &str,
) -> Result<Vec<PersistedSession>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, cli_name, display_name, mode, provider, model,
                permission_mode, agent, effort, claude_path, plan_mode,
                working_directory, conversation_id, total_cost, label,
                created_at, updated_at
         FROM agent_sessions
         WHERE workspace_id = ?1
         ORDER BY created_at ASC",
    )?;

    let rows = stmt.query_map(params![workspace_id], |row| {
        let plan_mode_int: Option<i32> = row.get(11)?;
        Ok(PersistedSession {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            cli_name: row.get(2)?,
            display_name: row.get(3)?,
            mode: row.get(4)?,
            provider: row.get(5)?,
            model: row.get(6)?,
            permission_mode: row.get(7)?,
            agent: row.get(8)?,
            effort: row.get(9)?,
            claude_path: row.get(10)?,
            plan_mode: plan_mode_int.map(|v| v != 0),
            working_directory: row.get(12)?,
            conversation_id: row.get(13)?,
            total_cost: row.get(14)?,
            label: row.get(15)?,
            created_at: row.get(16)?,
            updated_at: row.get(17)?,
        })
    })?;

    rows.collect()
}

pub fn load_messages(
    conn: &Connection,
    session_id: &str,
    offset: i64,
    limit: i64,
) -> Result<Vec<PersistedMessage>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, seq, type, content, reasoning, message_id, turn_id,
                tool_use_id, tool_name, tool_input, tool_status, detail,
                approval_id, resolved, is_error, state, stream_state,
                reasoning_state, images, timestamp
         FROM agent_messages
         WHERE session_id = ?1
         ORDER BY seq ASC
         LIMIT ?2 OFFSET ?3",
    )?;

    let rows = stmt.query_map(params![session_id, limit, offset], |row| {
        let resolved_int: Option<i32> = row.get(14)?;
        let is_error_int: Option<i32> = row.get(15)?;
        Ok(PersistedMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            seq: row.get(2)?,
            msg_type: row.get(3)?,
            content: row.get(4)?,
            reasoning: row.get(5)?,
            message_id: row.get(6)?,
            turn_id: row.get(7)?,
            tool_use_id: row.get(8)?,
            tool_name: row.get(9)?,
            tool_input: row.get(10)?,
            tool_status: row.get(11)?,
            detail: row.get(12)?,
            approval_id: row.get(13)?,
            resolved: resolved_int.map(|v| v != 0),
            is_error: is_error_int.map(|v| v != 0),
            state: row.get(16)?,
            stream_state: row.get(17)?,
            reasoning_state: row.get(18)?,
            images: row.get(19)?,
            timestamp: row.get(20)?,
        })
    })?;

    rows.collect()
}

pub fn delete_session(conn: &Connection, session_id: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "DELETE FROM agent_sessions WHERE id = ?1",
        params![session_id],
    )?;
    Ok(())
}
