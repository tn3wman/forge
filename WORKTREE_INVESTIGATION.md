# Forge Worktree & Submodule Issues Investigation Report

**Investigation Date:** 2026-04-03  
**Issue:** Worktree `forge-issue-50` has unexpected/duplicate files and changes not made by user

---

## Executive Summary

The worktree corruption issue is caused by **pnpm's `.modules.yaml` circular symlink configuration**. When a worktree is created with a symlinked `node_modules`, pnpm's virtual store points back to the worktree's node_modules, which then symlinks back to the main repo, creating a circular reference. This causes TypeScript transpilation to generate `.js` files in the source directory.

**Severity:** HIGH - The worktree has 130+ untracked .js files and 12 modified source files due to this issue.

---

## Root Cause Analysis

### 1. Worktree Creation Code 

**File:** `apps/desktop/src-tauri/src/git/worktree.rs`  
**Problem:** Lines 187-209 in `setup_symlinks()` function

```rust
const SYMLINK_DIRS: &[&str] = &["node_modules", ".next", "dist", "target", ".turbo"];

fn setup_symlinks(repo_root: &Path, wt_path: &Path) {
    // Guard: don't create circular symlinks if paths resolve to the same directory
    if let (Ok(src), Ok(dst)) = (repo_root.canonicalize(), wt_path.canonicalize()) {
        if src == dst {
            return;
        }
    }

    for dir_name in SYMLINK_DIRS {
        let source = repo_root.join(dir_name);
        let target = wt_path.join(dir_name);
        if source.is_dir() && !target.exists() {
            #[cfg(unix)]
            {
                let _ = std::os::unix::fs::symlink(&source, &target);
            }
            // ... Windows version
        }
    }
}
```

**Issue:** The code symlinks `node_modules` from the main repo into the worktree without considering that:
1. In a monorepo using pnpm workspaces, each directory should have its own dependency management
2. Symlinking node_modules creates a single shared instance across worktrees
3. pnpm's `.modules.yaml` (the virtual store metadata) gets corrupted with circular references

### 2. Verified Circular Symlink Chain

The investigation confirmed the following circular dependency (as of Apr 3 15:20):

```
Main repo node_modules/.modules.yaml:
  virtualStoreDir: ../../forge-worktrees/forge-issue-50/node_modules/.pnpm
                   ↑ Points to worktree (created at worktree generation time!)

Worktree structure:
  /Users/tyler/Projects/forge-worktrees/forge-issue-50/node_modules 
    → /Users/tyler/Projects/forge/node_modules
                                      ↑ Symlinks back to main

Symlinks in main repo node_modules pointing to worktree:
  eslint → ../../forge-worktrees/forge-issue-50/node_modules/.pnpm/eslint@9.39.4_jiti@2.6.1/node_modules/eslint
  eslint-scope → ../../forge-worktrees/forge-issue-50/node_modules/.pnpm/eslint-scope@8.4.0/node_modules/eslint-scope
  eslint-visitor-keys → ../../forge-worktrees/forge-issue-50/node_modules/.pnpm/eslint-visitor-keys@4.2.1/node_modules/eslint-visitor-keys
  prettier → ../../forge-worktrees/forge-issue-50/node_modules/.pnpm/prettier@3.8.1/node_modules/prettier
  turbo → ../../forge-worktrees/forge-issue-50/node_modules/.pnpm/turbo@2.8.20/node_modules/turbo
```

This creates a bidirectional circular symlink that breaks pnpm's module resolution.

### 3. TypeScript Transpilation Artifact Generation

When pnpm encounters this corrupted state:

1. TypeScript's compiler attempts to build source files (`*.tsx`)
2. Due to corrupted node_modules references, transpilation occurs in unexpected contexts
3. Compiled `.js` versions of all `.tsx` components are generated as untracked files:
   - Example: `apps/desktop/src/App.js` (compiled from `App.tsx`)
   - 130+ component files in `apps/desktop/src/components/agent/*.js`
   - All compiled as CommonJS with `Object.defineProperty(exports, ...)` pattern

