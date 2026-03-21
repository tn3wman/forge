use crate::db::Database;
use crate::models::Bay;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn create_bay(
    name: String,
    project_path: String,
    db: State<'_, Database>,
) -> Result<Bay, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO bays (id, name, project_path, status, created_at, updated_at, last_accessed_at)
         VALUES (?1, ?2, ?3, 'active', ?4, ?4, ?4)",
        rusqlite::params![id, name, project_path, now],
    )
    .map_err(|e| format!("Failed to create bay: {e}"))?;

    Ok(Bay {
        id,
        name,
        project_path,
        git_branch: None,
        status: "active".to_string(),
        window_state: None,
        created_at: now.clone(),
        updated_at: now.clone(),
        last_accessed_at: now,
    })
}

#[tauri::command]
pub fn list_bays(db: State<'_, Database>) -> Result<Vec<Bay>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, project_path, git_branch, status, window_state,
                    created_at, updated_at, last_accessed_at
             FROM bays ORDER BY last_accessed_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let bays = stmt
        .query_map([], |row| {
            Ok(Bay {
                id: row.get(0)?,
                name: row.get(1)?,
                project_path: row.get(2)?,
                git_branch: row.get(3)?,
                status: row.get(4)?,
                window_state: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                last_accessed_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to query bays: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect bays: {e}"))?;

    Ok(bays)
}

#[tauri::command]
pub fn get_bay(id: String, db: State<'_, Database>) -> Result<Bay, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, project_path, git_branch, status, window_state,
                created_at, updated_at, last_accessed_at
         FROM bays WHERE id = ?1",
        [&id],
        |row| {
            Ok(Bay {
                id: row.get(0)?,
                name: row.get(1)?,
                project_path: row.get(2)?,
                git_branch: row.get(3)?,
                status: row.get(4)?,
                window_state: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                last_accessed_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| format!("Bay not found: {e}"))
}

#[tauri::command]
pub fn delete_bay(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM bays WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete bay: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn open_bay(
    id: String,
    db: State<'_, Database>,
) -> Result<Bay, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE bays SET status = 'active', last_accessed_at = ?2, updated_at = ?2 WHERE id = ?1",
        rusqlite::params![id, now],
    )
    .map_err(|e| format!("Failed to open bay: {e}"))?;

    conn.query_row(
        "SELECT id, name, project_path, git_branch, status, window_state,
                created_at, updated_at, last_accessed_at
         FROM bays WHERE id = ?1",
        [&id],
        |row| {
            Ok(Bay {
                id: row.get(0)?,
                name: row.get(1)?,
                project_path: row.get(2)?,
                git_branch: row.get(3)?,
                status: row.get(4)?,
                window_state: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                last_accessed_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| format!("Bay not found: {e}"))
}

#[tauri::command]
pub fn update_bay_window_state(
    id: String,
    window_state: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE bays SET window_state = ?2, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, window_state, now],
    )
    .map_err(|e| format!("Failed to update window state: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use tempfile::tempdir;

    fn setup_test_db() -> Database {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db = Database::new(&db_path).unwrap();
        db.run_migrations().unwrap();
        db
    }

    #[test]
    fn test_open_bay_updates_status_and_timestamp() {
        let db = setup_test_db();
        let conn = db.conn.lock().unwrap();
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO bays (id, name, project_path, status, created_at, updated_at, last_accessed_at) VALUES (?1, ?2, ?3, 'inactive', ?4, ?4, ?4)",
            rusqlite::params![id, "test", "/tmp/test", now],
        ).unwrap();

        let open_now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE bays SET status = 'active', last_accessed_at = ?2, updated_at = ?2 WHERE id = ?1",
            rusqlite::params![id, open_now],
        ).unwrap();

        let status: String = conn.query_row(
            "SELECT status FROM bays WHERE id = ?1", [&id], |row| row.get(0)
        ).unwrap();
        assert_eq!(status, "active");
    }

    #[test]
    fn test_update_window_state() {
        let db = setup_test_db();
        let conn = db.conn.lock().unwrap();
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO bays (id, name, project_path, status, created_at, updated_at, last_accessed_at) VALUES (?1, ?2, ?3, 'active', ?4, ?4, ?4)",
            rusqlite::params![id, "test", "/tmp/test2", now],
        ).unwrap();

        let state_json = r#"{"leftRailWidth":300,"rightRailWidth":250}"#;
        conn.execute(
            "UPDATE bays SET window_state = ?2, updated_at = ?3 WHERE id = ?1",
            rusqlite::params![id, state_json, chrono::Utc::now().to_rfc3339()],
        ).unwrap();

        let stored: Option<String> = conn.query_row(
            "SELECT window_state FROM bays WHERE id = ?1", [&id], |row| row.get(0)
        ).unwrap();
        assert_eq!(stored.unwrap(), state_json);
    }
}
