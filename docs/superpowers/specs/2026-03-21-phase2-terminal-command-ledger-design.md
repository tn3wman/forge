# Phase 2: Terminal Grid + Command Ledger — Design Spec

## Context

Forge's Phase 1 delivered the editor foundation (Monaco, split panes, multi-tab, LSP). Phase 2 addresses the core pain point: **"No agent action visibility"** — users can't see what commands ran, what changed, or what failed. This phase adds:

1. **Terminal Grid**: Interactive terminals in a bottom panel (xterm.js + portable-pty)
2. **Command Ledger**: Execution tracking with full metadata, queryable history, and replay

These are tightly coupled — agents execute commands programmatically (logged to the ledger), and users work interactively in terminals (scoped per-bay).

**Scope**: Roadmap items 2.01–2.05, 2.07–2.13. **Deferred**: 2.06 (session persistence), shell integration for interactive command detection, terminal grid tiling (tabs first).

---

## 1. Rust PTY Backend

### 1.1 Dependencies

Add to `apps/desktop/src-tauri/Cargo.toml`:

```toml
portable-pty = "0.8"
```

### 1.2 Module Structure

```
src-tauri/src/pty/
  mod.rs          # module declarations
  instance.rs     # PtyInstance: wraps a single PTY session
  manager.rs      # PtyManager: manages all PTY instances
```

### 1.3 PtyInstance (`instance.rs`)

Wraps one terminal session:

- **Fields**: `id` (UUID), `bay_id`, `label`, `cwd`, PTY master (read/write), child process, writer (`Arc<Mutex<Box<dyn Write + Send>>>`), kill signal channel
- **`spawn(bay_id, cwd, cols, rows, app_handle)`**: Opens PTY pair via `native_pty_system()`, spawns user's `$SHELL` (fallback `/bin/zsh`), starts `tokio::spawn_blocking` reader loop that emits `pty:data` events
- **`write(data)`**: Writes user input to PTY master writer. **Must use `spawn_blocking`** — portable-pty's write is blocking FFI.
- **`resize(cols, rows)`**: Calls `master.resize(PtySize { rows, cols, .. })`. **Must use `spawn_blocking`** — portable-pty's resize is blocking FFI.
- **`kill()`**: Sends kill signal, waits for child, stops reader task

### 1.4 PtyManager (`manager.rs`)

Mirrors `LspManager` pattern — `Mutex<HashMap<String, PtyInstance>>` keyed by `terminal_id`.

Methods: `spawn_terminal`, `write_to_terminal`, `resize_terminal`, `kill_terminal`, `kill_all_for_bay`, `rename_terminal`, `list_terminals_for_bay`.

### 1.5 Tauri Commands (`commands/pty.rs`)

| Command        | Params                            | Returns             |
| -------------- | --------------------------------- | ------------------- |
| `pty_spawn`    | `bay_id, cwd, cols, rows, label?` | `TerminalInfo`      |
| `pty_write`    | `terminal_id, data: String`       | `()`                |
| `pty_resize`   | `terminal_id, cols, rows`         | `()`                |
| `pty_kill`     | `terminal_id`                     | `()`                |
| `pty_kill_all` | `bay_id`                          | `()`                |
| `pty_rename`   | `terminal_id, label`              | `()`                |
| `pty_list`     | `bay_id`                          | `Vec<TerminalInfo>` |

### 1.6 Tauri Events (Backend → Frontend)

| Event                   | Payload                                    | Purpose                                |
| ----------------------- | ------------------------------------------ | -------------------------------------- |
| `pty:data:{terminalId}` | `{ terminalId, data: string }`             | PTY output stream (scoped event)       |
| `pty:exit:{terminalId}` | `{ terminalId, exitCode: number \| null }` | Terminal process exited (scoped event) |

PTY output is base64-encoded on the Rust side (`base64` crate) and decoded on the frontend (`atob` → `Uint8Array`). This avoids the ~4x overhead of JSON `number[]` serialization. Events are scoped per-terminal (`pty:data:{terminalId}`) so only the relevant `useTerminal` listener fires — avoids O(terminals × events) filtering.

---

## 2. Command Ledger Backend

### 2.1 Database Schema (`migrations/002_command_ledger.sql`)

