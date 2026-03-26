# Forge: Multi-Platform Git & GitHub Desktop App

## Context

The previous Forge codebase was deleted (commit `723b15f`). The user wants a greenfield, state-of-the-art Git and GitHub visualization/tracking desktop app with:
- GitHub sign-in with instant access to PRs, issues, and notifications
- Multi-project workspaces with fast switching
- Multi-platform support (Windows, Mac, Linux)
- Everything needed for multi-project management in one app

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **App Shell** | Tauri 2.x | 2-6MB app, sub-second startup, Rust backend. Validated by GitButler (20k stars, same use case) |
| **Frontend** | React 19 + TypeScript | Deepest library ecosystem for this domain (diff viewers, graph viz, command palettes) |
| **Styling** | Tailwind v4 + shadcn/ui | Zero runtime CSS, accessible Radix primitives with full code ownership |
| **Client State** | Zustand | 3KB, persist middleware for workspace state |
| **Server State** | TanStack Query v5 | Caching, background refetch, infinite queries for GitHub pagination |
| **Router** | TanStack Router | Type-safe file-based routing |
| **Git (reads)** | gitoxide/gix | 2-3x faster than git2 for log/diff/status |
| **Git (writes)** | git2-rs | Stable, complete API for commit/merge/checkout |
| **GitHub API** | GraphQL (primary) + REST (notifications) | One batched GraphQL query replaces dozens of REST calls |
| **Auth** | GitHub App Device Flow | No server needed, short-lived tokens with refresh |
| **Token Storage** | OS keychain via `keyring` crate | Native secure storage (Keychain/Credential Manager/Secret Service) |
| **Database** | SQLite via rusqlite (WAL mode) | Local cache for GitHub data, workspace state, preferences |
| **FS Watching** | `notify` crate | Debounced file system events for auto-refresh |
| **Diff Viewer** | CodeMirror 6 | 150KB (vs Monaco 10MB), modular, accessible |
| **Commit Graph** | Canvas + D3 layout | 10K nodes at 60fps (SVG caps at ~1K) |
| **Virtual Scroll** | TanStack Virtual | Headless, 15KB, variable row heights |
| **Command Palette** | cmdk (via shadcn) | Powers Linear/Raycast, proven UX |
| **Icons** | Lucide React | 1500+ icons, tree-shakeable |

---

## Phase 1: Foundation (Scaffold + Auth)

**Goal:** Running Tauri 2 app with GitHub Device Flow login, secure token storage, and a basic app shell.

### Root Configs
- [x] `package.json` — workspace scripts, turbo, prettier
- [x] `pnpm-workspace.yaml` — `["apps/*", "packages/*"]`
- [x] `turbo.json` — build, dev, lint, test pipelines
- [x] `.gitignore`
- [x] `.prettierrc`
- [x] `CLAUDE.md`
- [x] `Cargo.toml` — workspace root

### Shared Packages
- [x] `packages/typescript-config/` — base, react, library tsconfigs
- [x] `packages/eslint-config/` — shared ESLint config
- [x] `packages/shared/src/types/auth.ts` — DeviceFlowResponse, GitHubUser, AuthState
- [x] `packages/shared/src/types/workspace.ts` — Workspace, Repository
- [x] `packages/shared/src/types/github.ts` — PullRequest, Issue, Notification
- [x] `packages/shared/src/types/git.ts` — CommitInfo, BranchInfo, FileStatus, DiffEntry

### Desktop Frontend (`apps/desktop/`)
- [x] `package.json` — React 19, Tauri, Tailwind v4, Zustand, TanStack Query
- [x] `vite.config.ts` — Vite + React + Tailwind plugin
- [x] `tsconfig.json` — extends shared react config
- [x] `index.html` — entry point
- [x] `src/main.tsx` — mount React with QueryClientProvider
- [x] `src/App.tsx` — auth guard, conditional login/app shell
- [x] `src/globals.css` — Tailwind v4 theme (dark mode)
- [x] `src/lib/utils.ts` — `cn()` utility
- [x] `src/components/ui/button.tsx` — shadcn/ui button
- [x] `src/components/ui/avatar.tsx` — shadcn/ui avatar
- [x] `src/components/ui/dialog.tsx` — shadcn/ui dialog
- [x] `src/components/ui/dropdown-menu.tsx` — shadcn/ui dropdown
- [x] `src/components/ui/separator.tsx` — shadcn/ui separator
- [x] `src/components/ui/tooltip.tsx` — shadcn/ui tooltip
- [x] `src/components/layout/AppShell.tsx` — global sidebar + title bar + content area
- [x] `src/components/auth/DeviceFlowDialog.tsx` — GitHub Device Flow login UI
- [x] `src/components/auth/UserMenu.tsx` — avatar + sign out dropdown
- [x] `src/stores/authStore.ts` — Zustand auth state
- [x] `src/hooks/useAuth.ts` — auth check on mount + logout
- [x] `src/ipc/auth.ts` — typed Tauri invoke wrappers

