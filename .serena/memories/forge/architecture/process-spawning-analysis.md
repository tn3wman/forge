# Forge Desktop App - Process Spawning & Architecture Analysis

## Current Architecture Summary

### 1. Process Spawning Patterns
**Current Approach: Library-Based, NOT Direct Shell**
- **Primary Pattern:** Uses `git2` library (libgit2) for all git operations
- **No direct Command spawning:** NO use of `std::process::Command` or `tokio::process`
- **Implementation:** All git operations (fetch, push, pull, branch, commit, status, diff, log, stash) use the `git2` crate's native Rust bindings
- **Location:** `/Users/tyler/Projects/forge/apps/desktop/src-tauri/src/git/` contains 10+ modules

**Key Files:**
- `git/remote.rs` - Uses `Repository::find_remote()`, `FetchOptions`, `PushOptions`, `RemoteCallbacks`
- `git/branch.rs` - Uses `Repository::branches()`, `branch_type`, `Repository::branch()`
- `git/status.rs`, `git/diff.rs`, `git/log.rs`, `git/commit.rs` - All libgit2-based
- `git/stash.rs` - Uses `Repository::stash_*` APIs

**Authentication Pattern:**
```rust
fn make_callbacks(token: &str) -> RemoteCallbacks<'_> {
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username, _allowed| {
        Cred::userpass_plaintext(&token, "x-oauth-basic")
    });
}
```
Tokens passed directly to git2 callbacks, not via shell environment.

### 2. Async Task Execution Pattern
**Pattern: tokio::task::spawn_blocking()**
- ALL Tauri commands use `#[tauri::command]` with `async fn`
- For CPU-bound work (git operations): `tokio::task::spawn_blocking(|| { crate::git::* })`
- Prevents blocking the async runtime with git2's synchronous operations
- Location: `/Users/tyler/Projects/forge/apps/desktop/src-tauri/src/commands/git.rs`

**Example Pattern:**
```rust
#[tauri::command]
pub async fn git_get_status(path: String) -> Result<Vec<FileStatus>, String> {
    tokio::task::spawn_blocking(move || crate::git::status::get_status(&path))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}
```

### 3. Background Task System
**Pattern: File System Watcher (NOT background daemon)**
- Located: `/Users/tyler/Projects/forge/apps/desktop/src-tauri/src/background/repo_watcher.rs`
- Uses `notify_debouncer_mini` crate for file system events
- **RepoWatcher struct:** Arc<Mutex<HashMap>> of file watchers per repo path
- **Event emission:** Uses Tauri's `app_handle.emit("repo-changed", payload)` to notify frontend
- **Debounce:** 300ms debounce to prevent event spam
- **Smart filtering:** Ignores .git internals except HEAD, refs, index

**No long-running processes spawned** - only file system watches

### 4. App State Management
**Pattern: Tauri's State Management**
- Location: `/Users/tyler/Projects/forge/apps/desktop/src-tauri/src/lib.rs`
- **Managed State:**
  1. `Database` - SQLite connection (database.rs) - Arc<Mutex<rusqlite::Connection>>
  2. `reqwest::Client` - HTTP client for GitHub API
  3. `RepoWatcher` - Background file system watcher

**Initialization in run() function:**
```rust
tauri::Builder::default()
    .setup(|app| {
        // Create app_data_dir
        let db_path = app_data_dir.join("forge.db");
        let database = Database::new(&db_path)?;
        database.run_migrations()?;
        app.manage(database);
        
        // HTTP client
        let http_client = reqwest::Client::builder()
            .user_agent("Forge/0.0.0")
            .build()?;
        app.manage(http_client);
        
        // Background watcher
        app.manage(background::repo_watcher::RepoWatcher::new());
        
        Ok(())
    })
```

### 5. Tauri Configuration
**Location:** `/Users/tyler/Projects/forge/apps/desktop/src-tauri/tauri.conf.json`

**Relevant Configuration:**
- `tauri_plugin_process::init()` - Process plugin initialized (but may not be used for git)
- `tauri_plugin_shell::init()` - Shell plugin initialized (but NOT used in current implementation)
- CSP: Connects to `https://api.github.com`, `https://github.com`
- No explicit shell command allowlist (because shell not used for git operations)

### 6. Models (Data Structures)
**Location:** `/Users/tyler/Projects/forge/apps/desktop/src-tauri/src/models/`
- `auth.rs` - Authentication models
- `git.rs` - Git data models (BranchInfo, FileStatus, GraphRow, StashEntry, DiffEntry)
- `workspace.rs` - Workspace models

### 7. Command Handlers
**Location:** `/Users/tyler/Projects/forge/apps/desktop/src-tauri/src/commands/`
All commands exposed via `#[tauri::command]` macro:
- `auth.rs` - Device flow OAuth, token management
- `git.rs` - Git operations (status, log, diff, branches, commits, stash, file watching)
- `github.rs` - GitHub API integration
- `workspace.rs` - Workspace management
- `repo.rs` - Repository management

**Total Git Commands:** 40+ exposed Tauri commands for git operations

---

## KEY FINDINGS FOR CLI TOOL INTEGRATION

### What's NOT Currently Done:
- ❌ No `std::process::Command` usage
- ❌ No shell command execution for git
- ❌ No CLI tool detection/discovery patterns
- ❌ No stdout/stderr capture from external processes
- ❌ No command allowlisting or shell permissions
- ❌ No async process streaming (tokio::process::Command)

### Existing Async/State Infrastructure:
- ✅ Tokio runtime running (via Tauri)
- ✅ App state management system (Tauri managed state)
- ✅ Background task system (RepoWatcher pattern)
- ✅ Tauri command IPC layer ready
- ✅ Error handling patterns established
- ✅ Database integration (SQLite)

### Where to Add CLI Tool Integration:
1. **New Module:** `apps/desktop/src-tauri/src/cli/` - CLI tool discovery & execution
2. **New Command Handler:** `apps/desktop/src-tauri/src/commands/cli.rs` - CLI commands
3. **New Models:** Add to `apps/desktop/src-tauri/src/models/cli.rs` - CLI tool models
4. **New Background Task:** Extend `background/` for CLI tool registry/discovery
5. **App State:** Add CLI tool registry as managed state in `lib.rs`
6. **DB Schema:** Extend database for CLI tool storage (if needed)

### Recommended Pattern for CLI Execution:
```rust
// Similar to git commands pattern
#[tauri::command]
pub async fn cli_execute(
    tool_name: String,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<CliOutput, String> {
    tokio::task::spawn_blocking(move || {
        crate::cli::executor::execute(&tool_name, &args, cwd.as_deref())
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}
```

---

## FILE STRUCTURE FOR IMPLEMENTATION
```
apps/desktop/src-tauri/src/
├── lib.rs                      # Add CLI registry to managed state
├── background/
│   ├── mod.rs
│   ├── repo_watcher.rs
│   └── cli_discovery.rs        # NEW: CLI tool discovery watcher
├── commands/
│   ├── git.rs
│   ├── cli.rs                  # NEW: CLI command handlers
│   └── mod.rs                  # Add cli module
├── models/
│   ├── git.rs
│   └── cli.rs                  # NEW: CliTool, CliOutput models
└── cli/                        # NEW: Directory for CLI integration
    ├── mod.rs
    ├── discovery.rs            # Tool discovery logic
    ├── executor.rs             # Process execution
    └── registry.rs             # Tool registry management
```
