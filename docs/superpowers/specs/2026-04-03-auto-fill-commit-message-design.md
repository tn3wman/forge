# Auto-fill Commit Message Design

**Issue:** #68 — Auto-fill commit details using a background agent
**Date:** 2026-04-03

## Context

Writing good commit messages takes effort. When a user stages changes and opens the commit form, they must manually summarize what changed, why, and categorize the type. A background agent can draft this by analyzing the actual diff, reducing friction and improving consistency.

## Approach: Lightweight Claude CLI Invocation

Use the Claude CLI's non-interactive print mode (`claude -p`) to generate commit messages. This is a single-shot text generation — no conversation, no tool use, no session management needed. The existing agent session infrastructure is too heavy for this use case.

## Architecture

```
User clicks "Generate" button
        │
        ▼
CommitForm / CommitMessageDialog (React)
        │  useGenerateCommitMessage(localPath)
        ▼
gitIpc.generateCommitMessage(path)
        │  invoke("generate_commit_message", { path })
        ▼
Rust: generate_commit_message command
        │
        ├── 1. get_diff(path, staged=true, None) → Vec<DiffEntry>
        ├── 2. Format diff into prompt text (cap at ~10K chars)
        ├── 3. Resolve claude CLI path (settings or PATH)
        ├── 4. Spawn: claude -p "<prompt>" --output-format text
        ├── 5. Collect stdout
        └── 6. Return GeneratedCommitMessage { title, body }
        │
        ▼
React fills textarea with generated message
User reviews, edits, then commits
```

## Backend Changes

### New Rust Command

**File:** `apps/desktop/src-tauri/src/commands/git.rs`

```rust
#[tauri::command]
pub async fn generate_commit_message(
    path: String,
    app_handle: AppHandle,
) -> Result<GeneratedCommitMessage, String> { ... }
```

**Implementation** (new file `apps/desktop/src-tauri/src/git/commit_message.rs`):

1. **Get staged diff**: Call existing `diff::get_diff(&path, true, None)` to get `Vec<DiffEntry>`.
2. **Format diff text**: Convert `DiffEntry` hunks into a unified-diff-style string. Truncate to ~10,000 characters if the diff is large, appending `\n[diff truncated]`.
3. **Resolve CLI path**: Read `claude_executable_path` from Tauri store settings. Fall back to `claude` on PATH (using the existing `shell_env` resolution).
4. **Build prompt**:
   ```
   Generate a git commit message for the following staged changes.

   Rules:
   - Use conventional commit format: type(scope): description
   - Types: feat, fix, refactor, docs, test, chore, style, perf, build, ci
   - First line MUST be under 72 characters
   - Add a blank line, then a brief body (1-3 sentences) explaining what changed and why
   - Output ONLY the commit message text, nothing else

   Staged diff:
   <diff_text>
   ```
5. **Spawn process**: `Command::new(claude_path).args(["-p", &prompt, "--output-format", "json", "--json-schema", &schema])`. Inherit shell environment via existing `apply_env()`. The JSON schema enforces the output structure:
   ```json
   {
     "type": "object",
     "properties": {
       "title": { "type": "string", "description": "Conventional commit first line, max 72 chars" },
       "body": { "type": "string", "description": "Brief explanation of what changed and why" }
     },
     "required": ["title", "body"]
   }
   ```
6. **Parse output**: Deserialize JSON `result` field from the `--output-format json` response. Extract `title` and `body`. Return `GeneratedCommitMessage`.

### New Model

**File:** `apps/desktop/src-tauri/src/models/git.rs` (add to existing)

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneratedCommitMessage {
    pub title: String,
    pub body: String,
}
```

### Shared TypeScript Type

**File:** `packages/shared/src/types/git.ts` (add to existing)

```typescript
export interface GeneratedCommitMessage {
  title: string;
  body: string;
}
```

### Command Registration

**File:** `apps/desktop/src-tauri/src/lib.rs`

Add `generate_commit_message` to the `tauri::generate_handler!` macro.

## Frontend Changes

### New IPC Method

**File:** `apps/desktop/src/ipc/git.ts`

```typescript
generateCommitMessage: (path: string) =>
  invoke<GeneratedCommitMessage>("generate_commit_message", { path }),