```sql
CREATE TABLE IF NOT EXISTS command_ledger (
  id TEXT PRIMARY KEY,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  lane_id TEXT,
  agent_id TEXT,
  terminal_id TEXT,
  command TEXT NOT NULL,
  cwd TEXT NOT NULL,
  env TEXT,                    -- JSON of env overrides
  status TEXT NOT NULL DEFAULT 'running',
  exit_code INTEGER,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  duration_ms INTEGER,
  stdout_preview TEXT,         -- first ~4KB
  stderr_preview TEXT,         -- first ~4KB
  metadata TEXT                -- JSON: additional context
);

CREATE INDEX idx_command_ledger_bay ON command_ledger(bay_id);
CREATE INDEX idx_command_ledger_lane ON command_ledger(lane_id);
CREATE INDEX idx_command_ledger_agent ON command_ledger(agent_id);
CREATE INDEX idx_command_ledger_status ON command_ledger(status);
CREATE INDEX idx_command_ledger_time ON command_ledger(started_at);
```

**Why a separate table (not `events`)**: Command entries are mutable (status transitions). The `events` table still receives immutable `command.executed` events referencing ledger IDs — maintaining the event-sourcing audit trail.

### 2.2 Rust Model (`models/command.rs`)

`CommandEntry` struct with serde `camelCase` rename. Fields match schema columns.

### 2.3 Tauri Commands (`commands/command_ledger.rs`)

| Command                   | Purpose                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `command_ledger_insert`   | Log new command (status=running)                                     |
| `command_ledger_complete` | Update with exit_code, duration, previews                            |
| `command_ledger_query`    | Filtered query (bay, lane, agent, status, time range, limit, offset) |
| `command_ledger_get`      | Get single entry by ID                                               |
| `command_execute`         | **Programmatic execution**: spawn → capture → log → return           |

### 2.4 Programmatic Execution Flow (`command_execute`)

1. Acquire DB lock, INSERT into `command_ledger` (status=running), **release DB lock**
2. Spawn via `tokio::process::Command::new("sh").arg("-c").arg(command)` with captured stdout/stderr
3. Wait for exit, capture exit code and output previews (first ~4KB, truncated at UTF-8 char boundary via `str::floor_char_boundary()`)
4. Acquire DB lock, UPDATE ledger row (status=completed/failed, exit_code, duration_ms, previews), INSERT into `events` table (type=`command.executed`), **release DB lock**
5. Emit `command-ledger:updated` Tauri event for UI refresh
6. Return completed `CommandEntry`

**Important**: The DB `Mutex` must NOT be held across the `.await` on the child process — this would deadlock all other database operations. Acquire/release the lock in separate scopes around each SQL operation.

### 2.5 Command Logging Strategy

- **Programmatic commands** (agents, system): Always logged via `command_execute`
- **Interactive terminal commands**: Not logged in v1. The terminal is "just a terminal." Shell integration (OSC 133) deferred to a future enhancement.

---

## 3. TypeScript Types & IPC

### 3.1 Core Types

**`packages/core/src/types/terminal.ts`**:

```typescript
export interface TerminalInfo {
  id: string;
  bayId: string;
  label: string;
}
export interface PtyDataEvent {
  terminalId: string;
  data: string;
} // base64-encoded
export interface PtyExitEvent {
  terminalId: string;
  exitCode: number | null;
} // null when killed by signal
```

**`packages/core/src/types/command.ts`**:

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

### 3.2 IPC Wrappers

**`apps/desktop/src/ipc/pty.ts`**: 1:1 wrappers for all `pty_*` commands via `invoke()`.

**`apps/desktop/src/ipc/commandLedger.ts`**: 1:1 wrappers for all `command_ledger_*` and `command_execute` commands.

---

## 4. React Hooks

### 4.1 `useTerminal(terminalId, containerRef)`

Manages a single xterm.js ↔ PTY connection:

- Creates `Terminal` instance, attaches `FitAddon`, mounts to container div
- Listens to `pty:data` events (filtered by terminalId) → writes to xterm
- Listens to `pty:exit` events → marks exited
- Hooks `terminal.onData` → `ptyIpc.write()` (user input)
- Hooks `terminal.onResize` → `ptyIpc.resize()`
- `ResizeObserver` on container → `fitAddon.fit()`
- Cleanup: dispose xterm, remove listeners
- **Returns**: `{ terminal, isExited, exitCode }`

### 4.2 `useTerminalTabs(bayId)`

useReducer pattern (mirrors `usePaneLayout`):

- **State**: `{ tabs: TerminalTab[], activeTabId: string | null }`
- **Actions**: `ADD_TAB`, `REMOVE_TAB`, `SELECT_TAB`, `RENAME_TAB`, `MARK_EXITED`, `SET_TABS`
- Coordinates with `ptyIpc`: addTab → `pty_spawn`, removeTab → `pty_kill`
- **Returns**: `{ tabs, activeTabId, addTab, removeTab, selectTab, renameTab, markExited }`

