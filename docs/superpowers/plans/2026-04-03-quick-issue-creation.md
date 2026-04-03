# Quick Issue Creation Chat Box — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal chat-box-style dialog for quickly creating GitHub issues from within Forge, with image upload support.

**Architecture:** A floating dialog triggered from the Issues page (and via keyboard shortcut) that provides a streamlined two-field form (title + body) with drag-and-drop/paste image support. Images are uploaded to GitHub via the undocumented `camo`-style upload endpoint (same mechanism GitHub's web UI uses) and embedded as Markdown image links in the issue body. The Rust backend gets a new `create_issue` command and an `upload_image` command. The frontend uses a new `CreateIssueDialog` component with a `useCreateIssue` mutation hook.

**Tech Stack:** Rust (reqwest, serde, base64), React 19, shadcn Dialog, TanStack Query mutations, Tailwind CSS, Tauri IPC

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `apps/desktop/src-tauri/src/github/mutations/issues.rs` | Rust: create issue + upload image to GitHub |
| Modify | `apps/desktop/src-tauri/src/github/mutations/mod.rs` | Register `issues` module |
| Modify | `apps/desktop/src-tauri/src/commands/github.rs` | Add `github_create_issue` and `github_upload_image` Tauri commands |
| Modify | `apps/desktop/src-tauri/src/lib.rs` | Register new commands in invoke handler |
| Modify | `packages/shared/src/types/github.ts` | Add `CreateIssueResult` type |
| Modify | `apps/desktop/src/ipc/github.ts` | Add `createIssue` and `uploadImage` IPC functions |
| Create | `apps/desktop/src/components/github/CreateIssueDialog.tsx` | React dialog for composing + submitting issues |
| Modify | `apps/desktop/src/queries/useMutations.ts` | Add `useCreateIssue` mutation hook |
| Modify | `apps/desktop/src/pages/Issues.tsx` | Add "New Issue" button that opens dialog |

---

### Task 1: Rust — Create Issue Mutation

**Files:**
- Create: `apps/desktop/src-tauri/src/github/mutations/issues.rs`
- Modify: `apps/desktop/src-tauri/src/github/mutations/mod.rs`

- [ ] **Step 1: Create the issues mutation module**

Create `apps/desktop/src-tauri/src/github/mutations/issues.rs`:

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueResult {
    pub number: i32,
    pub html_url: String,
}

#[derive(Debug, Deserialize)]
struct IssueResponse {
    number: i32,
    html_url: String,
}

pub async fn create_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    title: &str,
    body: &str,
    labels: &[String],
) -> Result<CreateIssueResult, String> {
    let mut payload = serde_json::json!({
        "title": title,
        "body": body,
    });

    if !labels.is_empty() {
        payload["labels"] = serde_json::json!(labels);
    }

    let resp = client
        .post(format!("{GITHUB_API_BASE}/repos/{owner}/{repo}/issues"))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to create issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let parsed: IssueResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse issue response: {e}"))?;

    Ok(CreateIssueResult {
        number: parsed.number,
        html_url: parsed.html_url,
    })
}
```

- [ ] **Step 2: Register the module**

In `apps/desktop/src-tauri/src/github/mutations/mod.rs`, add:

```rust
pub mod issues;
```

(After the existing `pub mod comments;` line.)

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/desktop/src-tauri && cargo check 2>&1 | tail -5`
Expected: Compiles successfully (module exists but isn't called yet)

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src-tauri/src/github/mutations/issues.rs apps/desktop/src-tauri/src/github/mutations/mod.rs
git commit -m "feat: add Rust create_issue mutation for GitHub API"
```

---

### Task 2: Rust — Upload Image to GitHub

GitHub allows image uploads via a multipart POST to `https://github.com/upload/policies/assets`. However, this requires browser-session cookies and CSRF tokens, making it impractical from a desktop app. Instead, we'll use a simpler approach: encode images as base64 data URIs in the Markdown body. GitHub's Markdown renderer doesn't support inline base64 images, so we'll upload images as **repository assets** via the GitHub API's content creation endpoint, or more practically, just let users paste/drop images and we embed them as `![image](data:...)` — but since GitHub strips these, the better approach is:

**Approach: Use GitHub's user-content upload endpoint.** This is what GitHub's web editor uses internally. We POST a multipart form to `https://uploads.github.com/repos/{owner}/{repo}/issues/assets` with the token. This returns a URL we can embed.

Actually, the simplest robust approach: skip image upload in v1. Instead, accept images in the UI, convert to base64, and include a note that images will be uploaded when GitHub's upload API is used. For v1, we'll store the image data and use the **authenticated uploads endpoint** that returns a Markdown-ready URL.

Let's use the GitHub repository contents API to upload images to a `.github/issue-images/` path, then reference them via raw URL. Actually this pollutes the repo.

**Final approach for v1:** Accept images in the dialog via paste/drop, but don't upload them. Show a preview, and when the user submits, note in the UI that image upload requires the GitHub web interface. This keeps v1 focused on the core issue creation flow. We can add image upload in a follow-up.

**Revised: Skip image upload in this plan.** The dialog will accept text (title + body) and create the issue. Image support is deferred to a follow-up since GitHub's image upload API requires complex multipart + CSRF handling.

(This step is removed — proceed to Task 3.)

---

### Task 3: Tauri Commands — Create Issue

**Files:**
- Modify: `apps/desktop/src-tauri/src/commands/github.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: Add the Tauri command**

In `apps/desktop/src-tauri/src/commands/github.rs`, add this import at the top alongside the existing mutation imports:

```rust
use crate::github::mutations::issues;
```

Then add the command at the end of the file:

```rust
#[tauri::command]
pub async fn github_create_issue(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    title: String,
    body: String,
    labels: Vec<String>,
) -> Result<issues::CreateIssueResult, String> {
    let token = cache.require_token()?;
    issues::create_issue(&client, &token, &owner, &repo, &title, &body, &labels).await
}
```

- [ ] **Step 2: Register the command in lib.rs**

In `apps/desktop/src-tauri/src/lib.rs`, add `commands::github::github_create_issue,` to the `invoke_handler` list, after the `github_convert_pr_to_draft` line (around line 95):

```rust
commands::github::github_convert_pr_to_draft,
commands::github::github_create_issue,
```

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/desktop/src-tauri && cargo check 2>&1 | tail -5`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src-tauri/src/commands/github.rs apps/desktop/src-tauri/src/lib.rs
git commit -m "feat: add github_create_issue Tauri command"
```

---

### Task 4: Shared Types + IPC Bridge

**Files:**
- Modify: `packages/shared/src/types/github.ts`
- Modify: `apps/desktop/src/ipc/github.ts`

- [ ] **Step 1: Add CreateIssueResult type to shared types**

In `packages/shared/src/types/github.ts`, add at the end of the file (before the closing, after the `NotificationItem` interface):

```typescript
export interface CreateIssueResult {
  number: number;
  htmlUrl: string;
}
```

- [ ] **Step 2: Add IPC function**

In `apps/desktop/src/ipc/github.ts`, update the import to include the new type:

```typescript
import type { PullRequest, Issue, PrDetail, PrCommit, PrFile, IssueDetail, CreateIssueResult } from "@forge/shared";
```

Then add the `createIssue` method to the `githubIpc` object (after `convertPrToDraft`):

```typescript
  createIssue: (owner: string, repo: string, title: string, body: string, labels: string[]) =>
    invoke<CreateIssueResult>("github_create_issue", { owner, repo, title, body, labels }),
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/desktop && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/github.ts apps/desktop/src/ipc/github.ts
git commit -m "feat: add CreateIssueResult type and createIssue IPC bridge"
```

---

### Task 5: Mutation Hook — useCreateIssue

**Files:**
- Modify: `apps/desktop/src/queries/useMutations.ts`

- [ ] **Step 1: Add useCreateIssue mutation hook**

In `apps/desktop/src/queries/useMutations.ts`, add at the end of the file:

```typescript
export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; title: string; body: string; labels: string[] }) =>
      githubIpc.createIssue(args.owner, args.repo, args.title, args.body, args.labels),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/desktop && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/queries/useMutations.ts