```

### New Hook

**File:** `apps/desktop/src/hooks/useGenerateCommitMessage.ts`

```typescript
export function useGenerateCommitMessage(localPath: string) {
  // Returns: { generate: () => void, isLoading, error, data }
  // Uses TanStack Query mutation pattern (useMutation)
  // On success, returns GeneratedCommitMessage
  // Caller uses data to fill the textarea
}
```

Uses `useMutation` from TanStack Query to wrap `gitIpc.generateCommitMessage(localPath)`. This gives us loading/error state for free.

### CommitForm Updates

**File:** `apps/desktop/src/components/git/CommitForm.tsx`

- Add a sparkle/wand icon button (`Sparkles` from lucide-react) positioned inline with the textarea or in the control bar next to the amend checkbox
- Button is disabled when: `stagedCount === 0`, generation is loading, or Claude CLI is not configured
- On click: calls `generate()`, on success sets `message` to `${data.title}\n\n${data.body}`
- While loading: button shows a small spinner
- Tooltip: "Generate commit message with AI" (disabled: "No staged changes" or "Claude CLI not configured")

### CommitMessageDialog Updates

**File:** `apps/desktop/src/components/terminal/CommitMessageDialog.tsx`

- Same sparkle button pattern in the dialog header or next to the textarea
- Needs `localPath` prop added (currently only has `onConfirm` callback)
- The parent `CommitPushButton` already has `workingDirectory` which can be passed through

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Claude CLI not installed/configured | Button disabled with tooltip explaining setup |
| No staged changes | Button disabled ("Stage changes first") |
| Very large diff (>10K chars) | Truncate with `[diff truncated]` marker |
| CLI process fails/times out | Show error toast, keep existing message intact |
| Empty diff (staged files with no content changes) | Let Claude handle it — it'll note the rename/permission change |
| User already typed a message | Generation overwrites — this is intentional since user clicked the button |
| Generation returns empty | Show error, don't clear existing message |

## What This Does NOT Include

- Commit type dropdown/selector (conventional commit prefix in the message is sufficient)
- Auto-trigger on page load (user explicitly chose manual button)
- Streaming/incremental display (2-5 second blocking call is acceptable)
- Model selection for generation (uses default Claude model)
- Cost tracking for generation (CLI handles this internally)

## Files to Modify

| File | Change |
|------|--------|
| `apps/desktop/src-tauri/src/git/commit_message.rs` | **New** — generation logic |
| `apps/desktop/src-tauri/src/git/mod.rs` | Add `pub mod commit_message;` |
| `apps/desktop/src-tauri/src/models/git.rs` | Add `GeneratedCommitMessage` struct |
| `apps/desktop/src-tauri/src/commands/git.rs` | Add `generate_commit_message` command |
| `apps/desktop/src-tauri/src/lib.rs` | Register new command |
| `packages/shared/src/types/git.ts` | Add `GeneratedCommitMessage` type |
| `apps/desktop/src/ipc/git.ts` | Add `generateCommitMessage` method |
| `apps/desktop/src/hooks/useGenerateCommitMessage.ts` | **New** — mutation hook |
| `apps/desktop/src/components/git/CommitForm.tsx` | Add generate button |
| `apps/desktop/src/components/terminal/CommitMessageDialog.tsx` | Add generate button + `localPath` prop |
| `apps/desktop/src/components/terminal/CommitPushButton.tsx` | Pass `workingDirectory` as `localPath` to dialog |

## Verification

1. **Unit**: Rust test for diff-to-prompt formatting and output parsing
2. **Manual E2E**:
   - Stage some files in the Changes page → click sparkle → verify message fills in
   - Open terminal commit dialog → click sparkle → verify message fills in
   - Stage 100+ files → verify diff truncation works
   - Unset Claude CLI path → verify button is disabled with tooltip
   - Kill Claude CLI mid-generation → verify error toast appears, textarea unchanged