### 4.3 `useCommandLedger(bayId, filters?)`

- Queries `commandLedgerIpc.query()` on mount and filter changes
- Listens to `command-ledger:updated` Tauri event for auto-refresh
- **Returns**: `{ commands, isLoading, refresh, filters, setFilters }`

---

## 5. React Components

### 5.1 Terminal Components (`src/components/Terminal/`)

**TerminalPanel**: Bottom panel container. Contains TerminalTabBar + active TerminalView. Resizable via drag handle (persisted via `bottomTrayHeight` in WindowState). Keyboard shortcuts: `Ctrl+\`` toggle, `Ctrl+Shift+\`` new terminal.

**TerminalTabBar**: Tab buttons with active highlight, "+" button, double-click to rename (inline edit → `ptyIpc.rename()`), "x" to close/kill, exit code badge on exited terminals.

**TerminalView**: `<div ref={containerRef}>` + `useTerminal` hook. Inactive tabs hidden via `display: none` (preserves xterm scrollback state without unmounting).

### 5.2 Command Ledger Components (`src/components/CommandLedger/`)

**CommandHistory**: Scrollable list in right sidebar tab. Each entry: command text (monospace, truncated), status icon (spinner/check/x), duration, timestamp. Click to expand.

**CommandFilters**: Filter bar at top — lane, agent, status dropdowns, time range picker.

**CommandDetail**: Expanded view — full command, cwd, exit code, duration, stdout/stderr previews, "Replay" button (calls `command_execute` with same params), "Copy" button. Lane/agent tags as badges.

---

## 6. Layout Integration

### 6.1 CenterPanel Update

Add vertical flex layout:

```
┌─────────────────────────────┐
│  Editor Pane Tree (flex: 1) │
├─────────────────────────────┤  ← ResizeHandle (horizontal drag bar)
│  TerminalPanel (height:     │
│  bottomTrayHeight)          │
└─────────────────────────────┘
```

### 6.2 RightRail Update

Add tabbed sidebar with "Commands" tab (default) rendering CommandHistory. Future tabs: Lanes, Agents (later phases).

### 6.3 Bay Scoping

All terminals and commands scoped to `bay_id`. On bay close: `ptyIpc.killAll(bayId)` (mirrors `lspIpc.stopAll(bayId)`). Ledger entries persist in SQLite for historical viewing.

---

## 7. Data Flow

### Interactive Terminal I/O

```
User types → xterm.onData → ptyIpc.write(terminalId, data) → Rust pty_write
  → PtyInstance.writer → PTY master fd → Shell processes → Shell output
  → PTY reader task → app.emit("pty:data") → useTerminal listener → xterm.write()
```

### Programmatic Command Execution (Agent Path)

```
Agent calls commandLedgerIpc.execute({ bayId, command, cwd, laneId, agentId })
  → Rust command_execute → INSERT ledger (running) → tokio::process::Command
  → Capture stdout/stderr → UPDATE ledger (completed) → INSERT events
  → emit("command-ledger:updated") → useCommandLedger auto-refreshes
```

---

## 8. Implementation Sequence

| Step | Scope                  | Items           | Key Files                                                                               |
| ---- | ---------------------- | --------------- | --------------------------------------------------------------------------------------- |
| 1    | Rust PTY foundation    | 2.01, 2.02      | `pty/instance.rs`, `pty/manager.rs`, `commands/pty.rs`, `lib.rs`                        |
| 2    | Frontend terminal      | 2.01 (frontend) | `ipc/pty.ts`, `hooks/useTerminal.ts`, `Terminal/TerminalView.tsx`                       |
| 3    | Multi-terminal tabs    | 2.03, 2.04      | `hooks/useTerminalTabs.ts`, `Terminal/TerminalTabBar.tsx`, `Terminal/TerminalPanel.tsx` |
| 4    | Command Ledger backend | 2.07–2.09       | `migrations/002_*.sql`, `models/command.rs`, `commands/command_ledger.rs`               |
| 5    | Command tagging        | 2.10            | lane_id/agent_id flow in insert/execute/query                                           |
| 6    | Command History UI     | 2.11, 2.12      | `ipc/commandLedger.ts`, `hooks/useCommandLedger.ts`, `CommandLedger/*.tsx`              |
| 7    | Replay                 | 2.13            | "Replay" button in CommandDetail                                                        |

---

## 9. Key Technical Decisions