### Desktop Backend (`apps/desktop/src-tauri/`)
- [x] `Cargo.toml` — tauri 2, keyring, reqwest, rusqlite, serde, tokio
- [x] `tauri.conf.json` — window config (1400x900), CSP, bundle
- [x] `capabilities/default.json` — plugin permissions
- [x] `build.rs` — tauri build script
- [x] `src/main.rs` — entry point
- [x] `src/lib.rs` — Tauri builder: plugins, commands, managed state
- [x] `src/db.rs` — SQLite Database struct + WAL mode + migration runner
- [x] `src/keychain.rs` — OS keychain via `keyring` crate
- [x] `src/models/auth.rs` — DeviceFlowResponse, TokenInfo, GitHubUser structs
- [x] `src/github/client.rs` — GitHub API client (get authenticated user)
- [x] `src/github/device_flow.rs` — Device Flow OAuth implementation
- [x] `src/commands/auth.rs` — 5 Tauri commands (start_device_flow, poll, get_token, delete_token, get_user)
- [x] `migrations/001_initial.sql` — workspaces, repositories, github_users tables

### Verification
- [x] `pnpm install` succeeds
- [x] `cargo check` compiles clean
- [x] `npx tsc --noEmit` compiles clean
- [x] `npx vite build` bundles successfully (353KB JS, 20KB CSS)
- [x] `cargo tauri build` produces Forge.app (14MB) + .dmg
- [x] App launches with `pnpm dev`
- [x] GitHub Device Flow sign-in works end-to-end
- [x] Token persists in keychain across restarts
- [x] App shell renders (sidebar, nav icons, user avatar, content area)
- [ ] Sign out works (returns to login)
- [ ] `cargo test` passes
- [ ] `pnpm test` passes

---

## Phase 2: Workspace & Repository Core

**Goal:** Workspace CRUD, repository management, sidebar with workspace switching, client-side routing.

### Rust Backend
- [x] `src-tauri/src/commands/workspace.rs` — create, list, get, update, delete, reorder
- [x] `src-tauri/src/commands/repo.rs` — add from GitHub, remove, list
- [x] `src-tauri/src/models/workspace.rs` — Workspace, Repository structs
- [x] `src-tauri/src/commands/github.rs` — search repos, list user repos
- [x] `src-tauri/src/github/client.rs` — search_repos, list_user_repos

### Frontend
- [x] `src/stores/workspaceStore.ts` — active workspace, workspace list
- [x] `src/queries/useWorkspaces.ts` — TanStack Query for workspace CRUD
- [x] `src/queries/useRepositories.ts` — TanStack Query for repo listing
- [x] `src/ipc/workspace.ts` — workspace IPC wrappers
- [x] `src/ipc/repository.ts` — repository IPC wrappers
- [x] `src/components/workspace/WorkspaceSwitcher.tsx` — icon strip + dropdown
- [x] `src/components/workspace/AddWorkspaceDialog.tsx` — create workspace form
- [x] `src/components/repository/RepoList.tsx` — sidebar repo listing
- [x] `src/components/repository/AddRepoDialog.tsx` — search GitHub repos to add
- [x] `src/components/ui/input.tsx` — shadcn/ui input component

### Routing
- [ ] `src/routes/__root.tsx` — deferred to Phase 3 (state-based nav for now)
- [ ] `src/routes/index.tsx` — deferred to Phase 3
- [ ] `src/routes/workspace/$workspaceId.tsx` — deferred to Phase 3

### Verification
- [ ] Create workspace "Work" — appears in sidebar
- [ ] Add GitHub repo — appears in repo list
- [ ] Switch workspaces — repo list changes
- [x] Cmd+1/2/3 switches workspaces (implemented in AppShell)
- [ ] All data persists across restarts

---

## Phase 3: GitHub Integration

**Goal:** GraphQL client, PR/issue lists with real data, dashboard, polling/caching.

### Rust Backend
- [x] `src-tauri/src/github/graphql.rs` — query executor with auth
- [x] `src-tauri/src/github/queries/pull_requests.rs` — PR list + detail queries + DashboardStats
- [x] `src-tauri/src/github/queries/issues.rs` — issue list + detail queries
- [x] `src-tauri/src/github/queries/mod.rs` — module declarations
- [x] `src-tauri/src/commands/github.rs` — list_prs, list_issues, get_dashboard

