# Phase 2: Terminal Grid + Command Ledger — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive terminals (xterm.js + portable-pty) and a command execution ledger to Forge, enabling agent action visibility.

**Architecture:** Rust PTY backend (portable-pty) streams base64-encoded output via scoped Tauri events to xterm.js in a bottom panel. Command Ledger tracks programmatic executions in SQLite with filtered query UI in the right sidebar.

**Tech Stack:** portable-pty, base64 (Rust), @xterm/xterm, @xterm/addon-fit (TypeScript), rusqlite, Tauri v2 IPC + events

**Spec:** `docs/superpowers/specs/2026-03-21-phase2-terminal-command-ledger-design.md`

---

## File Map

### New Rust Files

| File                                                       | Responsibility                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/desktop/src-tauri/src/pty/mod.rs`                    | Module declarations for PTY subsystem                                         |
| `apps/desktop/src-tauri/src/pty/instance.rs`               | `PtyInstance` — wraps one PTY session (spawn, write, resize, kill)            |
| `apps/desktop/src-tauri/src/pty/manager.rs`                | `PtyManager` — HashMap of instances, Tauri managed state                      |
| `apps/desktop/src-tauri/src/commands/pty.rs`               | `#[tauri::command]` handlers for PTY operations                               |
| `apps/desktop/src-tauri/src/commands/command_ledger.rs`    | `#[tauri::command]` handlers for command ledger CRUD + programmatic execution |
| `apps/desktop/src-tauri/src/models/command.rs`             | `CommandEntry` struct                                                         |
| `apps/desktop/src-tauri/migrations/002_command_ledger.sql` | Command ledger table + indexes                                                |

### Modified Rust Files

| File                                         | Change                                           |
| -------------------------------------------- | ------------------------------------------------ |
| `apps/desktop/src-tauri/Cargo.toml`          | Add `portable-pty`, `base64` deps                |
| `apps/desktop/src-tauri/src/lib.rs`          | Register `PtyManager`, add PTY + ledger commands |
| `apps/desktop/src-tauri/src/db.rs`           | Include `002_command_ledger.sql` migration       |
| `apps/desktop/src-tauri/src/commands/mod.rs` | Add `pub mod pty; pub mod command_ledger;`       |
| `apps/desktop/src-tauri/src/models/mod.rs`   | Add `pub mod command;`                           |

### New TypeScript Files

| File                                                                  | Responsibility                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `packages/core/src/types/terminal.ts`                                 | `TerminalInfo`, `PtyDataEvent`, `PtyExitEvent` types    |
| `packages/core/src/types/command.ts`                                  | `CommandEntry`, `CommandStatus`, `CommandFilters` types |
| `apps/desktop/src/ipc/pty.ts`                                         | IPC wrappers for `pty_*` commands                       |
| `apps/desktop/src/ipc/commandLedger.ts`                               | IPC wrappers for `command_ledger_*` commands            |
| `apps/desktop/src/hooks/useTerminal.ts`                               | Manages xterm.js ↔ PTY connection                       |
| `apps/desktop/src/hooks/useTerminalTabs.ts`                           | useReducer for terminal tab state                       |
| `apps/desktop/src/hooks/useCommandLedger.ts`                          | Query + auto-refresh for command history                |
| `apps/desktop/src/hooks/__tests__/useTerminalTabs.test.ts`            | Tests for terminal tab reducer                          |
| `apps/desktop/src/hooks/__tests__/useCommandLedger.test.ts`           | Tests for command ledger hook                           |
| `apps/desktop/src/components/Terminal/TerminalView.tsx`               | xterm.js container + useTerminal                        |
| `apps/desktop/src/components/Terminal/TerminalView.module.css`        | Terminal view styles                                    |
| `apps/desktop/src/components/Terminal/TerminalTabBar.tsx`             | Tab bar for terminals                                   |
| `apps/desktop/src/components/Terminal/TerminalTabBar.module.css`      | Terminal tab bar styles                                 |
| `apps/desktop/src/components/Terminal/TerminalPanel.tsx`              | Bottom panel container                                  |
| `apps/desktop/src/components/Terminal/TerminalPanel.module.css`       | Terminal panel styles                                   |
| `apps/desktop/src/components/Terminal/index.ts`                       | Barrel export                                           |
| `apps/desktop/src/components/CommandLedger/CommandHistory.tsx`        | Right sidebar command list                              |
| `apps/desktop/src/components/CommandLedger/CommandHistory.module.css` | Styles                                                  |
| `apps/desktop/src/components/CommandLedger/CommandFilters.tsx`        | Filter controls                                         |
| `apps/desktop/src/components/CommandLedger/CommandDetail.tsx`         | Expanded command view                                   |
| `apps/desktop/src/components/CommandLedger/CommandDetail.module.css`  | Styles                                                  |
| `apps/desktop/src/components/CommandLedger/index.ts`                  | Barrel export                                           |

### Modified TypeScript Files

| File                                           | Change                                       |
| ---------------------------------------------- | -------------------------------------------- |
| `packages/core/src/types/index.ts`             | Export terminal + command types              |
| `apps/desktop/src/ipc/index.ts`                | Export `ptyIpc` + `commandLedgerIpc`         |
| `apps/desktop/src/screens/Bay/CenterPanel.tsx` | Add bottom TerminalPanel with resize divider |

---

## Task 1: Rust Dependencies + Migration Infrastructure

**Files:**

- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/migrations/002_command_ledger.sql`
- Modify: `apps/desktop/src-tauri/src/db.rs`

- [ ] **Step 1: Add Rust dependencies**

In `apps/desktop/src-tauri/Cargo.toml`, add to `[dependencies]`:

```toml
portable-pty = "0.8"
base64 = "0.22"
```

- [ ] **Step 2: Create command_ledger migration**

Create `apps/desktop/src-tauri/migrations/002_command_ledger.sql`:

```sql
CREATE TABLE IF NOT EXISTS command_ledger (
  id TEXT PRIMARY KEY,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  lane_id TEXT,
  agent_id TEXT,
  terminal_id TEXT,
  command TEXT NOT NULL,
  cwd TEXT NOT NULL,
  env TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  exit_code INTEGER,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  duration_ms INTEGER,
  stdout_preview TEXT,
  stderr_preview TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_command_ledger_bay ON command_ledger(bay_id);
CREATE INDEX IF NOT EXISTS idx_command_ledger_lane ON command_ledger(lane_id);
CREATE INDEX IF NOT EXISTS idx_command_ledger_agent ON command_ledger(agent_id);
CREATE INDEX IF NOT EXISTS idx_command_ledger_status ON command_ledger(status);
CREATE INDEX IF NOT EXISTS idx_command_ledger_time ON command_ledger(started_at);
```

- [ ] **Step 3: Update db.rs to run both migrations**

In `apps/desktop/src-tauri/src/db.rs`, replace `run_migrations`:

```rust
pub fn run_migrations(&self) -> Result<(), rusqlite::Error> {
    let conn = self.conn.lock().unwrap();
    let migration_001 = include_str!("../migrations/001_initial.sql");
    let migration_002 = include_str!("../migrations/002_command_ledger.sql");
    conn.execute_batch(migration_001)?;
    conn.execute_batch(migration_002)?;
    Ok(())
}
```

- [ ] **Step 4: Add migration test**

Add to `db.rs` `#[cfg(test)] mod tests`:

```rust
#[test]
fn test_command_ledger_table_exists() {
    let db = test_db();
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params!["bay-1", "Test", "/tmp/test", "active"],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO command_ledger (id, bay_id, command, cwd) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params!["cmd-1", "bay-1", "echo hello", "/tmp"],
    )
    .unwrap();

    let status: String = conn
        .query_row(
            "SELECT status FROM command_ledger WHERE id = ?1",
            ["cmd-1"],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(status, "running");
}

#[test]
fn test_command_ledger_cascade_delete() {
    let db = test_db();
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params!["bay-1", "Test", "/tmp/test", "active"],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO command_ledger (id, bay_id, command, cwd) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params!["cmd-1", "bay-1", "echo hello", "/tmp"],
    )
    .unwrap();

    conn.execute("DELETE FROM bays WHERE id = 'bay-1'", [])
        .unwrap();

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM command_ledger", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 0);
}
```

- [ ] **Step 5: Run tests**

Run: `cd apps/desktop/src-tauri && cargo test`
Expected: All tests pass including new migration tests.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/migrations/002_command_ledger.sql apps/desktop/src-tauri/src/db.rs
git commit -m "feat: add portable-pty dep and command_ledger migration"
```

---

## Task 2: CommandEntry Model + Command Ledger CRUD Commands

**Files:**

- Create: `apps/desktop/src-tauri/src/models/command.rs`
- Modify: `apps/desktop/src-tauri/src/models/mod.rs`
- Create: `apps/desktop/src-tauri/src/commands/command_ledger.rs`
- Modify: `apps/desktop/src-tauri/src/commands/mod.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: Create CommandEntry model**

Create `apps/desktop/src-tauri/src/models/command.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandEntry {
    pub id: String,
    pub bay_id: String,
    pub lane_id: Option<String>,
    pub agent_id: Option<String>,
    pub terminal_id: Option<String>,
    pub command: String,
    pub cwd: String,
    pub env: Option<String>,
    pub status: String,
    pub exit_code: Option<i32>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub stdout_preview: Option<String>,
    pub stderr_preview: Option<String>,
    pub metadata: Option<String>,
}
```

- [ ] **Step 2: Register model module**

In `apps/desktop/src-tauri/src/models/mod.rs`, add:

```rust
pub mod command;
```

and:

```rust
pub use command::*;
```

- [ ] **Step 3: Write failing test for command_ledger_insert**

Create `apps/desktop/src-tauri/src/commands/command_ledger.rs`:

```rust
use crate::db::Database;
use crate::models::CommandEntry;
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
        id,
        bay_id,
        lane_id,
        agent_id,
        terminal_id,
        command,
        cwd,
        env,
        status: "running".to_string(),
        exit_code: None,
        started_at: now,
        completed_at: None,
        duration_ms: None,
        stdout_preview: None,
        stderr_preview: None,
        metadata: None,
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

    // Read back the full entry
    let entry = conn
        .query_row(
            "SELECT id, bay_id, lane_id, agent_id, terminal_id, command, cwd, env, status, exit_code, started_at, completed_at, duration_ms, stdout_preview, stderr_preview, metadata FROM command_ledger WHERE id = ?1",
            [&id],
            |row| {
                Ok(CommandEntry {
                    id: row.get(0)?,
                    bay_id: row.get(1)?,
                    lane_id: row.get(2)?,
                    agent_id: row.get(3)?,
                    terminal_id: row.get(4)?,
                    command: row.get(5)?,
                    cwd: row.get(6)?,
                    env: row.get(7)?,
                    status: row.get(8)?,
                    exit_code: row.get(9)?,
                    started_at: row.get(10)?,
                    completed_at: row.get(11)?,
                    duration_ms: row.get(12)?,
                    stdout_preview: row.get(13)?,
                    stderr_preview: row.get(14)?,
                    metadata: row.get(15)?,
                })
            },
        )
        .map_err(|e| format!("Failed to read command: {e}"))?;

    Ok(entry)
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
                id: row.get(0)?,
                bay_id: row.get(1)?,
                lane_id: row.get(2)?,
                agent_id: row.get(3)?,
                terminal_id: row.get(4)?,
                command: row.get(5)?,
                cwd: row.get(6)?,
                env: row.get(7)?,
                status: row.get(8)?,
                exit_code: row.get(9)?,
                started_at: row.get(10)?,
                completed_at: row.get(11)?,
                duration_ms: row.get(12)?,
                stdout_preview: row.get(13)?,
                stderr_preview: row.get(14)?,
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

    if lane_id.is_some() {
        sql.push_str(&format!(" AND lane_id = ?{param_idx}"));
        param_idx += 1;
    }
    if agent_id.is_some() {
        sql.push_str(&format!(" AND agent_id = ?{param_idx}"));
        param_idx += 1;
    }
    if status.is_some() {
        sql.push_str(&format!(" AND status = ?{param_idx}"));
        param_idx += 1;
    }
    if time_from.is_some() {
        sql.push_str(&format!(" AND started_at >= ?{param_idx}"));
        param_idx += 1;
    }
    if time_to.is_some() {
        sql.push_str(&format!(" AND started_at <= ?{param_idx}"));
        param_idx += 1;
    }
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
                id: row.get(0)?,
                bay_id: row.get(1)?,
                lane_id: row.get(2)?,
                agent_id: row.get(3)?,
                terminal_id: row.get(4)?,
                command: row.get(5)?,
                cwd: row.get(6)?,
                env: row.get(7)?,
                status: row.get(8)?,
                exit_code: row.get(9)?,
                started_at: row.get(10)?,
                completed_at: row.get(11)?,
                duration_ms: row.get(12)?,
                stdout_preview: row.get(13)?,
                stderr_preview: row.get(14)?,
                metadata: row.get(15)?,
            })
        })
        .map_err(|e| format!("Failed to query commands: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect commands: {e}"))?;

    Ok(entries)
}
```

- [ ] **Step 4: Register command_ledger module and commands**

In `apps/desktop/src-tauri/src/commands/mod.rs`, add:

```rust
pub mod command_ledger;
```

and:

```rust
pub use command_ledger::*;
```

In `apps/desktop/src-tauri/src/lib.rs`, add to the `invoke_handler` list:

```rust
commands::command_ledger_insert,
commands::command_ledger_complete,
commands::command_ledger_get,
commands::command_ledger_query,
```

- [ ] **Step 5: Run tests**

Run: `cd apps/desktop/src-tauri && cargo test`
Expected: All tests pass. Compile succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src-tauri/src/models/command.rs apps/desktop/src-tauri/src/models/mod.rs apps/desktop/src-tauri/src/commands/command_ledger.rs apps/desktop/src-tauri/src/commands/mod.rs apps/desktop/src-tauri/src/lib.rs
git commit -m "feat: add command ledger CRUD commands"
```

---

## Task 3: Programmatic Command Execution (`command_execute`)

**Files:**

- Modify: `apps/desktop/src-tauri/src/commands/command_ledger.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: Add command_execute to command_ledger.rs**

Append to `apps/desktop/src-tauri/src/commands/command_ledger.rs`:

```rust
use tauri::Emitter;

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
    // Find the last valid UTF-8 boundary at or before max_bytes
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    s[..end].to_string()
}
```

- [ ] **Step 2: Register command_execute in lib.rs**

Add `commands::command_execute,` to the invoke_handler list.

- [ ] **Step 3: Run tests**

Run: `cd apps/desktop/src-tauri && cargo test`
Expected: All tests pass. Compile succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src-tauri/src/commands/command_ledger.rs apps/desktop/src-tauri/src/lib.rs
git commit -m "feat: add programmatic command execution with ledger tracking"
```

---

## Task 4: PTY Backend (PtyInstance + PtyManager + Commands)

**Files:**

- Create: `apps/desktop/src-tauri/src/pty/mod.rs`
- Create: `apps/desktop/src-tauri/src/pty/instance.rs`
- Create: `apps/desktop/src-tauri/src/pty/manager.rs`
- Create: `apps/desktop/src-tauri/src/commands/pty.rs`
- Modify: `apps/desktop/src-tauri/src/commands/mod.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: Create pty/mod.rs**

Create `apps/desktop/src-tauri/src/pty/mod.rs`:

```rust
pub mod instance;
pub mod manager;

pub use manager::PtyManager;
```

- [ ] **Step 2: Create PtyInstance**

Create `apps/desktop/src-tauri/src/pty/instance.rs`:

```rust
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
    pub data: String, // base64-encoded
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

        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(size)
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(&cwd);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {e}"))?;

        // Drop the slave — we only use the master side
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get writer: {e}"))?;
        let writer = Arc::new(std::sync::Mutex::new(writer));

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get reader: {e}"))?;

        let child = Arc::new(std::sync::Mutex::new(child));

        // Start reader task — blocking read loop in a spawn_blocking task.
        // When the child process is killed, the reader gets EOF and exits naturally.
        let terminal_id = id.clone();
        let app = app_handle.clone();
        let child_for_exit = Arc::clone(&child);

        tokio::task::spawn_blocking(move || {
            let mut buf = [0u8; 4096];
            let engine = base64::engine::general_purpose::STANDARD;

            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break, // EOF — child exited or PTY closed
                    Ok(n) => {
                        let encoded = engine.encode(&buf[..n]);
                        let event = PtyDataEvent {
                            terminal_id: terminal_id.clone(),
                            data: encoded,
                        };
                        let event_name = format!("pty:data:{}", terminal_id);
                        let _ = app.emit(&event_name, &event);
                    }
                    Err(e) => {
                        eprintln!("PTY reader error: {e}");
                        break;
                    }
                }
            }

            // Emit exit event
            let exit_code = child_for_exit
                .lock()
                .ok()
                .and_then(|mut c| c.try_wait().ok().flatten())
                .and_then(|s| s.exit_code().map(|c| c as i32));

            let exit_event = PtyExitEvent {
                terminal_id: terminal_id.clone(),
                exit_code,
            };
            let event_name = format!("pty:exit:{}", terminal_id);
            let _ = app.emit(&event_name, &exit_event);
        });

        Ok(PtyInstance {
            id,
            bay_id,
            label,
            writer,
            master: pair.master,
            child,
        })
    }

    pub fn write(&self, data: &str) -> Result<(), String> {
        let mut writer = self.writer.lock().map_err(|e| e.to_string())?;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {e}"))?;
        writer.flush().map_err(|e| format!("Failed to flush PTY: {e}"))?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        self.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {e}"))
    }

    pub fn kill(&mut self) -> Result<(), String> {
        // Killing the child causes the PTY reader to get EOF and exit naturally
        let mut child = self.child.lock().map_err(|e| e.to_string())?;
        child.kill().map_err(|e| format!("Failed to kill PTY: {e}"))
    }
}
```

- [ ] **Step 3: Create PtyManager**

Create `apps/desktop/src-tauri/src/pty/manager.rs`:

```rust
use super::instance::{PtyInstance, TerminalInfo};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct PtyManager {
    instances: Arc<Mutex<HashMap<String, PtyInstance>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        PtyManager {
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn_terminal(
        &self,
        bay_id: String,
        cwd: String,
        cols: u16,
        rows: u16,
        label: Option<String>,
        app_handle: tauri::AppHandle,
    ) -> Result<TerminalInfo, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let label = label.unwrap_or_else(|| "Terminal".to_string());

        let instance = PtyInstance::spawn(
            id.clone(),
            bay_id.clone(),
            label.clone(),
            cwd,
            cols,
            rows,
            app_handle,
        )?;

        let info = TerminalInfo {
            id: instance.id.clone(),
            bay_id: instance.bay_id.clone(),
            label: instance.label.clone(),
        };

        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        instances.insert(id, instance);

        Ok(info)
    }

    pub fn write_to_terminal(&self, terminal_id: &str, data: &str) -> Result<(), String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        let instance = instances
            .get(terminal_id)
            .ok_or_else(|| format!("Terminal not found: {terminal_id}"))?;
        instance.write(data)
    }

    pub fn resize_terminal(&self, terminal_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        let instance = instances
            .get(terminal_id)
            .ok_or_else(|| format!("Terminal not found: {terminal_id}"))?;
        instance.resize(cols, rows)
    }

    pub fn kill_terminal(&self, terminal_id: &str) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        let mut instance = instances
            .remove(terminal_id)
            .ok_or_else(|| format!("Terminal not found: {terminal_id}"))?;
        instance.kill()
    }

    pub fn kill_all_for_bay(&self, bay_id: &str) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        let ids_to_remove: Vec<String> = instances
            .iter()
            .filter(|(_, inst)| inst.bay_id == bay_id)
            .map(|(id, _)| id.clone())
            .collect();

        for id in ids_to_remove {
            if let Some(mut instance) = instances.remove(&id) {
                let _ = instance.kill();
            }
        }
        Ok(())
    }

    pub fn rename_terminal(&self, terminal_id: &str, label: String) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        let instance = instances
            .get_mut(terminal_id)
            .ok_or_else(|| format!("Terminal not found: {terminal_id}"))?;
        instance.label = label;
        Ok(())
    }

    pub fn list_terminals_for_bay(&self, bay_id: &str) -> Result<Vec<TerminalInfo>, String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        Ok(instances
            .values()
            .filter(|inst| inst.bay_id == bay_id)
            .map(|inst| TerminalInfo {
                id: inst.id.clone(),
                bay_id: inst.bay_id.clone(),
                label: inst.label.clone(),
            })
            .collect())
    }
}
```

- [ ] **Step 4: Create PTY Tauri commands**

Create `apps/desktop/src-tauri/src/commands/pty.rs`:

```rust
use crate::pty::instance::TerminalInfo;
use crate::pty::PtyManager;
use tauri::State;

#[tauri::command]
pub fn pty_spawn(
    bay_id: String,
    cwd: String,
    cols: u16,
    rows: u16,
    label: Option<String>,
    app: tauri::AppHandle,
    state: State<'_, PtyManager>,
) -> Result<TerminalInfo, String> {
    state.spawn_terminal(bay_id, cwd, cols, rows, label, app)
}

#[tauri::command]
pub async fn pty_write(
    terminal_id: String,
    data: String,
    state: State<'_, PtyManager>,
) -> Result<(), String> {
    // portable-pty write is blocking FFI — must not block tokio runtime
    let manager = state.inner().clone();
    tokio::task::spawn_blocking(move || manager.write_to_terminal(&terminal_id, &data))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn pty_resize(
    terminal_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, PtyManager>,
) -> Result<(), String> {
    // portable-pty resize is blocking FFI — must not block tokio runtime
    let manager = state.inner().clone();
    tokio::task::spawn_blocking(move || manager.resize_terminal(&terminal_id, cols, rows))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub fn pty_kill(
    terminal_id: String,
    state: State<'_, PtyManager>,
) -> Result<(), String> {
    state.kill_terminal(&terminal_id)
}

#[tauri::command]
pub fn pty_kill_all(
    bay_id: String,
    state: State<'_, PtyManager>,
) -> Result<(), String> {
    state.kill_all_for_bay(&bay_id)
}

#[tauri::command]
pub fn pty_rename(
    terminal_id: String,
    label: String,
    state: State<'_, PtyManager>,
) -> Result<(), String> {
    state.rename_terminal(&terminal_id, label)
}

#[tauri::command]
pub fn pty_list(
    bay_id: String,
    state: State<'_, PtyManager>,
) -> Result<Vec<TerminalInfo>, String> {
    state.list_terminals_for_bay(&bay_id)
}
```

- [ ] **Step 5: Register PTY module and commands**

In `apps/desktop/src-tauri/src/lib.rs`, add at the top:

```rust
mod pty;
```

In the `setup` closure, add:

```rust
app.manage(pty::PtyManager::new());
```

In `commands/mod.rs`, add:

```rust
pub mod pty;
pub use pty::*;
```

In `lib.rs` invoke_handler, add:

```rust
commands::pty_spawn,
commands::pty_write,
commands::pty_resize,
commands::pty_kill,
commands::pty_kill_all,
commands::pty_rename,
commands::pty_list,
```

- [ ] **Step 6: Run tests and verify compilation**

Run: `cd apps/desktop/src-tauri && cargo test`
Expected: All tests pass. Compile succeeds with new PTY dependencies.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src-tauri/src/pty/ apps/desktop/src-tauri/src/commands/pty.rs apps/desktop/src-tauri/src/commands/mod.rs apps/desktop/src-tauri/src/lib.rs
git commit -m "feat: add PTY backend with portable-pty integration"
```

---

## Task 5: TypeScript Core Types + IPC Wrappers

**Files:**

- Create: `packages/core/src/types/terminal.ts`
- Create: `packages/core/src/types/command.ts`
- Modify: `packages/core/src/types/index.ts`
- Create: `apps/desktop/src/ipc/pty.ts`
- Create: `apps/desktop/src/ipc/commandLedger.ts`
- Modify: `apps/desktop/src/ipc/index.ts`

- [ ] **Step 1: Create terminal types**

Create `packages/core/src/types/terminal.ts`:

```typescript
export interface TerminalInfo {
  id: string;
  bayId: string;
  label: string;
}

export interface TerminalTab {
  id: string;
  label: string;
  isExited: boolean;
  exitCode: number | null;
}

export interface PtyDataEvent {
  terminalId: string;
  data: string; // base64-encoded
}

export interface PtyExitEvent {
  terminalId: string;
  exitCode: number | null;
}
```

- [ ] **Step 2: Create command types**

Create `packages/core/src/types/command.ts`:

```typescript
export type CommandStatus = 'running' | 'completed' | 'failed' | 'killed';

export interface CommandEntry {
  id: string;
  bayId: string;
  laneId: string | null;
  agentId: string | null;
  terminalId: string | null;
  command: string;
  cwd: string;
  env: string | null;
  status: CommandStatus;
  exitCode: number | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  stdoutPreview: string | null;
  stderrPreview: string | null;
  metadata: string | null;
}

export interface CommandFilters {
  laneId?: string;
  agentId?: string;
  status?: CommandStatus;
  timeFrom?: string;
  timeTo?: string;
  limit?: number;
  offset?: number;
}
```

- [ ] **Step 3: Export new types**

In `packages/core/src/types/index.ts`, add:

```typescript
export * from './terminal';
export * from './command';
```

- [ ] **Step 4: Create pty IPC wrapper**

Create `apps/desktop/src/ipc/pty.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { TerminalInfo } from '@forge/core';

export const ptyIpc = {
  spawn: (
    bayId: string,
    cwd: string,
    cols: number,
    rows: number,
    label?: string,
  ): Promise<TerminalInfo> => invoke('pty_spawn', { bayId, cwd, cols, rows, label }),

  write: (terminalId: string, data: string): Promise<void> =>
    invoke('pty_write', { terminalId, data }),

  resize: (terminalId: string, cols: number, rows: number): Promise<void> =>
    invoke('pty_resize', { terminalId, cols, rows }),

  kill: (terminalId: string): Promise<void> => invoke('pty_kill', { terminalId }),

  killAll: (bayId: string): Promise<void> => invoke('pty_kill_all', { bayId }),

  rename: (terminalId: string, label: string): Promise<void> =>
    invoke('pty_rename', { terminalId, label }),

  list: (bayId: string): Promise<TerminalInfo[]> => invoke('pty_list', { bayId }),
};
```

- [ ] **Step 5: Create commandLedger IPC wrapper**

Create `apps/desktop/src/ipc/commandLedger.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { CommandEntry, CommandFilters } from '@forge/core';

export const commandLedgerIpc = {
  insert: (params: {
    bayId: string;
    command: string;
    cwd: string;
    laneId?: string;
    agentId?: string;
    terminalId?: string;
    env?: string;
  }): Promise<CommandEntry> => invoke('command_ledger_insert', params),

  complete: (params: {
    id: string;
    exitCode?: number;
    durationMs?: number;
    stdoutPreview?: string;
    stderrPreview?: string;
  }): Promise<CommandEntry> => invoke('command_ledger_complete', params),

  query: (bayId: string, filters?: CommandFilters): Promise<CommandEntry[]> =>
    invoke('command_ledger_query', { bayId, ...filters }),

  get: (id: string): Promise<CommandEntry> => invoke('command_ledger_get', { id }),

  execute: (params: {
    bayId: string;
    command: string;
    cwd: string;
    laneId?: string;
    agentId?: string;
  }): Promise<CommandEntry> => invoke('command_execute', params),
};
```

- [ ] **Step 6: Export new IPC wrappers**

In `apps/desktop/src/ipc/index.ts`, add:

```typescript
export { ptyIpc } from './pty';
export { commandLedgerIpc } from './commandLedger';
```

- [ ] **Step 7: Run TypeScript type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/types/terminal.ts packages/core/src/types/command.ts packages/core/src/types/index.ts apps/desktop/src/ipc/pty.ts apps/desktop/src/ipc/commandLedger.ts apps/desktop/src/ipc/index.ts
git commit -m "feat: add TypeScript types and IPC wrappers for PTY and command ledger"
```

---

## Task 6: useTerminalTabs Hook (with TDD)

**Files:**

- Create: `apps/desktop/src/hooks/__tests__/useTerminalTabs.test.ts`
- Create: `apps/desktop/src/hooks/useTerminalTabs.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/desktop/src/hooks/__tests__/useTerminalTabs.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { terminalTabsReducer, useTerminalTabs } from '../useTerminalTabs';
import type { TerminalTab } from '@forge/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

function makeTab(id: string, label = 'Terminal'): TerminalTab {
  return { id, label, isExited: false, exitCode: null };
}

describe('terminalTabsReducer', () => {
  const empty = { tabs: [] as TerminalTab[], activeTabId: null };

  it('ADD_TAB adds a tab and makes it active', () => {
    const tab = makeTab('t1');
    const result = terminalTabsReducer(empty, { type: 'ADD_TAB', tab });
    expect(result.tabs).toEqual([tab]);
    expect(result.activeTabId).toBe('t1');
  });

  it('ADD_TAB appends to existing tabs', () => {
    const state = { tabs: [makeTab('t1')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, { type: 'ADD_TAB', tab: makeTab('t2') });
    expect(result.tabs).toHaveLength(2);
    expect(result.activeTabId).toBe('t2');
  });

  it('REMOVE_TAB removes tab and selects next', () => {
    const state = {
      tabs: [makeTab('t1'), makeTab('t2'), makeTab('t3')],
      activeTabId: 't2',
    };
    const result = terminalTabsReducer(state, { type: 'REMOVE_TAB', tabId: 't2' });
    expect(result.tabs).toHaveLength(2);
    expect(result.activeTabId).toBe('t3');
  });

  it('REMOVE_TAB selects previous when removing last', () => {
    const state = {
      tabs: [makeTab('t1'), makeTab('t2')],
      activeTabId: 't2',
    };
    const result = terminalTabsReducer(state, { type: 'REMOVE_TAB', tabId: 't2' });
    expect(result.tabs).toHaveLength(1);
    expect(result.activeTabId).toBe('t1');
  });

  it('REMOVE_TAB last tab leaves empty', () => {
    const state = { tabs: [makeTab('t1')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, { type: 'REMOVE_TAB', tabId: 't1' });
    expect(result.tabs).toHaveLength(0);
    expect(result.activeTabId).toBeNull();
  });

  it('SELECT_TAB changes active', () => {
    const state = {
      tabs: [makeTab('t1'), makeTab('t2')],
      activeTabId: 't1',
    };
    const result = terminalTabsReducer(state, { type: 'SELECT_TAB', tabId: 't2' });
    expect(result.activeTabId).toBe('t2');
  });

  it('RENAME_TAB updates label', () => {
    const state = { tabs: [makeTab('t1', 'Old')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, {
      type: 'RENAME_TAB',
      tabId: 't1',
      label: 'New',
    });
    expect(result.tabs[0].label).toBe('New');
  });

  it('MARK_EXITED sets exit state', () => {
    const state = { tabs: [makeTab('t1')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, {
      type: 'MARK_EXITED',
      tabId: 't1',
      exitCode: 0,
    });
    expect(result.tabs[0].isExited).toBe(true);
    expect(result.tabs[0].exitCode).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/desktop && pnpm test -- --run useTerminalTabs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement useTerminalTabs**

Create `apps/desktop/src/hooks/useTerminalTabs.ts`:

```typescript
import { useReducer, useCallback } from 'react';
import type { TerminalTab } from '@forge/core';
import { ptyIpc } from '../ipc/pty';

// --- State ---

export interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
}

