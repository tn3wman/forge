# Rust Backend Branch Deletion & Remote Operations Analysis

## Summary
Explored the Forge Tauri backend to understand branch deletion and remote operations patterns. All code uses git2-rs library with proper error handling, auth patterns, and worktree awareness.

---

## 1. Branch Deletion Function (`branch.rs:119-174`)

### Function Signature
```rust
pub fn delete_branch(path: &str, name: &str, force: bool) -> Result<(), String>
```

### Key Characteristics
- **Returns**: `Result<(), String>` - empty success or error message
- **Parameters**: 
  - `path`: repository directory path
  - `name`: branch name to delete
  - `force`: boolean to force delete (used for worktree handling)

### Implementation Details

**Safety Checks (in order)**:
1. **Cannot delete current branch** (lines 123-131)
   - Checks if HEAD is pointing to the branch
   - Returns: `"Cannot delete the current branch '{name}'. Switch to another branch first."`

2. **Worktree awareness** (lines 133-163)
   - Iterates through all worktrees via `repo.worktrees()`
   - Opens each worktree as a Repository to check its HEAD
   - If branch is checked out in a worktree:
     - If `force=true`: calls `crate::git::worktree::remove_worktree()` first, then continues deletion
     - If `force=false`: returns error: `"Branch '{name}' is checked out in worktree '{wt_name}'. Delete the worktree first or use force delete."`

3. **Actual deletion** (lines 165-171)
   - Finds branch via `repo.find_branch(name, BranchType::Local)`
   - Calls `branch.delete()` on the git2 branch object
   - Propagates any git2 errors as formatted strings

### Error Handling Pattern
All errors wrapped as `String` with descriptive messages. Format: `"Failed to X: {e}"` or custom context message.

---

## 2. Remote Operations - Authentication (`remote.rs:3-10`)

### make_callbacks() Function
```rust
pub(crate) fn make_callbacks(token: &str) -> RemoteCallbacks<'_>
```

**Purpose**: Creates git2 RemoteCallbacks for authenticated remote operations

**Implementation**:
- Creates mutable `RemoteCallbacks::new()`
- Registers `.credentials()` callback
- Uses **OAuth token-based auth**: `Cred::userpass_plaintext(&token, "x-oauth-basic")`
  - Token passed as username
  - "x-oauth-basic" as password (GitHub convention)
- Closure captures token as String
- Returns configured callbacks object

**Usage Pattern**: Injected into `FetchOptions` or `PushOptions` before remote operations

### Fetch Implementation (lines 12-37)
```rust
pub fn fetch(path: &str, remote_name: &str, token: &str) -> Result<(), String>
```
- Opens repo, finds remote by name
- Creates `make_callbacks(token)` 
- Collects refspecs from remote config
- Calls `remote.fetch(&refspec_strs, Some(&mut fetch_opts), None)`

### Push Implementation (lines 103-126)
```rust
pub fn push(
    path: &str,
    remote_name: &str,
    branch: &str,
    token: &str,
) -> Result<(), String>
```
- Opens repo, finds remote
- Uses `make_callbacks(token)` for PushOptions
- Builds refspec: `"refs/heads/{branch}:refs/heads/{branch}"`
- Calls `remote.push(&[&refspec], Some(&mut push_opts))`

### Pull Implementation (lines 39-101)
- Calls `fetch()` first
- Then performs fast-forward merge only (diverged branches rejected)
- Updates HEAD ref and checks out updated tree

---

## 3. Git Delete Branch Command (`commands/git.rs:114-119`)

### Tauri Command Signature
```rust
#[tauri::command]
pub async fn git_delete_branch(
    path: String, 
    name: String, 
    force: Option<bool>
) -> Result<(), String>
```

**Key Points**:
- Async Tauri command (runs on separate thread via `tokio::task::spawn_blocking`)
- `force` is Optional, defaults to `false` if not provided
- Directly delegates to `crate::git::branch::delete_branch()` with force unwrapped

**Error Handling**:
- Task spawn errors wrapped as `"Task failed: {e}"`
- Propagates delete_branch errors as-is

---

## 4. Git Module Exports (`mod.rs`)

**Exported submodules**:
```rust
pub mod branch;      // branch operations
pub mod clone;       // repository cloning
pub mod commit;      // staging & commits
pub mod diff;        // diff operations
pub mod log;         // commit history
pub mod remote;      // fetch/push/pull
pub mod stash;       // stash operations
pub mod status;      // working tree status
pub mod worktree;    // worktree management
```

All modules are public and available to commands layer.

---

## Key Patterns Identified

### Error Handling
1. **Consistent Result type**: All functions return `Result<T, String>`
2. **Error format**: `"Failed to {operation}: {error}"` or contextual message
3. **Propagation**: Errors bubble up through command layer to Tauri frontend

### Authentication
1. **OAuth token-based**: Uses token as username with "x-oauth-basic" password
2. **Callback injection**: `make_callbacks()` creates reusable callback objects
3. **Scope**: Used in fetch/push/pull operations

### Concurrency
1. **Blocking tasks**: All git operations run in `tokio::task::spawn_blocking()`
2. **Non-blocking commands**: Returns immediately, operations happen in background thread
3. **No mutation**: git2 handles thread-safety for Repository objects

### Worktree Awareness
1. Branch deletion checks all linked worktrees
2. Can force-delete by removing conflicting worktrees first
3. Prevents orphaned worktrees pointing to deleted branches

---

## Design Implications for Branch Deletion with Remote Delete

**Current flow**: Local deletion only
- No remote branch deletion in current `delete_branch()` implementation
- Would need separate push operation or extended signature

**Recommended approach for remote deletion**:
1. Extend `delete_branch()` or create `delete_branch_remote()`
2. Add optional `delete_remote: bool` parameter
3. After successful local deletion, call `push()` with force flag if remote deletion desired
4. Refspec format for deletion: `":refs/heads/{branch}"` (push empty to remote)

---

## File Locations
- `apps/desktop/src-tauri/src/git/branch.rs`
- `apps/desktop/src-tauri/src/git/remote.rs`
- `apps/desktop/src-tauri/src/commands/git.rs`
- `apps/desktop/src-tauri/src/git/mod.rs`