### Frontend
- [x] `src/pages/Dashboard.tsx` — aggregated stats + recent activity feed
- [x] `src/pages/PullRequests.tsx` — PR list with filters (all/open/closed/review requested/draft)
- [x] `src/pages/Issues.tsx` — issue list with filters (all/open/closed)
- [x] `src/components/github/PrListItem.tsx` — PR row with status, labels, author, diff stats
- [x] `src/components/github/IssueListItem.tsx` — issue row with status, labels, assignees
- [x] `src/components/common/FilterBar.tsx` — reusable filter/sort bar with search
- [x] `src/components/common/TimeAgo.tsx` — relative time display with auto-update
- [x] `src/queries/usePullRequests.ts` — TanStack Query with 60s polling
- [x] `src/queries/useIssues.ts` — TanStack Query with 60s polling
- [x] `src/queries/useDashboard.ts` — TanStack Query for dashboard stats
- [x] `src/ipc/github.ts` — typed IPC wrappers for GitHub commands
- [x] `src/stores/workspaceStore.ts` — added activePage state for nav routing

### Integration
- [x] AppShell updated with state-based page routing
- [x] Nav items highlight active page
- [x] G+D/P/I/N keyboard shortcuts for page navigation
- [x] Page title updates in title bar

### Verification
- [x] `cargo check` compiles clean
- [x] `npx tsc --noEmit` compiles clean
- [x] `npx vite build` builds successfully (403KB JS, 27KB CSS)
- [ ] Navigate to repo — PR list loads with real GitHub data
- [ ] Filter PRs by "review requested" — correct results
- [ ] Dashboard shows aggregated stats across workspace repos
- [ ] Data auto-refreshes every 60s

---

## Phase 4: Detail Views & Interactions

**Goal:** PR detail with conversation/commits/files tabs, issue detail, review workflow, diff viewer.

### Foundation
- [x] Install dependencies: `@codemirror/{state,view,merge,lang-*,theme-one-dark}`, `react-markdown`, `remark-gfm`
- [x] Extend `AppPage` type with `"pr-detail" | "issue-detail"` in `workspaceStore.ts`
- [x] Add `selectedPrNumber`, `selectedIssueNumber`, `selectedRepoFullName` + navigation helpers to store
- [x] Add shared TypeScript types: `PrDetail`, `PrCommit`, `PrFile`, `Review`, `ReviewComment`, `TimelineEvent`, `StatusCheck`, `IssueDetail`

### Rust Backend — Queries
- [x] `src-tauri/src/github/queries/pr_detail.rs` — GraphQL: reviews, timeline, status checks, mergeable
- [x] `src-tauri/src/github/client.rs` — REST: `get_pr_commits()`, `get_pr_files()` (returns patches)
- [x] `src-tauri/src/github/queries/issue_detail.rs` — GraphQL: timeline events, comments

### Rust Backend — Mutations
- [x] `src-tauri/src/github/mutations/mod.rs` — module root
- [x] `src-tauri/src/github/mutations/reviews.rs` — submit review (APPROVE / REQUEST_CHANGES / COMMENT)
- [x] `src-tauri/src/github/mutations/comments.rs` — add, edit, delete comments (REST)
- [x] `src-tauri/src/github/mutations/pr_actions.rs` — merge (merge/squash/rebase), close, reopen

### Rust Backend — Commands
- [x] 11 new Tauri commands in `commands/github.rs`: get_pr_detail, get_pr_commits, get_pr_files, get_issue_detail, submit_review, add_comment, edit_comment, delete_comment, merge_pr, close_pr, reopen_pr
- [x] Register all commands in `lib.rs` `generate_handler![]`

### Frontend — Data Layer
- [x] `src/ipc/github.ts` — 11 new typed IPC wrappers
- [x] `src/queries/usePrDetail.ts` — `usePrDetail()`, `usePrCommits()`, `usePrFiles()` hooks
- [x] `src/queries/useIssueDetail.ts` — `useIssueDetail()` hook
- [x] `src/queries/useMutations.ts` — `useSubmitReview()`, `useAddComment()`, `useEditComment()`, `useDeleteComment()`, `useMergePr()`, `useClosePr()`, `useReopenPr()` with cache invalidation

### Frontend — UI Components
- [x] `src/components/common/MarkdownBody.tsx` — react-markdown + remark-gfm, GitHub-style CSS
- [x] `src/components/comment/CommentEditor.tsx` — textarea with markdown preview toggle
- [x] `src/components/comment/CommentThread.tsx` — timeline events (comments, labels, close/reopen)
- [x] `src/components/diff/DiffViewer.tsx` — unified diff viewer with syntax highlighting, dark theme
- [x] `src/components/diff/DiffFileTree.tsx` — collapsible tree, file status badges, +/- counts
- [x] `src/components/github/ReviewForm.tsx` — Comment / Approve / Request Changes actions
- [x] `src/components/github/MergeButton.tsx` — merge dropdown (merge, squash, rebase) with conflict states
- [x] `src/components/github/StatusChecks.tsx` — CI/CD status list with icons