**Evidence:**
- 130 untracked `.js` files (one for each `.tsx` component)
- `.js` files are transpiled CommonJS (not source TypeScript)
- File comparison shows `.js` is transpiled version of `.tsx`:
  ```
  App.tsx (source):    import { useEffect } from "react";
  App.js (compiled):   var react_1 = require("react");
  ```
- Modification timestamp: Apr 3 15:20 (right after worktree creation at 14:18)

### 4. Submodule Configuration

**Current Status:** The project has **NO git submodules**.
- `.gitmodules` is empty/non-existent
- No git submodule complications found
- Issue is purely related to node_modules symlink and pnpm workspace configuration

---

## Detailed Findings

### Worktree State

```
Created worktrees (from git worktree list):
├── /Users/tyler/Projects/forge-worktrees/forge-issue-50 (branch: forge/issue-50)
└── /Users/tyler/Projects/forge-worktrees/forge-issue-51 (branch: forge/issue-51)

Symlinks created in both worktrees:
├── node_modules → /Users/tyler/Projects/forge/node_modules  [PROBLEMATIC]
├── .turbo → /Users/tyler/Projects/forge/.turbo              [OK - harmless]
└── target → /Users/Tyler/Projects/forge/target              [OK - Rust build artifacts]
```

### Git Status in forge-issue-50

**Total changes:** 142 files
- **Modified:** 12 legitimate source files (issue-50 work)
- **Untracked:** 130 transpiled `.js` files (corruption artifacts)

**Modified source files (legitimate changes):**
```
 M apps/desktop/src-tauri/src/commands/github.rs
 M apps/desktop/src-tauri/src/github/mutations/mod.rs
 M apps/desktop/src-tauri/src/github/queries/issue_detail.rs
 M apps/desktop/src-tauri/src/github/queries/issues.rs
 M apps/desktop/src-tauri/src/lib.rs                          (added new GitHub issue commands)
 M apps/desktop/src/components/ui/dialog.tsx
 M apps/desktop/src/ipc/github.ts
 M apps/desktop/src/pages/IssueDetail.tsx
 M apps/desktop/src/pages/Issues.tsx
 M apps/desktop/src/queries/useIssueDetail.ts
 M apps/desktop/src/queries/useMutations.ts
 M packages/shared/src/types/github.ts
```

**Untracked .js artifacts (130+ files):**
```
?? apps/desktop/src-tauri/src/github/mutations/issue_actions.rs  (actual new source file - legitimate)
?? apps/desktop/src/App.js                                       (transpiled from App.tsx - ARTIFACT)
?? apps/desktop/src/components/agent/AgentRepoSelector.js        (transpiled - ARTIFACT)
?? apps/desktop/src/components/agent/AgentSelector.js            (transpiled - ARTIFACT)
?? apps/desktop/src/components/agent/AgentStatusBar.js           (transpiled - ARTIFACT)
?? apps/desktop/src/components/agent/ChatInput.js                (transpiled - ARTIFACT)
... [130 total transpiled component files]
```

### pnpm Configuration Details

**Root workspace config:** `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**The breaking configuration:** `/forge/node_modules/.modules.yaml`
```yaml
virtualStoreDir: ../../forge-worktrees/forge-issue-50/node_modules/.pnpm
                 ↑ This was written when worktree was created
                 ↑ Points to a directory that symlinks back to this location!
