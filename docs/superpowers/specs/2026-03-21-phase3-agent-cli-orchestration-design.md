# Phase 3: Agent CLI Orchestration Layer — Design Specification

**Date:** 2026-03-21
**Status:** Draft
**Scope:** Tasks 3.01–3.15 (reinterpreted for CLI wrapping)

---

## 1. Problem

Forge currently has a workspace shell (Harbor, Bays, Lanes, Terminal, Editor) but no agent execution capability. The original design spec called for building LLM adapters from scratch — but battle-tested agent CLIs (Claude Code, Codex) already solve the hard problems of agentic coding (LLM interaction, tool calling, file editing, multi-step reasoning).

Building from scratch would duplicate months of engineering that these tools have already shipped, while wrapping them gives Forge agentic capabilities immediately and lets it focus on what makes it unique: multi-project orchestration, parallel Lanes, visual audit trails, and permission scoping.

## 2. Decision

**Forge wraps existing agent CLIs as managed subprocesses**, following the same pattern already used for PTY terminals. Each Lane spawns one agent CLI process. Forge provides orchestration, UI, and observability — the CLIs handle LLM reasoning.

### Initial CLI targets

- **Claude Code** (`claude -p --output-format=stream-json`)
- **OpenAI Codex** (`codex cloud exec`)

### Key architecture decisions

| Decision              | Choice                                   | Rationale                                              |
| --------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Subprocess management | Rust (extends PTY pattern)               | Consistent with existing architecture                  |
| Streaming protocol    | Tauri events (`agent:data:{id}`)         | Proven pattern from PTY                                |
| Lane mapping          | One subprocess per Lane                  | Clean isolation, lifecycle alignment                   |
| Approval handling     | Trust the CLI's own approval             | CLIs already handle this well; Forge observes and logs |
| Config UI             | Agent CLI registry with per-role mapping | Users configure which CLI handles which role           |

---

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ useAgent │  │ LaneView │  │ AgentConfigPanel  │ │
│  │  hook    │──│  (UI)    │  │  (CLI registry)   │ │
│  └────┬─────┘  └──────────┘  └───────────────────┘ │
│       │ listen(`agent:data:{id}`)                    │
├───────┼─────────────────────────────────────────────┤
│       │        Tauri IPC + Events                    │
├───────┼─────────────────────────────────────────────┤
│  ┌────▼──────────────────────────────────────────┐  │
│  │              AgentManager (Rust)                │  │
│  │  HashMap<String, AgentInstance>                 │  │
│  │  ├── spawn_agent(cli, prompt, config)          │  │
│  │  ├── send_to_agent(id, message)                │  │
│  │  ├── kill_agent(id)                            │  │
│  │  └── list_agents_for_bay(bay_id)               │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │              AgentInstance (Rust)               │  │
│  │  ├── Child process (claude / codex)            │  │
│  │  ├── stdin writer (send follow-up prompts)     │  │
│  │  ├── stdout reader thread → Tauri events       │  │
│  │  └── stderr reader thread → error events       │  │
│  └────────────────────────────────────────────────┘  │
│                   Rust Backend                        │
└─────────────────────────────────────────────────────┘
```

### 3.2 AgentInstance (Rust)

Mirrors `PtyInstance` but spawns an agent CLI instead of a shell. Key differences from PTY:

| Aspect    | PtyInstance                 | AgentInstance                   |
| --------- | --------------------------- | ------------------------------- |
| Process   | Shell via portable-pty      | CLI via `std::process::Command` |
| stdin     | Raw terminal bytes          | UTF-8 text (follow-up prompts)  |
| stdout    | Raw terminal bytes (base64) | UTF-8 JSON lines (parsed)       |
| Events    | `pty:data:{id}`             | `agent:data:{id}`               |
| Lifecycle | Long-lived (user terminal)  | Task-scoped (Lane goal)         |

**Struct fields:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    pub id: String,
    pub bay_id: String,
    pub lane_id: String,
    pub cli_type: CliType,
    pub status: AgentStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedCli {
    pub cli_type: CliType,
    pub path: String,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CliType {
    ClaudeCode,
    Codex,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Running,
    Completed,
    Failed,
    Killed,
}

// Internal only — not serialized across IPC
pub struct AgentInstance {
    pub id: String,
    pub bay_id: String,
    pub lane_id: String,
    pub cli_type: CliType,
    pub status: AgentStatus,
    writer: Arc<Mutex<ChildStdin>>,
    child: Arc<Mutex<Child>>,
}
```

