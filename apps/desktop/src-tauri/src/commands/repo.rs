use crate::db::Database;
use crate::models::workspace::{AddRepoRequest, Repository};

#[tauri::command]
pub fn repo_add(
    db: tauri::State<'_, Database>,
    request: AddRepoRequest,
) -> Result<Repository, String> {
    let conn = db.conn.lock().unwrap();
    let id = uuid::Uuid::now_v7().to_string();
    let now = super::workspace::chrono_now_pub();

    let sort_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM repositories WHERE workspace_id = ?1",
            [&request.workspace_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get sort order: {e}"))?;

    conn.execute(
        "INSERT INTO repositories (id, workspace_id, owner, name, full_name, github_id, is_private, default_branch, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id,
            request.workspace_id,
            request.owner,
            request.name,
            request.full_name,
            request.github_id,
            request.is_private as i32,
            request.default_branch,
            sort_order,
            now,
        ],
    )
    .map_err(|e| format!("Failed to add repository: {e}"))?;

    Ok(Repository {
        id,
        workspace_id: request.workspace_id,
        owner: request.owner,
        name: request.name,
        full_name: request.full_name,
        local_path: None,
        github_id: request.github_id,
        is_private: request.is_private,
        default_branch: request.default_branch,
        sort_order,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn repo_list(
    db: tauri::State<'_, Database>,
    #[allow(non_snake_case)] workspaceId: String,
) -> Result<Vec<Repository>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, owner, name, full_name, local_path, github_id, is_private, default_branch, sort_order, created_at, updated_at FROM repositories WHERE workspace_id = ?1 ORDER BY sort_order",
        )
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let repos = stmt
        .query_map([&workspaceId], |row| {
            Ok(Repository {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                owner: row.get(2)?,
                name: row.get(3)?,
                full_name: row.get(4)?,
                local_path: row.get(5)?,
                github_id: row.get(6)?,
                is_private: row.get::<_, i32>(7).map(|v| v != 0)?,
                default_branch: row.get(8)?,
                sort_order: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| format!("Failed to query repos: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read repo: {e}"))?;

    Ok(repos)
}

#[tauri::command]
pub fn repo_remove(
    db: tauri::State<'_, Database>,
    id: String,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    let changes = conn
        .execute("DELETE FROM repositories WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to remove repository: {e}"))?;

    if changes == 0 {
        return Err("Repository not found".into());
    }
    Ok(())
}