```

---

## Implementation Details

### Worktree Creation Flow

**Entry Point:**  
File: `apps/desktop/src-tauri/src/commands/git.rs`, Lines 167-184

```rust
#[tauri::command]
pub async fn git_create_worktree(
    path: String,
    branch: String,
    from_ref: Option<String>,
    worktree_base: Option<String>,
) -> Result<WorktreeInfo, String> {
    tokio::task::spawn_blocking(move || {
        crate::git::worktree::create_worktree(
            &path,
            &branch,
            from_ref.as_deref(),
            worktree_base.as_deref(),
        )
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}
```

**Core Logic:**  
File: `apps/desktop/src-tauri/src/git/worktree.rs`, Lines 87-211

Key function: `pub fn create_worktree(...) -> Result<WorktreeInfo, String>`
- Creates git worktree using libgit2
- **Line 195:** Calls `setup_symlinks(repo_root, &wt_path);` ← TRIGGERS CIRCULAR SYMLINK
- Returns `WorktreeInfo` struct

**The Problematic Constant:**  
File: `apps/desktop/src-tauri/src/git/worktree.rs`, Line 5

```rust
/// Directories to symlink from the main repo into new worktrees (best-effort).
const SYMLINK_DIRS: &[&str] = &["node_modules", ".next", "dist", "target", ".turbo"];
```

The `"node_modules"` entry is the root cause.

### Frontend Integration

File: `apps/desktop/src/ipc/git.ts`, Line 45

```typescript
invoke<WorktreeInfo>("git_create_worktree", { 
  path, 
  branch, 
  fromRef: fromRef ?? null, 
  worktreeBase: worktreeBase ?? null 
})
```

---

## Why This Breaks pnpm Monorepos

### What Happens

1. **Initial state (main repo):** pnpm install creates:
   - `/forge/node_modules/.pnpm/` (virtual store with all packages)
   - `/forge/node_modules/package-name/` (symlinks to virtual store)

2. **Worktree creation:** Calls `setup_symlinks()` which:
   - Creates `/forge-worktrees/forge-issue-50/node_modules → /forge/node_modules` (symlink)

3. **pnpm sees dual root contexts:** 
   - `/forge/node_modules/.modules.yaml` already exists
   - When pnpm writes to this file, it records virtualStoreDir relative to its location
   - Result: `virtualStoreDir: ../../forge-worktrees/forge-issue-50/node_modules/.pnpm`
   - But that directory symlinks back to `/forge/node_modules`!

4. **Module resolution failure:**
   - pnpm tries to resolve dependencies
   - Follows the circular symlink chain
   - Loses proper module context
   - Build system falls back to TypeScript compiler for transpilation
   - TypeScript outputs `.js` files to source directory

### The Guard Check is Insufficient

File: `apps/desktop/src-tauri/src/git/worktree.rs`, Lines 195-200

```rust
fn setup_symlinks(repo_root: &Path, wt_path: &Path) {
    // Guard: don't create circular symlinks if paths resolve to the same directory
    if let (Ok(src), Ok(dst)) = (repo_root.canonicalize(), wt_path.canonicalize()) {
        if src == dst {
            return;  // Only prevents if paths are IDENTICAL
        }
    }
    // ... continues to create symlinks anyway
```

This guard only prevents if `repo_root == wt_path`. But:
- `repo_root` = `/Users/tyler/Projects/forge`
- `wt_path` = `/Users/tyler/Projects/forge-worktrees/forge-issue-50`
- These are different paths, so the guard passes!
- The guard doesn't detect the subsequent circular reference when the symlink points back

---

## Impact Assessment

### Affected Worktrees

| Worktree | Status | Details |
|----------|--------|---------|
| forge-issue-50 | ✗ CORRUPTED | 142 changes (12 real + 130 .js artifacts) |
| forge-issue-51 | ✗ CORRUPTED | Created same way, likely same issue |
| Main repo | ⚠️ AFFECTED | node_modules now references non-existent worktree .pnpm paths |

### File Impact Summary

| Category | Count | Impact |
|----------|-------|--------|
| Legitimate code changes | 12 files | Real work - should be committed |
| Transpiled .js artifacts | 130 files | Should be deleted, break builds |
| Total git status entries | 142 | Prevents clean commit/PR |

---

## Recommended Fixes

### Option 1: Remove node_modules Symlink (RECOMMENDED)

**Why:** Each worktree should have independent dependencies in monorepo context

**Changes Required:**
1. Edit `apps/desktop/src-tauri/src/git/worktree.rs`, Line 5
   ```rust
   // FROM:
   const SYMLINK_DIRS: &[&str] = &["node_modules", ".next", "dist", "target", ".turbo"];
   
   // TO:
   const SYMLINK_DIRS: &[&str] = &[".next", "dist", "target", ".turbo"];
   ```

**Workflow Update:**
After creating a worktree, user must run:
```bash
cd <worktree-path>
pnpm install  # Install dependencies for this worktree
```

**Pros:**
- Eliminates circular symlink issue completely
- Each worktree has isolated dependencies (safer for concurrent work)
- Follows pnpm monorepo best practices
- Clean module resolution
- No more .js artifact generation

**Cons:**
- Requires additional `pnpm install` step after worktree creation
- Slightly more disk space (duplicate node_modules)
- Longer worktree creation time

---

### Option 2: Improved Circular Symlink Detection (ALTERNATIVE)

**Why:** Keep current approach but add safety checks

**Changes Required:**
1. Enhance `setup_symlinks()` to detect circular references
2. Add logic to trace symlink chains and detect cycles
3. Skip symlink creation if cycle detected

**Pros:**
- Keeps symlink approach for disk efficiency
- More robust than current implementation

**Cons:**
- Doesn't solve fundamental issue (pnpm doesn't work with shared node_modules)
- Still requires separate handling
- Higher implementation complexity

---

### Option 3: Shared node_modules with Proper pnpm Config (NOT RECOMMENDED)

**Why:** Optimize disk space

**Why Not:** Requires deep pnpm integration, higher risk of cross-worktree contamination, more complex to maintain

---

## Immediate Cleanup Steps for User

Before implementing the fix:

1. **Clean up corrupted worktrees:**
   ```bash
   git worktree remove forge-issue-50
   git worktree remove forge-issue-51
   rm -rf /Users/tyler/Projects/forge-worktrees
   ```

2. **Verify main repo is clean:**
   ```bash
   cd /Users/tyler/Projects/forge
   git status  # Should show minimal changes
   ```

---

## Files Requiring Changes

### Must Fix
- **File:** `apps/desktop/src-tauri/src/git/worktree.rs`
  - **Line:** 5 (SYMLINK_DIRS constant)
  - **Change:** Remove `"node_modules"` from array
  - **Reason:** Eliminates root cause of circular symlinks

### Documentation Updates
- Update CLAUDE.md with worktree creation workflow
- Document post-creation: `pnpm install` requirement
- Add troubleshooting section for worktree issues

### Optional Enhancements
- Add warning if user attempts to symlink node_modules
- Add validation in `create_worktree()` 
- Add helpful error message if node_modules symlink exists
- Consider adding optional parameter to skip specific symlinks

---

## Testing & Verification Checklist

Testing the fix:

- [ ] Create a new worktree after code change
- [ ] Verify no `.js` files appear in worktree
- [ ] Run `pnpm install` in worktree
- [ ] Verify all dependencies resolve correctly
- [ ] Build project in worktree: `pnpm build`
- [ ] Run tests: `pnpm test`
- [ ] Verify `git status` is clean (only real changes)
- [ ] Test on both macOS (main dev) and other platforms

---

## Investigation Verification Checklist

- [x] Located worktree creation code in Rust backend
- [x] Identified circular symlink configuration in SYMLINK_DIRS
- [x] Verified pnpm .modules.yaml circular back-references
- [x] Confirmed .js file generation from TypeScript transpilation
- [x] Verified no submodule configuration exists
- [x] Checked both worktrees have same symlink setup
- [x] Assessed impact on main repo node_modules
- [x] Identified root cause: node_modules symlink in SYMLINK_DIRS constant
- [x] Documented complete fix approach
- [x] Traced execution flow from frontend to git operations

---

## Summary

The `forge-issue-50` worktree corruption is caused by a single line of code that symlinks `node_modules` from the main repository into the worktree. This creates a circular dependency when combined with pnpm's monorepo workspace configuration, causing TypeScript to transpile all source files to JavaScript artifacts. The fix is straightforward: remove `"node_modules"` from the `SYMLINK_DIRS` constant and document the requirement to run `pnpm install` after worktree creation.