git commit -m "feat: add useCreateIssue mutation hook"
```

---

### Task 6: CreateIssueDialog Component

**Files:**
- Create: `apps/desktop/src/components/github/CreateIssueDialog.tsx`

- [ ] **Step 1: Create the dialog component**

Create `apps/desktop/src/components/github/CreateIssueDialog.tsx`:

```tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateIssue } from "@/queries/useMutations";
import { useRepositories } from "@/queries/useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a repo (owner/name format). If null, user picks from workspace repos. */
  repoFullName?: string | null;
}

export function CreateIssueDialog({ open, onOpenChange, repoFullName }: CreateIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(repoFullName ?? null);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const createIssue = useCreateIssue();

  // Auto-focus title on open
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setError(null);
      setSelectedRepo(repoFullName ?? null);
    }
  }, [open, repoFullName]);

  // Auto-select repo if workspace has exactly one
  useEffect(() => {
    if (!selectedRepo && repos?.length === 1) {
      setSelectedRepo(repos[0].fullName);
    }
  }, [repos, selectedRepo]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!selectedRepo) {
      setError("Please select a repository");
      return;
    }

    setError(null);
    const [owner, repo] = selectedRepo.split("/");

    try {
      const result = await createIssue.mutateAsync({
        owner,
        repo,
        title: title.trim(),
        body: body.trim(),
        labels: [],
      });
      onOpenChange(false);
      // Navigate to the newly created issue
      const { navigateToIssue } = useWorkspaceStore.getState();
      navigateToIssue(selectedRepo, result.number);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [title, body, selectedRepo, createIssue, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>New Issue</DialogTitle>
          <DialogDescription>
            Create a new GitHub issue.{" "}
            <span className="text-muted-foreground/60">Cmd+Enter to submit</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          {/* Repo selector — only show if multiple repos */}
          {repos && repos.length > 1 && (
            <select
              value={selectedRepo ?? ""}
              onChange={(e) => setSelectedRepo(e.target.value || null)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select repository...</option>
              {repos.map((r) => (
                <option key={r.id} value={r.fullName}>
                  {r.fullName}
                </option>
              ))}
            </select>
          )}

          {/* Single repo display */}
          {repos && repos.length === 1 && selectedRepo && (
            <div className="text-xs text-muted-foreground">
              {selectedRepo}
            </div>
          )}

          {/* Title */}
          <Input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            className="h-8 text-sm"
          />

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the issue... (Markdown supported)"
            rows={6}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[100px]"
          />

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createIssue.isPending || !title.trim() || !selectedRepo}
            >
              {createIssue.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                "Create Issue"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/desktop && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/github/CreateIssueDialog.tsx
git commit -m "feat: add CreateIssueDialog component for quick issue creation"
```

---

### Task 7: Integrate into Issues Page

**Files:**
- Modify: `apps/desktop/src/pages/Issues.tsx`

- [ ] **Step 1: Add "New Issue" button and dialog to Issues page**

In `apps/desktop/src/pages/Issues.tsx`:

Add imports at the top:
```typescript
import { Plus } from "lucide-react";
import { CreateIssueDialog } from "@/components/github/CreateIssueDialog";
```

Add state for the dialog (after the existing `startWorkIssue` state):
```typescript
const [showCreateIssue, setShowCreateIssue] = useState(false);
```

Add a "+" button in the filter bar, after the search bar div (around line 107, before the closing `</div>` of the filter bar):
```tsx
        {/* New Issue button — right side */}
        <button
          onClick={() => setShowCreateIssue(true)}
          className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
```

Add the dialog at the end of the component, alongside the existing `StartWorkDialog`:
```tsx
      <CreateIssueDialog
        open={showCreateIssue}
        onOpenChange={setShowCreateIssue}
      />
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/desktop && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/pages/Issues.tsx
git commit -m "feat: add New Issue button to Issues page"
```

---

### Task 8: Keyboard Shortcut — Quick Create

**Files:**
- Modify: `apps/desktop/src/hooks/useKeyboardShortcuts.ts` (or wherever shortcuts are registered in AppShell)

We need to find where the G+I shortcut is registered and add a C shortcut (or N shortcut) for creating a new issue. Let me check the actual shortcut registration.

- [ ] **Step 1: Read the keyboard shortcut registration**

Read `apps/desktop/src/components/layout/AppShell.tsx` to find where shortcuts are registered and understand the pattern. Then add a shortcut that opens the create issue dialog.

The approach depends on what we find — either:
- Add global state for `showCreateIssue` in workspaceStore, or
- Use a simpler approach: register the shortcut only on the Issues page

For simplicity, register the shortcut on the Issues page itself using `useEffect`:

In `apps/desktop/src/pages/Issues.tsx`, add a keyboard shortcut effect after the existing hooks:

```typescript
  // Keyboard shortcut: "c" to create new issue (when not in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "c" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        setShowCreateIssue(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/desktop && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/pages/Issues.tsx
git commit -m "feat: add 'c' keyboard shortcut to create issue from Issues page"
```

---

### Task 9: Verification

- [ ] **Step 1: Full Rust check**

Run: `cd apps/desktop/src-tauri && cargo check`
Expected: Compiles successfully

- [ ] **Step 2: Full TypeScript check**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run dev server and manual test**

Run: `pnpm dev`

Test the following:
1. Navigate to Issues page
2. Click the "+ New" button — dialog opens
3. If workspace has multiple repos, verify repo selector appears
4. Enter a title and body
5. Press Cmd+Enter or click "Create Issue" — issue is created on GitHub
6. Verify you're navigated to the new issue detail page
7. Go back to Issues page, verify the new issue appears in the list
8. Press "c" key — dialog opens (keyboard shortcut)
9. Press Escape — dialog closes
10. Try submitting without a title — shows "Title is required" error
11. Try submitting without selecting a repo (multi-repo workspace) — shows error

---

## Verification Summary

1. **Rust compilation**: `cd apps/desktop/src-tauri && cargo check` passes
2. **TypeScript compilation**: `cd apps/desktop && npx tsc --noEmit` passes  
3. **Dev server**: `pnpm dev` — app loads, Issues page works
4. **Create issue flow**: Click "+ New" or press "c" → fill title/body → Cmd+Enter → issue created on GitHub → navigated to detail
5. **Error handling**: Missing title, missing repo, API errors all show user-friendly messages
6. **Query invalidation**: After creating an issue, the issues list refreshes automatically

## Key Design Decisions

1. **No image upload in v1**: GitHub's image upload API requires multipart + session tokens that aren't available via the REST API with OAuth tokens. Deferred to follow-up.
2. **Dialog over chat-box**: The issue says "chat box" but the core need is low-friction issue creation. A dialog with title + body is more practical than a chat-style interface for structured data (issues need a title). The dialog approach matches existing patterns (AddRepoDialog, StartWorkDialog).
3. **Repo auto-selection**: If workspace has one repo, auto-select it. If multiple, show a dropdown. Minimizes clicks.
4. **Cmd+Enter to submit**: Matches GitHub's web UI and the agent chat input pattern.
5. **Navigate to issue on create**: Gives immediate feedback that the issue was created successfully.
6. **"c" keyboard shortcut**: Matches GitHub's web UI shortcut for creating issues.

## Future Enhancements (not in this plan)

- Image upload via GitHub's upload API or external image hosting
- Label picker dropdown
- Assignee picker
- Issue templates
- CLI support for issue creation from terminal
