use crate::db::Database;
use crate::models::Lane;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn create_lane(
    bay_id: String,
    goal: String,
    db: State<'_, Database>,
) -> Result<Lane, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO lanes (id, bay_id, goal, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'idle', ?4, ?4)",
        rusqlite::params![id, bay_id, goal, now],
    )
    .map_err(|e| format!("Failed to create lane: {e}"))?;

    Ok(Lane {
        id,
        bay_id,
        goal,
        status: "idle".to_string(),
        agent_id: None,
        model_id: None,
        file_scope: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_lanes(bay_id: String, db: State<'_, Database>) -> Result<Vec<Lane>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, bay_id, goal, status, agent_id, model_id, file_scope,
                    created_at, updated_at
             FROM lanes WHERE bay_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let lanes = stmt
        .query_map([&bay_id], |row| {
            Ok(Lane {
                id: row.get(0)?,
                bay_id: row.get(1)?,
                goal: row.get(2)?,
                status: row.get(3)?,
                agent_id: row.get(4)?,
                model_id: row.get(5)?,
                file_scope: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to query lanes: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect lanes: {e}"))?;

    Ok(lanes)
}

#[tauri::command]
pub fn update_lane_status(
    id: String,
    status: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE lanes SET status = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![status, now, id],
    )
    .map_err(|e| format!("Failed to update lane status: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn list_all_lanes(db: State<'_, Database>) -> Result<Vec<Lane>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, bay_id, goal, status, agent_id, model_id, file_scope,
                    created_at, updated_at
             FROM lanes ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let lanes = stmt
        .query_map([], |row| {
            Ok(Lane {
                id: row.get(0)?,
                bay_id: row.get(1)?,
                goal: row.get(2)?,
                status: row.get(3)?,
                agent_id: row.get(4)?,
                model_id: row.get(5)?,
                file_scope: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to query lanes: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect lanes: {e}"))?;

    Ok(lanes)
}
