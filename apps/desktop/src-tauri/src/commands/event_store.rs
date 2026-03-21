use crate::db::Database;
use crate::models::ForgeEvent;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn append_event(
    bay_id: String,
    lane_id: Option<String>,
    task_id: Option<String>,
    agent_id: Option<String>,
    event_type: String,
    payload: String,
    db: State<'_, Database>,
) -> Result<ForgeEvent, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO events (id, bay_id, lane_id, task_id, agent_id, type, payload, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, bay_id, lane_id, task_id, agent_id, event_type, payload, now],
    )
    .map_err(|e| format!("Failed to append event: {e}"))?;

    Ok(ForgeEvent {
        id,
        bay_id,
        lane_id,
        task_id,
        agent_id,
        event_type,
        payload,
        timestamp: now,
    })
}

#[tauri::command]
pub fn query_events(
    bay_id: String,
    lane_id: Option<String>,
    event_type: Option<String>,
    limit: Option<u32>,
    db: State<'_, Database>,
) -> Result<Vec<ForgeEvent>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);

    // Build query dynamically based on filters
    let mut sql = String::from(
        "SELECT id, bay_id, lane_id, task_id, agent_id, type, payload, timestamp FROM events WHERE bay_id = ?1",
    );
    let mut param_idx = 2;

    if lane_id.is_some() {
        sql.push_str(&format!(" AND lane_id = ?{param_idx}"));
        param_idx += 1;
    }
    if event_type.is_some() {
        sql.push_str(&format!(" AND type = ?{param_idx}"));
        param_idx += 1;
    }
    sql.push_str(&format!(" ORDER BY timestamp DESC LIMIT ?{param_idx}"));

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    // Build params vector
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(bay_id)];
    if let Some(ref lid) = lane_id {
        params.push(Box::new(lid.clone()));
    }
    if let Some(ref et) = event_type {
        params.push(Box::new(et.clone()));
    }
    params.push(Box::new(limit));

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params.iter().map(|p| p.as_ref()).collect();

    let events = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(ForgeEvent {
                id: row.get(0)?,
                bay_id: row.get(1)?,
                lane_id: row.get(2)?,
                task_id: row.get(3)?,
                agent_id: row.get(4)?,
                event_type: row.get(5)?,
                payload: row.get(6)?,
                timestamp: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query events: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect events: {e}"))?;

    Ok(events)
}