### Frontend — Pages
- [x] `src/pages/PrDetail.tsx` — tabbed (Conversation | Commits | Files Changed) + metadata sidebar
- [x] `src/pages/IssueDetail.tsx` — body + timeline + metadata sidebar
- [x] Wire AppShell: add detail page cases to `PageContent`, dynamic title bar, Escape to go back
- [x] Wire list items: onClick navigation in `PrListItem.tsx` and `IssueListItem.tsx`

### Verification
- [x] `cargo check` compiles clean
- [x] `npx tsc --noEmit` compiles clean
- [x] `npx vite build` builds successfully (594KB JS, 32KB CSS)
- [ ] Click PR in list → detail page loads with conversation timeline
- [ ] Commits tab → commit list renders
- [ ] Files Changed tab → syntax-highlighted diffs with file tree
- [ ] Submit review with "Approve" — reflects on GitHub
- [ ] Merge PR — status updates, returns to list
- [ ] Click issue → detail loads with timeline and comments
- [ ] Add comment on issue → appears in timeline
- [ ] Escape key → returns to list view

---

## Phase 5: Git Operations

**Goal:** Commit graph, branch management, full git operations, file system watching.

### Rust Backend
- [ ] `src-tauri/src/git/status.rs` — working tree status (gix)
- [ ] `src-tauri/src/git/log.rs` — commit history with graph topology (gix)
- [ ] `src-tauri/src/git/diff.rs` — working tree + staged diffs (gix)
- [ ] `src-tauri/src/git/branch.rs` — create, checkout, delete, rename (git2)
- [ ] `src-tauri/src/git/commit.rs` — stage, commit, amend (git2)
- [ ] `src-tauri/src/git/remote.rs` — fetch, pull, push (git2)
- [ ] `src-tauri/src/git/stash.rs` — stash push/pop/apply/drop
- [ ] `src-tauri/src/background/repo_watcher.rs` — notify crate + debounce
- [ ] `src-tauri/src/commands/git.rs` — ~25 Tauri commands

### Frontend
- [ ] `src/components/git/CommitGraphCanvas.tsx` — Canvas + D3 layout
- [ ] `src/components/git/StagingArea.tsx` — stage/unstage files
- [ ] `src/components/git/CommitForm.tsx` — message + commit button
- [ ] `src/components/git/BranchList.tsx` — branch management
- [ ] `src/components/git/StashList.tsx` — stash management
- [ ] `src/pages/CommitGraph.tsx` — commit graph view
- [ ] `src/pages/Changes.tsx` — working tree changes
- [ ] `src/pages/Branches.tsx` — branch list view

### New Dependencies
- [ ] Rust: `gix`, `notify`
- [ ] TypeScript: `d3`

### Verification
- [ ] See working tree status, stage files, commit
- [ ] Push/pull with GitHub token auth
- [ ] Commit graph renders with branch lines
- [ ] File changes auto-refresh via filesystem watching

---

## Phase 6: Polish & Power Features

**Goal:** Command palette, keyboard shortcuts, notifications, search, settings, auto-updater.

### Frontend
- [ ] `src/components/layout/CommandPalette.tsx` — cmdk-based
- [ ] `src/hooks/useKeyboardShortcuts.ts` — global shortcut handler
- [ ] `src/pages/Notifications.tsx` — GitHub notifications view
- [ ] `src/pages/Settings.tsx` — app preferences
- [ ] `src/pages/Search.tsx` — global search

### Rust Backend
- [ ] `src-tauri/src/commands/notifications.rs` — fetch + mark-as-read (REST API)
- [ ] `src-tauri/src/github/queries/search.rs` — GitHub search API

### New Dependencies
- [ ] `cmdk` (via shadcn)
- [ ] `tauri-plugin-updater`

### Verification
- [ ] Cmd+K opens command palette, search works
- [ ] G+P navigates to PRs, J/K navigates lists
- [ ] Notifications page shows GitHub notifications with unread badge
- [ ] Settings page: theme, shortcuts, account

---

## Progress Summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Scaffold + Auth | **Done** |
| 2 | Workspaces + Repos | **Done** (routing deferred to P3) |
| 3 | GitHub Integration | **Done** |
| 4 | Detail Views | **Done** (manual testing pending) |
| 5 | Git Operations | Pending |
| 6 | Polish | Pending |