1. **Base64 PTY streaming**: PTY output is base64-encoded on Rust side (`base64` crate), decoded on frontend (`atob` → `Uint8Array` → xterm.write). ~4x smaller than JSON `number[]`.
2. **xterm instances stay mounted**: Hidden via `display: none` when inactive — preserves scrollback without unmount/remount complexity.
3. **Separate `command_ledger` table**: Mutable command state needs structured columns, not opaque event payloads. Events table still records audit trail.
4. **Programmatic-only command logging**: Interactive terminal commands not logged in v1. Agents use `command_execute` which always logs.
5. **Tabs first, grid later**: Terminal panel uses tabs initially. Tiling (reusing PaneNode tree) added as a follow-up.
6. **portable-pty blocking I/O**: Reader runs in `tokio::spawn_blocking`. Writer and resize calls also use `spawn_blocking` — all portable-pty FFI is blocking.
7. **Scoped Tauri events**: Use `pty:data:{terminalId}` instead of global `pty:data` to avoid O(terminals × events) filtering.
8. **DB lock discipline**: `command_execute` must not hold the DB `Mutex` across `.await` boundaries — acquire/release in separate scopes.
9. **Migration system**: `Database::run_migrations()` currently hardcodes `001_initial.sql`. Must be updated to also include `002_command_ledger.sql`.
10. **`pty_write` accepts `String`**: xterm.js `onData` provides a string. Accept `String` on Rust side, convert to bytes there — avoids wasteful frontend conversion to number arrays.

---

## 10. Deferred Items

- **2.06**: Terminal session persistence (save/restore shell state across restarts)
- **Shell integration**: OSC 133 escape sequences for interactive command detection
- **Terminal tiling**: Split terminal views within the bottom panel
- **Find in terminal**: Search terminal scrollback
- **`command_execute` timeout**: Optional `timeout_ms` parameter for programmatic commands

---

## 10.1 Implementation Notes

- **PTY spawn failure**: `addTab` in `useTerminalTabs` must be async — call `pty_spawn` first, dispatch `ADD_TAB` only on success. Show error toast on failure.
- **Terminal limit**: Soft cap of 10 terminals per bay. Warn user if exceeded.
- **Resize throttling**: Throttle `ResizeObserver` → `fitAddon.fit()` → `ptyIpc.resize()` chain (100ms debounce) to avoid flooding Rust during window drag.
- **Ledger refresh debounce**: Debounce `command-ledger:updated` re-queries in `useCommandLedger` (200ms) for rapid agent command execution.
- **Reader task errors**: If PTY reader encounters I/O error, emit `pty:exit:{terminalId}` with `exitCode: null` and log the error.
- **Terminal panel default**: Collapsed by default. Initial `bottomTrayHeight: 250`. Minimum height: 100px.

---

## 11. Verification

1. **Rust tests**: PTY spawn/write/kill lifecycle, command ledger CRUD, programmatic execution
2. **TypeScript tests**: useTerminal hook (mock Tauri events), useTerminalTabs reducer, useCommandLedger query/refresh
3. **Integration test**: `pnpm dev` → open terminal → type commands → verify output streams. Execute programmatic command → verify it appears in Command History.
4. **Cross-check**: `cd apps/desktop/src-tauri && cargo test` for Rust, `pnpm test` for TypeScript

---

## Critical Files to Modify

| File                                           | Change                                                        |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `apps/desktop/src-tauri/Cargo.toml`            | Add `portable-pty` dependency                                 |
| `apps/desktop/src-tauri/src/lib.rs`            | Register PtyManager, add migrations, register commands        |
| `apps/desktop/src-tauri/src/db.rs`             | Update `run_migrations()` to include `002_command_ledger.sql` |
| `apps/desktop/src/screens/Bay/CenterPanel.tsx` | Add bottom terminal panel with resize divider                 |
| `packages/core/src/types/index.ts`             | Export new terminal and command types                         |

## Existing Patterns to Reuse

| Pattern                       | Source File                                  |
| ----------------------------- | -------------------------------------------- |
| Long-lived process manager    | `src-tauri/src/lsp/manager.rs`               |
| Tauri event streaming         | `src-tauri/src/commands/fs.rs` (FileWatcher) |
| SQLite CRUD + dynamic filters | `src-tauri/src/commands/event_store.rs`      |
| useReducer state management   | `src/hooks/usePaneLayout.ts`                 |
| IPC wrapper pattern           | `src/ipc/lspIpc.ts`                          |
| Tab bar component             | `src/components/TabBar/TabBar.tsx`           |