// --- Actions ---

type TerminalTabAction =
  | { type: 'ADD_TAB'; tab: TerminalTab }
  | { type: 'REMOVE_TAB'; tabId: string }
  | { type: 'SELECT_TAB'; tabId: string }
  | { type: 'RENAME_TAB'; tabId: string; label: string }
  | { type: 'MARK_EXITED'; tabId: string; exitCode: number | null }
  | { type: 'SET_TABS'; tabs: TerminalTab[] };

// --- Reducer ---

export function terminalTabsReducer(
  state: TerminalTabsState,
  action: TerminalTabAction,
): TerminalTabsState {
  switch (action.type) {
    case 'ADD_TAB':
      return {
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };

    case 'REMOVE_TAB': {
      const idx = state.tabs.findIndex((t) => t.id === action.tabId);
      const next = state.tabs.filter((t) => t.id !== action.tabId);
      let nextActive = state.activeTabId;
      if (state.activeTabId === action.tabId) {
        nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null;
      }
      return { tabs: next, activeTabId: nextActive };
    }

    case 'SELECT_TAB':
      return { ...state, activeTabId: action.tabId };

    case 'RENAME_TAB':
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === action.tabId ? { ...t, label: action.label } : t)),
      };

    case 'MARK_EXITED':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, isExited: true, exitCode: action.exitCode } : t,
        ),
      };

    case 'SET_TABS':
      return {
        tabs: action.tabs,
        activeTabId: action.tabs[0]?.id ?? null,
      };

    default:
      return state;
  }
}

