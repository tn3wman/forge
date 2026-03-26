use crate::db::Database;
use crate::models::workspace::{CreateWorkspaceRequest, UpdateWorkspaceRequest, Workspace};

#[tauri::command]
pub fn workspace_create(
    db: tauri::State<'_, Database>,
    request: CreateWorkspaceRequest,
) -> Result<Workspace, String> {
    let conn = db.conn.lock().unwrap();
    let id = uuid::Uuid::now_v7().to_string();
    let now = chrono_now();

    // Get next sort order
    let sort_order: i32 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM workspaces", [], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Failed to get sort order: {e}"))?;

    conn.execute(
        "INSERT INTO workspaces (id, name, icon, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        rusqlite::params![id, request.name, request.icon, sort_order, now],
    )
    .map_err(|e| format!("Failed to create workspace: {e}"))?;

    Ok(Workspace {
        id,
        name: request.name,
        icon: request.icon,
        sort_order,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn workspace_list(db: tauri::State<'_, Database>) -> Result<Vec<Workspace>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, icon, sort_order, created_at, updated_at FROM workspaces ORDER BY sort_order")
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let workspaces = stmt
        .query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query workspaces: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read workspace: {e}"))?;

    Ok(workspaces)
}

#[tauri::command]
pub fn workspace_get(
    db: tauri::State<'_, Database>,
    id: String,
) -> Result<Workspace, String> {
    let conn = db.conn.lock().unwrap();
    conn.query_row(
        "SELECT id, name, icon, sort_order, created_at, updated_at FROM workspaces WHERE id = ?1",
        [&id],
        |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| format!("Workspace not found: {e}"))
}

#[tauri::command]
pub fn workspace_update(
    db: tauri::State<'_, Database>,
    id: String,
    request: UpdateWorkspaceRequest,
) -> Result<Workspace, String> {
    let conn = db.conn.lock().unwrap();
    let now = chrono_now();

    if let Some(ref name) = request.name {
        conn.execute(
            "UPDATE workspaces SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, now, id],
        )
        .map_err(|e| format!("Failed to update workspace name: {e}"))?;
    }

    if let Some(ref icon) = request.icon {
        conn.execute(
            "UPDATE workspaces SET icon = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![icon, now, id],
        )
        .map_err(|e| format!("Failed to update workspace icon: {e}"))?;
    }

    // Return the updated workspace
    drop(conn);
    workspace_get(db, id)
}

#[tauri::command]
pub fn workspace_delete(
    db: tauri::State<'_, Database>,
    id: String,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    let changes = conn
        .execute("DELETE FROM workspaces WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete workspace: {e}"))?;

    if changes == 0 {
        return Err("Workspace not found".into());
    }
    Ok(())
}

#[tauri::command]
pub fn workspace_reorder(
    db: tauri::State<'_, Database>,
    ids: Vec<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    let now = chrono_now();

    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE workspaces SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![i as i32, now, id],
        )
        .map_err(|e| format!("Failed to reorder workspace: {e}"))?;
    }
    Ok(())
}

pub(crate) fn chrono_now_pub() -> String {
    chrono_now()
}

fn chrono_now() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap();
    let secs = now.as_secs();
    // Format as ISO 8601 UTC
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let mins = (time_secs % 3600) / 60;
    let s = time_secs % 60;

    // Simple date calculation from epoch days
    let mut y = 1970i64;
    let mut remaining_days = days as i64;
    loop {
        let year_days = if is_leap(y) { 366 } else { 365 };
        if remaining_days < year_days {
            break;
        }
        remaining_days -= year_days;
        y += 1;
    }
    let month_days = if is_leap(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut m = 0;
    for (i, &md) in month_days.iter().enumerate() {
        if remaining_days < md {
            m = i;
            break;
        }
        remaining_days -= md;
    }
    let d = remaining_days + 1;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z",
        y,
        m + 1,
        d,
        hours,
        mins,
        s
    )
}

fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}