**Spawn sequence** (Child/ChildStdin ownership):

```rust
// In AgentInstance::spawn():
let mut child = Command::new(&cli_path)
    .args(&args)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .current_dir(&config.cwd)
    .envs(&config.env)
    .spawn()
    .map_err(|e| format!("Failed to spawn agent CLI: {e}"))?;

// Take ownership of stdin, stdout, stderr BEFORE wrapping child
let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;
let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

let writer = Arc::new(Mutex::new(stdin));
let child = Arc::new(Mutex::new(child));

// Spawn stdout reader thread (JSON lines → agent:data events)
// Spawn stderr reader thread (error lines → agent:error events)
// IDs use uuid::Uuid::now_v7() (matching PtyManager pattern)
```

**Event types emitted:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
// Tauri event: `agent:data:{id}`
pub struct AgentDataEvent {
    pub agent_id: String,
    pub data: String,              // raw JSON line from CLI stdout
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
// Tauri event: `agent:error:{id}`
pub struct AgentErrorEvent {
    pub agent_id: String,
    pub error: String,             // stderr line
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
// Tauri event: `agent:exit:{id}`
pub struct AgentExitEvent {
    pub agent_id: String,
    pub exit_code: Option<i32>,
    pub status: AgentStatus,
}
```

### 3.3 AgentManager (Rust)

Follows `PtyManager` pattern exactly:

```rust
pub struct AgentManager {
    instances: Arc<Mutex<HashMap<String, AgentInstance>>>,
}

impl AgentManager {
    pub fn spawn_agent(&self, config: SpawnAgentConfig, app: AppHandle) -> Result<AgentInfo, String>;
    pub fn send_message(&self, agent_id: &str, message: &str) -> Result<(), String>;
    pub fn kill_agent(&self, agent_id: &str) -> Result<(), String>;
    pub fn kill_all_for_bay(&self, bay_id: &str) -> Result<(), String>;
    pub fn list_agents_for_bay(&self, bay_id: &str) -> Result<Vec<AgentInfo>, String>;
    pub fn get_agent_status(&self, agent_id: &str) -> Result<AgentStatus, String>;
}
```

**SpawnAgentConfig:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnAgentConfig {
    pub bay_id: String,
    pub lane_id: String,
    pub cli_type: CliType,
    pub prompt: String,
    pub cwd: String,
    pub model: Option<String>,          // --model flag override
    pub system_prompt: Option<String>,  // --system-prompt
    pub allowed_tools: Vec<String>,     // --allowedTools
    pub session_id: Option<String>,     // --session-id (for resuming)
    pub env: HashMap<String, String>,   // env vars — API keys are inherited from parent process, not stored by Forge
}
```

### 3.4 CLI Adapters (Rust)

Each adapter knows how to construct the command for its CLI:

```rust
pub trait CliAdapter {
    fn build_command(&self, config: &SpawnAgentConfig) -> Command;
    fn default_executable(&self) -> &str;  // e.g., "claude", "codex"
}

// Detection is a standalone function, not a trait method
// (avoids static dispatch issues — detection doesn't need polymorphism)
pub fn detect_installed_clis() -> Result<Vec<DetectedCli>, String> {
    // Runs `which claude`, `which codex`, then `--version` for each found
}
```

**Claude Code adapter builds:**

```sh
claude -p \
  --output-format=stream-json \
  --session-id={lane_id} \
  --model={model} \
  --system-prompt="{system_prompt}" \
  --allowedTools="{tools}" \
  "{prompt}"
```

**Codex adapter builds (provisional):**

> **Note:** The Codex CLI's programmatic interface (`codex cloud exec`) is less mature than Claude Code's headless mode. The Codex adapter is shipped as provisional — it may need adjustment as the Codex CLI stabilizes. Claude Code is the primary and fully-supported adapter.

```sh
codex cloud exec \
  --model={model} \
  "{prompt}"
```

### 3.5 Tauri Commands

New file: `src-tauri/src/commands/agent.rs`

```rust
// All commands are async + spawn_blocking to avoid blocking the Tauri main thread
// (matches pty_write/pty_resize pattern in commands/pty.rs)

#[tauri::command]
pub async fn agent_spawn(config: SpawnAgentConfig, app: AppHandle, state: State<'_, AgentManager>) -> Result<AgentInfo, String> {
    let manager = state.inner().clone();
    tokio::task::spawn_blocking(move || manager.spawn_agent(config, app))
        .await.map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn agent_send(agent_id: String, message: String, state: State<'_, AgentManager>) -> Result<(), String> {
    let manager = state.inner().clone();
    tokio::task::spawn_blocking(move || manager.send_message(&agent_id, &message))
        .await.map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub fn agent_kill(agent_id: String, state: State<AgentManager>) -> Result<(), String> {
    state.kill_agent(&agent_id)
}

#[tauri::command]
pub fn agent_kill_all(bay_id: String, state: State<AgentManager>) -> Result<(), String> {
    state.kill_all_for_bay(&bay_id)
}

#[tauri::command]
pub fn agent_list(bay_id: String, state: State<AgentManager>) -> Result<Vec<AgentInfo>, String> {
    state.list_agents_for_bay(&bay_id)
}

#[tauri::command]
pub fn agent_status(agent_id: String, state: State<AgentManager>) -> Result<AgentStatus, String> {
    state.get_agent_status(&agent_id)
}

// CLI detection — runs `which` commands, inherently blocking
#[tauri::command]
pub async fn agent_detect_clis() -> Result<Vec<DetectedCli>, String> {
    tokio::task::spawn_blocking(detect_installed_clis)
        .await.map_err(|e| format!("Task join error: {e}"))?
}
```

**Note:** `detect_installed_clis()` is a standalone function (not a trait method) that runs `which claude` and `which codex`, then calls `--version` to get version info. This avoids the static trait method issue — detection doesn't need polymorphic dispatch.

---

## 4. TypeScript Layer

### 4.1 Types

New file: `packages/core/src/types/agentCli.ts`

```typescript
export type CliType = 'claude_code' | 'codex';

export type AgentStatus = 'running' | 'completed' | 'failed' | 'killed';

export interface AgentInfo {
  id: string;
  bayId: string;
  laneId: string;
  cliType: CliType;
  status: AgentStatus;
}

export interface SpawnAgentConfig {
  bayId: string;
  laneId: string;
  cliType: CliType;
  prompt: string;
  cwd: string;
  model?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  sessionId?: string;
  env?: Record<string, string>;
}

// Parsed from Claude Code's stream-json output
export type AgentStreamEvent =
  | { type: 'assistant'; message: AssistantMessage }
  | { type: 'tool_use'; name: string; id: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; output: string; is_error: boolean }
  | { type: 'result'; text: string; cost: number; duration: number }
  | { type: 'error'; error: string };

export interface AssistantMessage {
  text: string;
  model: string;
}

export interface DetectedCli {
  cliType: CliType;
  path: string;
  version?: string;
}

// Agent CLI configuration (stored in DB)
export interface AgentCliConfig {
  id: string;
  cliType: CliType;
  displayName: string;
  executablePath: string;
  defaultModel?: string;
  defaultAllowedTools?: string[];
  isDefault: boolean;
  createdAt: string;
}

// Per-role CLI mapping
export interface RoleCliMapping {
  role: AgentRole;
  cliConfigId: string;
  modelOverride?: string;
  systemPromptOverride?: string;
  allowedToolsOverride?: string[];
}
```

### 4.2 IPC Wrappers

New file: `apps/desktop/src/ipc/agent.ts`

```typescript
export const agentIpc = {
  spawn: (config: SpawnAgentConfig) => invoke<AgentInfo>('agent_spawn', config),
  send: (agentId: string, message: string) => invoke<void>('agent_send', { agentId, message }),
  kill: (agentId: string) => invoke<void>('agent_kill', { agentId }),
  killAll: (bayId: string) => invoke<void>('agent_kill_all', { bayId }),
  list: (bayId: string) => invoke<AgentInfo[]>('agent_list', { bayId }),
  status: (agentId: string) => invoke<AgentStatus>('agent_status', { agentId }),
  detectClis: () => invoke<DetectedCli[]>('agent_detect_clis'),
};
```

### 4.3 useAgent Hook

New file: `apps/desktop/src/hooks/useAgent.ts`

Follows the `useTerminal` pattern:

```typescript
export function useAgent(agentId: string | null) {
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<AgentStatus>('running');
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    if (!agentId) return;

    const unlistenData = listen<AgentDataEvent>(`agent:data:${agentId}`, (event) => {
      const parsed = parseAgentLine(event.payload.data);
      if (parsed) setEvents((prev) => [...prev, parsed]);
    });

    const unlistenError = listen<AgentErrorEvent>(`agent:error:${agentId}`, (event) => {
      setErrors((prev) => [...prev, event.payload.error]);
    });

    const unlistenExit = listen<AgentExitEvent>(`agent:exit:${agentId}`, (event) => {
      setStatus(event.payload.status);
      setExitCode(event.payload.exitCode);
    });

    return () => {
      unlistenData.then((f) => f());
      unlistenError.then((f) => f());
      unlistenExit.then((f) => f());
    };
  }, [agentId]);

  return { events, errors, status, exitCode };
}
```

**`parseAgentLine` location:** `packages/core/src/parsers/agentStream.ts`

Each CLI adapter has its own raw→normalized parser:

- `parseClaudeCodeLine(line: string): AgentStreamEvent | null` — handles Claude Code's `stream-json` format (maps `message_start`, `content_block_delta`, etc. to normalized `AgentStreamEvent`)
- `parseCodexLine(line: string): AgentStreamEvent | null` — handles Codex output format

The `parseAgentLine` function dispatches to the right parser based on a `cliType` parameter (passed via the hook or stored in the event metadata).

**Note on Claude Code's actual stream-json format:** Claude Code emits events like `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`, and `result`. The `AgentStreamEvent` type is the **normalized** output — the parser maps raw CLI events to this simplified union. The Codex adapter has its own raw format that normalizes to the same types.

---

## 5. Database Schema

### 5.1 New Migration: `003_agent_cli.sql`

```sql
-- Agent CLI configurations (which CLIs are available)
CREATE TABLE IF NOT EXISTS agent_cli_configs (
  id TEXT PRIMARY KEY,
  cli_type TEXT NOT NULL,                    -- 'claude_code' | 'codex'
  display_name TEXT NOT NULL,
  executable_path TEXT NOT NULL,
  default_model TEXT,
  default_allowed_tools TEXT,                -- JSON array
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Per-role CLI mapping (which CLI handles which agent role)
CREATE TABLE IF NOT EXISTS role_cli_mappings (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  cli_config_id TEXT NOT NULL REFERENCES agent_cli_configs(id) ON DELETE CASCADE,
  model_override TEXT,
  system_prompt_override TEXT,
  allowed_tools_override TEXT,               -- JSON array
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(role)
);

CREATE INDEX IF NOT EXISTS idx_role_cli_mappings_role ON role_cli_mappings(role);

-- Agent session log (tracks each agent subprocess lifecycle)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  lane_id TEXT NOT NULL,
  cli_type TEXT NOT NULL,
  cli_config_id TEXT REFERENCES agent_cli_configs(id),
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',     -- running | completed | failed | killed
  exit_code INTEGER,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  model TEXT,
  token_usage TEXT                            -- JSON: { input, output }
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_bay_id ON agent_sessions(bay_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_lane_id ON agent_sessions(lane_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
```

---

## 6. Database Lifecycle and Migration Strategy

### 6.1 Relationship with existing `agent_configs` table

Migration `001_initial.sql` created an `agent_configs` table (id, role, name, model_id, permissions, system_prompt). This table was designed for the original "build from scratch" approach where Forge managed agent configurations directly.

**Decision:** The `agent_configs` table is **superseded** by the new `agent_cli_configs` + `role_cli_mappings` tables. However, we do NOT drop the old table in the migration — it may contain user data from Phase 0 testing. Instead:

- Migration `003_agent_cli.sql` creates the new tables alongside the old one
- The `lanes.agent_id` column continues to reference logical agent IDs (now mapped through `role_cli_mappings`)
- The `lanes.model_id` column is superseded by the CLI config's `default_model` — it remains in the schema but is no longer the source of truth for model selection
- A future cleanup migration can drop `agent_configs` once we confirm no downstream dependencies

### 6.2 Agent session persistence lifecycle

The `agent_sessions` table tracks every agent subprocess for audit purposes:

| Event                | DB Action                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `agent_spawn` called | INSERT row with `status='running'`, `started_at=now()`                                    |
| Agent exits normally | UPDATE `status='completed'`, `exit_code`, `completed_at=now()`                            |
| Agent errors/crashes | UPDATE `status='failed'`, `exit_code`, `completed_at=now()`                               |
| User kills agent     | UPDATE `status='killed'`, `completed_at=now()`                                            |
| App crash/restart    | On startup, UPDATE any rows with `status='running'` to `status='failed'` (orphan cleanup) |

The orphan cleanup runs in `AgentManager::new()` before any agents are spawned, ensuring stale `running` rows from a previous crash don't persist.

### 6.3 API key handling

Forge does **not** store API keys. The spawned CLI processes inherit the parent process's environment, which includes any API keys the user has configured for their CLIs (e.g., `ANTHROPIC_API_KEY` for Claude Code). The `SpawnAgentConfig.env` field allows passing additional env vars but is primarily for non-secret configuration. Users configure API keys through their CLI's own setup process (e.g., `claude auth`).

---

## 7. Agent CLI Registry UI

### 6.1 Auto-Detection

On first launch (or via settings), Forge runs `which claude` and `which codex` (and `codex --version`, `claude --version`) to detect installed CLIs. Results populate the `agent_cli_configs` table.

### 6.2 Config Panel

A settings panel (accessible from Bay settings or global settings) where users can:

- See detected CLIs with version info
- Add custom CLI paths
- Set a default CLI
- Configure per-role mappings (e.g., Builder→Claude Code with `claude-opus-4-6`, Tester→Codex)
- Set default model, allowed tools, and system prompt per mapping

### 6.3 Role Templates

Pre-configured role templates with sensible defaults:

| Role       | Default CLI | Default Allowed Tools   | System Prompt Hint                                          |
| ---------- | ----------- | ----------------------- | ----------------------------------------------------------- |
| Builder    | Claude Code | Edit, Write, Bash, Read | "You are building features. Focus on implementation."       |
| Tester     | Claude Code | Read, Bash, Write       | "You are writing and running tests."                        |
| Reviewer   | Claude Code | Read, Grep, Glob        | "You are reviewing code. Do not make edits."                |
| Debugger   | Claude Code | Read, Bash, Edit        | "You are debugging an issue. Investigate methodically."     |
| Researcher | Claude Code | Read, Grep, Glob        | "You are researching. Gather information, don't edit code." |

> **Note:** WebSearch and WebFetch require MCP server configuration and are not available out-of-box in Claude Code. Researcher defaults to read-only code tools; users can add web tools after configuring MCP.

---

## 8. Event Logging Integration

All agent activity is logged to the existing `events` table:

| Event Type          | Payload                                | Triggered When            |
| ------------------- | -------------------------------------- | ------------------------- |
| `agent.spawned`     | `{ agentId, cliType, prompt, laneId }` | Agent subprocess starts   |
| `agent.tool_use`    | `{ agentId, tool, input }`             | Agent calls a tool        |
| `agent.tool_result` | `{ agentId, tool, output, isError }`   | Tool returns result       |
| `agent.message`     | `{ agentId, text }`                    | Agent sends text response |
| `agent.completed`   | `{ agentId, exitCode, duration }`      | Agent finishes normally   |
| `agent.failed`      | `{ agentId, error, exitCode }`         | Agent errors/crashes      |
| `agent.killed`      | `{ agentId }`                          | User kills agent          |

This integrates with the existing Event Store and Command Ledger for full audit trails.

---

## 9. File Structure (New Files)

### Rust Backend

```
apps/desktop/src-tauri/src/
  agent/
    mod.rs              -- pub mod instance, manager, adapter
    instance.rs         -- AgentInstance (subprocess management)
    manager.rs          -- AgentManager (HashMap<String, AgentInstance>)
    adapter.rs          -- CliAdapter trait + ClaudeCodeAdapter + CodexAdapter
  commands/
    agent.rs            -- Tauri commands (agent_spawn, agent_send, etc.)
    agent_config.rs     -- CRUD for agent_cli_configs and role_cli_mappings
  migrations/
    003_agent_cli.sql   -- New tables
```

### TypeScript

```
packages/core/src/types/
  agentCli.ts           -- CliType, AgentInfo, SpawnAgentConfig, AgentStreamEvent, etc.

apps/desktop/src/
  ipc/
    agent.ts            -- agentIpc wrappers
    agentConfig.ts      -- agentConfigIpc wrappers (CRUD)
  hooks/
    useAgent.ts         -- Agent event stream hook
    useAgentConfig.ts   -- CLI config management hook
  components/
    AgentStream/
      AgentStreamView.tsx    -- Renders agent output (messages, tool calls)
      AgentStreamEvent.tsx   -- Individual event rendering
    AgentConfig/
      AgentConfigPanel.tsx   -- CLI registry settings panel
      RoleMappingEditor.tsx  -- Per-role CLI assignment
      CliDetector.tsx        -- Auto-detection results display
```

---

## 10. Task Mapping (Original → Revised)

| Original                      | New Interpretation                                      | Effort |
| ----------------------------- | ------------------------------------------------------- | ------ |
| 3.01 Define adapter interface | `CliAdapter` trait + `AgentInstance` struct             | 3h     |
| 3.02 Normalize outputs        | Parse CLI JSON streams → `AgentStreamEvent` types       | 2h     |
| 3.03 OpenAI client            | Codex CLI adapter                                       | 2h     |
| 3.04 Anthropic adapter        | Claude Code CLI adapter                                 | 2h     |
| 3.05 Gemini adapter           | _Deferred_                                              | —      |
| 3.06 OpenRouter adapter       | _Deferred_                                              | —      |
| 3.07 Ollama integration       | _Deferred_ (could add as OpenAI-compatible CLI later)   | —      |
| 3.08 LM Studio integration    | _Deferred_                                              | —      |
| 3.09 BYOM config UI           | Agent CLI registry + auto-detection UI                  | 4h     |
| 3.10 Per-role routing         | Role→CLI mapping with model/tool overrides              | 2h     |
| 3.11 Agent runner             | `AgentManager` (subprocess orchestrator)                | 4h     |
| 3.12 Permission scopes        | CLI flag scoping (`--allowedTools`, cwd isolation)      | 2h     |
| 3.13 Write restrictions       | System prompt injection + tool restrictions per role    | 1h     |
| 3.14 Approval hooks           | Trust CLI's own approval (log-only from Forge side)     | 1h     |
| 3.15 Role templates           | Default configs per role (CLI + model + tools + prompt) | 2h     |

**Total revised estimate:** ~25h (vs original ~24h, similar effort)

---

## 11. Out of Scope

- **Custom LLM adapters**: Not building direct API clients. If a user wants to use a model not supported by the CLIs, they can configure an OpenAI-compatible CLI endpoint.
- **Agent-to-agent communication**: Lanes are independent for now. Multi-agent coordination is a future phase.
- **MCP integration**: Future phase could expose Forge tools as an MCP server for agents to connect to.
- **Streaming response rendering**: The `AgentStreamView` component shows raw events. Rich rendering (file diffs, command output) is Phase 5.

---

## 12. Dependencies

### Rust (Cargo.toml additions)

- None new — uses `std::process::Command`, which is stdlib

### TypeScript

- None new — uses Tauri `invoke()` and `listen()` already in the project

### External

- Claude Code CLI must be installed (`npm install -g @anthropic-ai/claude-code`)
- Codex CLI must be installed (OpenAI's CLI)
- User must have valid API keys configured for their chosen CLIs