// --- Hook ---

export function useTerminalTabs(bayId: string) {
  const [state, dispatch] = useReducer(terminalTabsReducer, {
    tabs: [],
    activeTabId: null,
  });

  const addTab = useCallback(
    async (cwd: string, cols: number, rows: number) => {
      const info = await ptyIpc.spawn(bayId, cwd, cols, rows);
      dispatch({
        type: 'ADD_TAB',
        tab: { id: info.id, label: info.label, isExited: false, exitCode: null },
      });
      return info;
    },
    [bayId],
  );

  const removeTab = useCallback(async (tabId: string) => {
    await ptyIpc.kill(tabId).catch(() => {}); // may already be exited
    dispatch({ type: 'REMOVE_TAB', tabId });
  }, []);

  const selectTab = useCallback((tabId: string) => dispatch({ type: 'SELECT_TAB', tabId }), []);

  const renameTab = useCallback(async (tabId: string, label: string) => {
    await ptyIpc.rename(tabId, label);
    dispatch({ type: 'RENAME_TAB', tabId, label });
  }, []);

  const markExited = useCallback(
    (tabId: string, exitCode: number | null) => dispatch({ type: 'MARK_EXITED', tabId, exitCode }),
    [],
  );

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    addTab,
    removeTab,
    selectTab,
    renameTab,
    markExited,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/desktop && pnpm test -- --run useTerminalTabs`
Expected: All 8 reducer tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/hooks/useTerminalTabs.ts apps/desktop/src/hooks/__tests__/useTerminalTabs.test.ts
git commit -m "feat: add useTerminalTabs hook with reducer and tests"
```

---

## Task 7: useTerminal Hook

**Files:**

- Create: `apps/desktop/src/hooks/useTerminal.ts`

- [ ] **Step 1: Install xterm.js dependencies**

Run: `cd apps/desktop && pnpm add @xterm/xterm @xterm/addon-fit`

- [ ] **Step 2: Create useTerminal hook**

Create `apps/desktop/src/hooks/useTerminal.ts`:

```typescript
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { listen } from '@tauri-apps/api/event';
import { ptyIpc } from '../ipc/pty';
import type { PtyDataEvent, PtyExitEvent } from '@forge/core';

export function useTerminal(
  terminalId: string | null,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [isExited, setIsExited] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    if (!terminalId || !containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // User input → PTY
    const onDataDisposable = term.onData((data) => {
      ptyIpc.write(terminalId, data);
    });

    // Resize → PTY (debounced)
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ptyIpc.resize(terminalId, cols, rows);
      }, 100);
    });

    // PTY output → Terminal (base64 decode)
    const dataEventName = `pty:data:${terminalId}`;
    const dataUnlisten = listen<PtyDataEvent>(dataEventName, (event) => {
      const bytes = Uint8Array.from(atob(event.payload.data), (c) => c.charCodeAt(0));
      term.write(bytes);
    });

    // PTY exit
    const exitEventName = `pty:exit:${terminalId}`;
    const exitUnlisten = listen<PtyExitEvent>(exitEventName, (event) => {
      setIsExited(true);
      setExitCode(event.payload.exitCode);
    });

    // ResizeObserver for container
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitAddon.fit();
      }, 100);
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      dataUnlisten.then((fn) => fn());
      exitUnlisten.then((fn) => fn());
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [terminalId, containerRef]);

  return { terminal: termRef.current, isExited, exitCode };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/hooks/useTerminal.ts apps/desktop/package.json pnpm-lock.yaml
git commit -m "feat: add useTerminal hook with xterm.js integration"
```

---

## Task 8: useCommandLedger Hook (with TDD)

**Files:**

- Create: `apps/desktop/src/hooks/__tests__/useCommandLedger.test.ts`
- Create: `apps/desktop/src/hooks/useCommandLedger.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/desktop/src/hooks/__tests__/useCommandLedger.test.ts`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCommandLedger } from '../useCommandLedger';
import type { CommandEntry } from '@forge/core';

const mockQuery = vi.fn();
const mockListen = vi.fn(() => Promise.resolve(() => {}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

const mockCommand: CommandEntry = {
  id: 'cmd-1',
  bayId: 'bay-1',
  laneId: null,
  agentId: null,
  terminalId: null,
  command: 'echo hello',
  cwd: '/tmp',
  env: null,
  status: 'completed',
  exitCode: 0,
  startedAt: '2026-03-21T00:00:00Z',
  completedAt: '2026-03-21T00:00:01Z',
  durationMs: 1000,
  stdoutPreview: 'hello\n',
  stderrPreview: null,
  metadata: null,
};

describe('useCommandLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue([mockCommand]);
  });

  it('loads commands on mount', async () => {
    const { result } = renderHook(() => useCommandLedger('bay-1'));

    await waitFor(() => {
      expect(result.current.commands).toEqual([mockCommand]);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('passes filters to query', async () => {
    renderHook(() => useCommandLedger('bay-1', { status: 'completed' }));

    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith('command_ledger_query', {
        bayId: 'bay-1',
        status: 'completed',
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/desktop && pnpm test -- --run useCommandLedger`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement useCommandLedger**

Create `apps/desktop/src/hooks/useCommandLedger.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { commandLedgerIpc } from '../ipc/commandLedger';
import type { CommandEntry, CommandFilters } from '@forge/core';

export function useCommandLedger(bayId: string, initialFilters?: CommandFilters) {
  const [commands, setCommands] = useState<CommandEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CommandFilters>(initialFilters ?? {});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchCommands = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await commandLedgerIpc.query(bayId, filters);
      setCommands(result);
    } catch (err) {
      console.error('Failed to query commands:', err);
    } finally {
      setIsLoading(false);
    }
  }, [bayId, filters]);

  // Initial load + reload on filter change
  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  // Auto-refresh on ledger updates (debounced)
  useEffect(() => {
    const unlisten = listen<string>('command-ledger:updated', (event) => {
      if (event.payload === bayId) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchCommands, 200);
      }
    });

    return () => {
      clearTimeout(debounceRef.current);
      unlisten.then((fn) => fn());
    };
  }, [bayId, fetchCommands]);

  return { commands, isLoading, refresh: fetchCommands, filters, setFilters };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/desktop && pnpm test -- --run useCommandLedger`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/hooks/useCommandLedger.ts apps/desktop/src/hooks/__tests__/useCommandLedger.test.ts
git commit -m "feat: add useCommandLedger hook with auto-refresh and tests"
```

---

## Task 9: Terminal UI Components

**Files:**

- Create: `apps/desktop/src/components/Terminal/TerminalView.tsx`
- Create: `apps/desktop/src/components/Terminal/TerminalView.module.css`
- Create: `apps/desktop/src/components/Terminal/TerminalTabBar.tsx`
- Create: `apps/desktop/src/components/Terminal/TerminalTabBar.module.css`
- Create: `apps/desktop/src/components/Terminal/TerminalPanel.tsx`
- Create: `apps/desktop/src/components/Terminal/TerminalPanel.module.css`
- Create: `apps/desktop/src/components/Terminal/index.ts`

- [ ] **Step 1: Create TerminalView**

Create `apps/desktop/src/components/Terminal/TerminalView.tsx`:

```typescript
import { useRef } from 'react';
import { useTerminal } from '../../hooks/useTerminal';
import '@xterm/xterm/css/xterm.css';
import styles from './TerminalView.module.css';

interface Props {
  terminalId: string;
  isVisible: boolean;
}

export function TerminalView({ terminalId, isVisible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(terminalId, containerRef);

  return (
    <div
      ref={containerRef}
      className={styles.terminalView}
      style={{ display: isVisible ? 'block' : 'none' }}
    />
  );
}
```

Create `apps/desktop/src/components/Terminal/TerminalView.module.css`:

```css
.terminalView {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

- [ ] **Step 2: Create TerminalTabBar**

Create `apps/desktop/src/components/Terminal/TerminalTabBar.tsx`:

```typescript
import { useState } from 'react';
import type { TerminalTab } from '@forge/core';
import styles from './TerminalTabBar.module.css';

interface Props {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onRename: (tabId: string, label: string) => void;
  onAdd: () => void;
}

export function TerminalTabBar({ tabs, activeTabId, onSelect, onClose, onRename, onAdd }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startRename = (tab: TerminalTab) => {
    setEditingId(tab.id);
    setEditValue(tab.label);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
          onClick={() => onSelect(tab.id)}
          onDoubleClick={() => startRename(tab)}
        >
          {tab.isExited && (
            <span className={styles.exitBadge} title={`Exit: ${tab.exitCode ?? 'signal'}`}>
              {tab.exitCode === 0 ? '\u2713' : '\u2717'}
            </span>
          )}
          {editingId === tab.id ? (
            <input
              className={styles.renameInput}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={styles.label}>{tab.label}</span>
          )}
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
          >
            \u00d7
          </button>
        </div>
      ))}
      <button className={styles.addBtn} onClick={onAdd} title="New Terminal">
        +
      </button>
    </div>
  );
}
```

Create `apps/desktop/src/components/Terminal/TerminalTabBar.module.css`:

```css
.tabBar {
  display: flex;
  align-items: center;
  height: 32px;
  background: var(--bg-secondary, #1e1e2e);
  border-bottom: 1px solid var(--border, #313244);
  padding: 0 4px;
  gap: 2px;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary, #a6adc8);
  white-space: nowrap;
}

.tab:hover {
  background: var(--bg-hover, #313244);
}

.tab.active {
  background: var(--bg-active, #45475a);
  color: var(--text-primary, #cdd6f4);
}

.label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exitBadge {
  font-size: 10px;
}

.closeBtn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0 2px;
  font-size: 14px;
  opacity: 0.5;
}

.closeBtn:hover {
  opacity: 1;
}

.addBtn {
  background: none;
  border: none;
  color: var(--text-secondary, #a6adc8);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
}

.addBtn:hover {
  color: var(--text-primary, #cdd6f4);
}

.renameInput {
  background: var(--bg-primary, #11111b);
  border: 1px solid var(--accent, #89b4fa);
  color: var(--text-primary, #cdd6f4);
  font-size: 12px;
  padding: 1px 4px;
  width: 100px;
  border-radius: 2px;
  outline: none;
}
```

- [ ] **Step 3: Create TerminalPanel**

Create `apps/desktop/src/components/Terminal/TerminalPanel.tsx`:

```typescript
import { useTerminalTabs } from '../../hooks/useTerminalTabs';
import { TerminalTabBar } from './TerminalTabBar';
import { TerminalView } from './TerminalView';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { PtyExitEvent } from '@forge/core';
import styles from './TerminalPanel.module.css';

interface Props {
  bayId: string;
  projectPath: string;
}

export function TerminalPanel({ bayId, projectPath }: Props) {
  const { tabs, activeTabId, addTab, removeTab, selectTab, renameTab, markExited } =
    useTerminalTabs(bayId);

  const handleAddTab = () => {
    addTab(projectPath, 80, 24);
  };

  // Listen for exit events on all terminals
  useEffect(() => {
    const unlisteners = tabs.map((tab) => {
      if (tab.isExited) return null;
      return listen<PtyExitEvent>(`pty:exit:${tab.id}`, (event) => {
        markExited(tab.id, event.payload.exitCode);
      });
    });

    return () => {
      unlisteners.forEach((p) => p?.then((fn) => fn()));
    };
  }, [tabs, markExited]);

  return (
    <div className={styles.panel}>
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={selectTab}
        onClose={removeTab}
        onRename={renameTab}
        onAdd={handleAddTab}
      />
      <div className={styles.content}>
        {tabs.length === 0 && (
          <div className={styles.empty}>
            No terminals open. Press + or Ctrl+Shift+` to create one.
          </div>
        )}
        {tabs.map((tab) => (
          <TerminalView
            key={tab.id}
            terminalId={tab.id}
            isVisible={tab.id === activeTabId}
          />
        ))}
      </div>
    </div>
  );
}
```

Create `apps/desktop/src/components/Terminal/TerminalPanel.module.css`:

```css
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary, #11111b);
}

.content {
  flex: 1;
  min-height: 0;
  position: relative;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #a6adc8);
  font-size: 13px;
}
```

- [ ] **Step 4: Create barrel export**

Create `apps/desktop/src/components/Terminal/index.ts`:

```typescript
export { TerminalPanel } from './TerminalPanel';
export { TerminalView } from './TerminalView';
export { TerminalTabBar } from './TerminalTabBar';
```

- [ ] **Step 5: Run type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/Terminal/
git commit -m "feat: add terminal UI components (panel, tab bar, view)"
```

---

## Task 10: Layout Integration (CenterPanel + Bottom Terminal)

**Files:**

- Modify: `apps/desktop/src/screens/Bay/CenterPanel.tsx`

- [ ] **Step 1: Read current CenterPanel**

Read `apps/desktop/src/screens/Bay/CenterPanel.tsx` to understand the current structure before modifying.

- [ ] **Step 2: Add terminal panel below editor panes**

Modify `CenterPanel.tsx` to wrap the editor pane tree and terminal panel in a vertical flex layout with a resizable divider. Import `TerminalPanel` from `../../components/Terminal`. The terminal panel should:

- Sit below the editor pane tree
- Use a draggable resize handle (horizontal bar) between them
- Default to collapsed state (`bottomTrayHeight: 250`)
- Accept `bayId` and `projectPath` props to pass to `TerminalPanel`

The exact diff depends on the current CenterPanel structure — read it first, then add the terminal integration.

- [ ] **Step 3: Run type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/screens/Bay/CenterPanel.tsx
git commit -m "feat: integrate terminal panel into center layout"
```

---

## Task 11: Command Ledger UI Components

**Files:**

- Create: `apps/desktop/src/components/CommandLedger/CommandHistory.tsx`
- Create: `apps/desktop/src/components/CommandLedger/CommandHistory.module.css`
- Create: `apps/desktop/src/components/CommandLedger/CommandFilters.tsx`
- Create: `apps/desktop/src/components/CommandLedger/CommandDetail.tsx`
- Create: `apps/desktop/src/components/CommandLedger/CommandDetail.module.css`
- Create: `apps/desktop/src/components/CommandLedger/index.ts`

- [ ] **Step 1: Create CommandHistory**

Create `apps/desktop/src/components/CommandLedger/CommandHistory.tsx`:

```typescript
import { useState } from 'react';
import { useCommandLedger } from '../../hooks/useCommandLedger';
import { CommandFilters } from './CommandFilters';
import { CommandDetail } from './CommandDetail';
import type { CommandEntry } from '@forge/core';
import styles from './CommandHistory.module.css';

interface Props {
  bayId: string;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const STATUS_ICON: Record<string, string> = {
  running: '\u25cf',  // filled circle
  completed: '\u2713', // check
  failed: '\u2717',    // x
  killed: '\u25a0',    // square
};

export function CommandHistory({ bayId }: Props) {
  const { commands, isLoading, filters, setFilters } = useCommandLedger(bayId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expanded = commands.find((c) => c.id === expandedId);

  if (expanded) {
    return (
      <CommandDetail
        entry={expanded}
        bayId={bayId}
        onBack={() => setExpandedId(null)}
      />
    );
  }

  return (
    <div className={styles.container}>
      <CommandFilters filters={filters} onChange={setFilters} />
      <div className={styles.list}>
        {isLoading && <div className={styles.loading}>Loading...</div>}
        {!isLoading && commands.length === 0 && (
          <div className={styles.empty}>No commands recorded yet.</div>
        )}
        {commands.map((cmd) => (
          <div
            key={cmd.id}
            className={styles.entry}
            onClick={() => setExpandedId(cmd.id)}
          >
            <span className={`${styles.status} ${styles[cmd.status]}`}>
              {STATUS_ICON[cmd.status] ?? '?'}
            </span>
            <span className={styles.command}>{cmd.command}</span>
            <span className={styles.meta}>
              {formatDuration(cmd.durationMs)} · {formatTime(cmd.startedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Create `apps/desktop/src/components/CommandLedger/CommandHistory.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.entry:hover {
  background: var(--bg-hover, #313244);
}

.status {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}

.running {
  color: #89b4fa;
}
.completed {
  color: #a6e3a1;
}
.failed {
  color: #f38ba8;
}
.killed {
  color: #fab387;
}

.command {
  flex: 1;
  font-family:
    JetBrains Mono,
    monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary, #cdd6f4);
}

.meta {
  flex-shrink: 0;
  color: var(--text-secondary, #a6adc8);
  font-size: 11px;
}

.loading,
.empty {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary, #a6adc8);
  font-size: 13px;
}
```

- [ ] **Step 2: Create CommandFilters**

Create `apps/desktop/src/components/CommandLedger/CommandFilters.tsx`:

```typescript
import type { CommandFilters as Filters, CommandStatus } from '@forge/core';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function CommandFilters({ filters, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 8px', borderBottom: '1px solid var(--border, #313244)' }}>
      <select
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            status: (e.target.value || undefined) as CommandStatus | undefined,
          })
        }
        style={{ fontSize: 11, background: 'var(--bg-secondary, #1e1e2e)', color: 'var(--text-primary, #cdd6f4)', border: '1px solid var(--border, #313244)', borderRadius: 3, padding: '2px 4px' }}
      >
        <option value="">All statuses</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="killed">Killed</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create CommandDetail**

Create `apps/desktop/src/components/CommandLedger/CommandDetail.tsx`:

```typescript
import type { CommandEntry } from '@forge/core';
import { commandLedgerIpc } from '../../ipc/commandLedger';
import styles from './CommandDetail.module.css';

interface Props {
  entry: CommandEntry;
  bayId: string;
  onBack: () => void;
}

export function CommandDetail({ entry, bayId, onBack }: Props) {
  const handleReplay = async () => {
    await commandLedgerIpc.execute({
      bayId,
      command: entry.command,
      cwd: entry.cwd,
      laneId: entry.laneId ?? undefined,
      agentId: entry.agentId ?? undefined,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.command);
  };

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>&larr; Back</button>
        <div className={styles.actions}>
          <button onClick={handleReplay} title="Replay command">Replay</button>
          <button onClick={handleCopy} title="Copy command">Copy</button>
        </div>
      </div>

      <div className={styles.field}>
        <label>Command</label>
        <code>{entry.command}</code>
      </div>
      <div className={styles.field}>
        <label>CWD</label>
        <code>{entry.cwd}</code>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label>Status</label>
          <span>{entry.status}</span>
        </div>
        <div className={styles.field}>
          <label>Exit Code</label>
          <span>{entry.exitCode ?? '-'}</span>
        </div>
        <div className={styles.field}>
          <label>Duration</label>
          <span>{entry.durationMs ? `${entry.durationMs}ms` : '-'}</span>
        </div>
      </div>

      {entry.laneId && (
        <div className={styles.field}>
          <label>Lane</label>
          <span className={styles.badge}>{entry.laneId}</span>
        </div>
      )}
      {entry.agentId && (
        <div className={styles.field}>
          <label>Agent</label>
          <span className={styles.badge}>{entry.agentId}</span>
        </div>
      )}

      {entry.stdoutPreview && (
        <div className={styles.field}>
          <label>stdout</label>
          <pre className={styles.preview}>{entry.stdoutPreview}</pre>
        </div>
      )}
      {entry.stderrPreview && (
        <div className={styles.field}>
          <label>stderr</label>
          <pre className={styles.preview}>{entry.stderrPreview}</pre>
        </div>
      )}
    </div>
  );
}
```

Create `apps/desktop/src/components/CommandLedger/CommandDetail.module.css`:

```css
.detail {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  height: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.backBtn {
  background: none;
  border: none;
  color: var(--accent, #89b4fa);
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
}

.actions {
  display: flex;
  gap: 4px;
}

.actions button {
  background: var(--bg-secondary, #1e1e2e);
  border: 1px solid var(--border, #313244);
  color: var(--text-primary, #cdd6f4);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: pointer;
}

.actions button:hover {
  background: var(--bg-hover, #313244);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field label {
  font-size: 10px;
  color: var(--text-secondary, #a6adc8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field code,
.field span {
  font-size: 12px;
  color: var(--text-primary, #cdd6f4);
}

.field code {
  font-family:
    JetBrains Mono,
    monospace;
  background: var(--bg-secondary, #1e1e2e);
  padding: 4px 6px;
  border-radius: 3px;
  word-break: break-all;
}

.row {
  display: flex;
  gap: 16px;
}

.badge {
  background: var(--bg-secondary, #1e1e2e);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
}

.preview {
  background: var(--bg-secondary, #1e1e2e);
  padding: 8px;
  border-radius: 4px;
  font-family:
    JetBrains Mono,
    monospace;
  font-size: 11px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
}
```

- [ ] **Step 4: Create barrel export**

Create `apps/desktop/src/components/CommandLedger/index.ts`:

```typescript
export { CommandHistory } from './CommandHistory';
export { CommandFilters } from './CommandFilters';
export { CommandDetail } from './CommandDetail';
```

- [ ] **Step 5: Run type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/CommandLedger/
git commit -m "feat: add command ledger UI components (history, filters, detail)"
```

---

## Task 12: Right Rail Integration

**Files:**

- Modify: Right rail/sidebar component (read current structure first)

- [ ] **Step 1: Read current right rail structure**

Read the Bay layout files to find where the right sidebar renders. Look at `BayWorkspace.tsx` or `BayLayout.tsx` for the right rail slot.

- [ ] **Step 2: Add CommandHistory to right rail**

Add a "Commands" tab to the right sidebar, rendering `CommandHistory` with the current `bayId`. The exact integration point depends on the current right rail structure.

- [ ] **Step 3: Run type check and tests**

Run: `cd apps/desktop && pnpm tsc --noEmit && pnpm test`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: integrate command history into right sidebar"
```

---

## Task 13: Run All Tests + Final Verification

- [ ] **Step 1: Run Rust tests**

Run: `cd apps/desktop/src-tauri && cargo test`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript tests**

Run: `cd apps/desktop && pnpm test`
Expected: All tests pass.

- [ ] **Step 3: Type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Build check**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Manual smoke test**

Run: `cd apps/desktop && pnpm tauri dev`

1. Open a Bay with a project path
2. Click "+" in terminal panel to create a terminal
3. Type a command (e.g., `ls`) and verify output streams
4. Open a second terminal tab, switch between tabs
5. Rename a terminal tab via double-click
6. Close a terminal tab
7. Check the Command History panel in the right sidebar (should be empty — only programmatic commands log)

- [ ] **Step 6: Update roadmap checklist**

Mark items 2.01–2.05, 2.07–2.13 as complete in `design/Forge_Roadmap_Checklist.md`.

- [ ] **Step 7: Commit**

```bash
git add design/Forge_Roadmap_Checklist.md
git commit -m "docs: mark Phase 2 items complete in roadmap"
```
