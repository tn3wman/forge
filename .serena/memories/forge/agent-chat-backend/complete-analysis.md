# Forge Desktop App - Claude CLI Agent/Chat Backend - Complete Analysis

## EXECUTIVE SUMMARY

The Forge desktop app integrates the Claude CLI via subprocess management using **stream-json IPC** (input-output format). The architecture uses:

1. **Rust Backend (Tauri)**: Spawns `claude` CLI process, manages stdin/stdout streams in separate threads
2. **Message Protocol**: Line-delimited JSON on stdin/stdout with the `--input-format stream-json` flag
3. **Event System**: Backend emits Tauri events to frontend, frontend listens and updates UI state
4. **Permission System**: 6 modes sent via CLI argument matching frontend modes

---

## 1. CLAUDE CLI SUBPROCESS SPAWNING & MANAGEMENT

### File: `apps/desktop/src-tauri/src/agent/claude_backend.rs`

#### Spawning Process

```rust
pub fn spawn(
    session_id: String,
    mode: &AgentMode,
    working_directory: Option<&str>,
    initial_prompt: &str,
    app_handle: AppHandle,
) -> Result<Self, String>
```

**Key Steps:**

1. **Find CLI**: Uses `which::which("claude")` to locate the CLI executable
2. **Build Command**: Constructs `Command` with flags:
   ```
   claude -p
     --input-format stream-json
     --output-format stream-json
     --verbose
     --include-partial-messages
     --permission-mode {default|plan|acceptEdits|bypassPermissions|dontAsk|auto}
   ```
3. **Set Working Directory**: Optional current_dir passed if provided
4. **Capture I/O**: Pipes stdin, stdout, stderr via `Stdio::piped()`
5. **Spawn Child Process**: `cmd.spawn()` creates the subprocess

#### State Management

```rust
pub struct ClaudeBackend {
    child: Child,                              // Process handle
    stdin: Option<ChildStdin>,                 // Writing to CLI
    killed: Arc<AtomicBool>,                   // Synchronization flag
    conversation_id: Arc<Mutex<Option<String>>>, // Session ID from CLI
    system_init_sent: Arc<AtomicBool>,        // Dedup system events
}
```

---

## 2. STDIN PROTOCOL - SENDING MESSAGES TO CLI

### Format: Line-Delimited JSON

**Structure:**
```rust
let msg = serde_json::json!({
    "type": "user_message",
    "content": message
});
stdin.write_all(msg.to_string().as_bytes())?;
stdin.write_all(b"\n")?;  // CRITICAL: Newline-terminated
stdin.flush()?;
```

### Two Message Types:

#### 2A. User Message
```json
{
  "type": "user_message",
  "content": "your message here"
}
```
Called by:
- Initial prompt during `spawn()` 
- `send_message()` when frontend sends text via `ChatView`

#### 2B. Permission Response
```rust
let msg = serde_json::json!({
    "type": "permission_response",
    "permission_response": {
        "tool_use_id": tool_use_id,
        "allowed": allow
    }
});
```
Called by: `respond_permission()` when user approves/denies tool execution

### Critical Implementation Detail

**Must flush after every message**:
```rust
stdin.write_all(msg.to_string().as_bytes())?;
stdin.write_all(b"\n")?;  // Line terminator
stdin.flush()?;            // Force write to process
```

Without the newline or flush, the Claude CLI won't receive the message.

---

## 3. STDOUT PARSING - READING RESPONSES FROM CLI

### Architecture: Two Reader Threads

Spawned during `spawn()`, each reads separately:

#### 3A. Stdout Reader (Main Events)

```rust
std::thread::spawn(move || {
    let reader = BufReader::new(stdout);
    for line in reader.lines() {
        if killed.load(Ordering::Relaxed) { break; }
        
        let line = match line { Ok(l) => l, Err(_) => break };
        if line.trim().is_empty() { continue; }
        
        let json: serde_json::Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(_) => continue,  // Skip unparseable lines
        };
        
        let event = parse_agent_event(&json, &conversation_id);
        
        // Emit to frontend via Tauri
        let _ = app_handle.emit("agent-event", AgentEventPayload {
            session_id: session_id.clone(),
            event,
        });
    }
    
    // EOF reached → emit exit
    let _ = app_handle.emit("agent-exit", AgentExitPayload {
        session_id,
        exit_code: None,
    });
});
```

#### 3B. Stderr Reader (Errors Only)

```rust
std::thread::spawn(move || {
    let reader = BufReader::new(stderr);
    for line in reader.lines() {
        if killed.load(Ordering::Relaxed) { break; }
        
        let line = match line { Ok(l) => l, Err(_) => break };
        
        // Only emit if contains "Error" or "error"
        if line.contains("Error") || line.contains("error") {
            let _ = app_handle.emit("agent-event", AgentEventPayload {
                session_id: session_id.clone(),
                event: AgentEvent::Raw { data: json!({ "type": "stderr", "message": line }) },
            });
        }
    }
});
```

---

## 4. STREAM-JSON PROTOCOL - OUTPUT FORMATS

### Event Types Parsed from stdout

#### 4A. System Init (from Claude CLI)
```json
{
  "type": "system",
  "session_id": "abc123...",
  "model": "claude-3-5-sonnet-20241022",
  "permissionMode": "default",
  "tools": ["bash", "python_repl", "edit_file"]
}
```

**Parsed to:**
```rust
AgentEvent::SystemInit {
    session_id,
    model,
    permission_mode,
    tools,
}
```

#### 4B. Assistant Message (Full response)
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_xyz",
    "content": [
      { "type": "text", "text": "Here's what I'm doing..." },
      { "type": "tool_use", "id": "call_123", "name": "bash", "input": { "command": "ls -la" } }
    ]
  }
}
```

**Parsed to:**
```rust
AgentEvent::AssistantMessage {
    message_id,
    content: Vec<ContentBlock>,
}
```

#### 4C. Content Block Delta (Streaming text chunks)
```json
{
  "type": "content_block_delta",
  "index": 0,
  "delta": { "type": "text", "text": " some " }
}
```

**Parsed to:**
```rust
AgentEvent::AssistantMessageDelta {
    message_id,
    content_delta: " some ",
}
```

#### 4D. Result (Session complete)
```json
{
  "type": "result",
  "result": "Task completed successfully",
  "duration_ms": 2500,
  "total_cost_usd": 0.15,
  "is_error": false
}
```

**Parsed to:**
```rust
AgentEvent::Result {
    result_text,
    duration_ms,
    total_cost_usd,
    is_error,
}
```

#### 4E. Streaming Control Events (Silently skipped)
```json
{
  "type": "message_start",
  "message": { "id": "msg_xyz", "role": "assistant", "content": [] }
}
```

Types skipped: `message_start`, `message_delta`, `message_stop`, `content_block_start`, `content_block_stop`

---

## 5. FULL MESSAGE FLOW: Frontend → Backend → CLI → Frontend

### Sequence Diagram

```
Frontend (React)
    │
    ├─ User types message in ChatView
    ├─ handleSend() calls agentIpc.sendMessage(sessionId, text)
    │
    ▼
Tauri Command Handler
    │
    ├─ @tauri::command agent_send_message()
    ├─ Gets AgentSessionManager from app state
    ├─ Calls manager.send_message(&session_id, &message)
    │
    ▼
Manager (Rust)
    │
    ├─ Finds session in HashMap<String, AgentEntry>
    ├─ Calls session.send_message(message)
    │
    ▼
ClaudeBackend
    │
    ├─ Serializes JSON: { "type": "user_message", "content": message }
    ├─ Writes to child stdin + newline
    ├─ Flushes stdin
    │
    ▼
Claude CLI Process
    │
    ├─ Reads JSON from stdin
    ├─ Processes the user message
    ├─ Generates response (may stream in chunks)
    ├─ Writes events to stdout as line-delimited JSON
    │
    ▼
Stdout Reader Thread (spawned earlier)
    │
    ├─ BufReader reads lines from stdout
    ├─ Parses each line as JSON
    ├─ parse_agent_event() converts to AgentEvent enum
    ├─ app_handle.emit("agent-event", AgentEventPayload)
    │
    ▼
Tauri IPC → Frontend
    │
    ├─ listen<AgentEventPayload>("agent-event", (ev) => {})
    ├─ Calls useAgentStore functions based on event.type:
    │   • system_init → updateTabState("thinking"), appendMessage(system)
    │   • assistant_message → appendMessage(assistant) for each block
    │   • assistant_message_delta → updateLastAssistantMessage(chunk)
    │   • result → updateTabState("completed"), appendMessage(result)
    │
    ▼
React Component (ChatView)
    │
    ├─ Messages rendered from agentStore
    └─ User sees assistant response
```

---

## 6. PERMISSION/MODE SYSTEM

### Frontend Types (TypeScript)

```typescript
export type AgentChatMode = 
  | "default"
  | "plan"
  | "acceptEdits"
  | "bypassPermissions"
  | "dontAsk"
  | "auto";
```

### Rust Models

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AgentMode {
    Default,
    Plan,
    AcceptEdits,
    BypassPermissions,
    DontAsk,
    Auto,
}
```

### CLI Argument Mapping

In `claude_backend.rs::spawn()`:

```rust
let permission_mode = match mode {
    AgentMode::Default => "default",
    AgentMode::Plan => "plan",
    AgentMode::AcceptEdits => "acceptEdits",
    AgentMode::BypassPermissions => "bypassPermissions",
    AgentMode::DontAsk => "dontAsk",
    AgentMode::Auto => "auto",
};

cmd.arg("--permission-mode").arg(permission_mode);
```

### Mode Semantics (from Claude CLI)

- **default**: Ask user for permission on each tool use
- **plan**: Show plan before execution, ask for approval
- **acceptEdits**: Auto-approve file edits, ask for other tools
- **bypassPermissions**: Skip permission checks, auto-execute all tools
- **dontAsk**: Like default but suppress permission prompts (batch mode)
- **auto**: Automatically choose based on context

---

## 7. EVENT FLOW IN FRONTEND (useAgentSession Hook)

### File: `apps/desktop/src/hooks/useAgentSession.ts`

```typescript
useEffect(() => {
    if (!sessionId) return;
    
    const unlisteners: Array<Promise<() => void>> = [];
    
    // Listen for agent events from Tauri
    unlisteners.push(
        listen<AgentEventPayload>("agent-event", (ev) => {
            if (ev.payload.sessionId !== sessionId) return;
            const { event } = ev.payload;
            const store = useAgentStore.getState();
            const now = Date.now();
            
            switch (event.type) {
                case "system_init":
                    store.setModel(sessionId, event.model);
                    store.updateTabState(sessionId, "thinking");
                    store.appendMessage(sessionId, {
                        id: nextId(),
                        type: "system",
                        content: `Session initialized (model: ${event.model}) [${event.permissionMode}]`,
                        timestamp: now,
                        collapsed: false,
                    });
                    break;
                    
                case "assistant_message":
                    for (const block of event.content) {
                        if (block.type === "text") {
                            store.appendMessage(sessionId, {
                                type: "assistant",
                                content: block.text,
                                ...
                            });
                        } else if (block.type === "tool_use") {
                            store.appendMessage(sessionId, {
                                type: "tool_use",
                                toolName: block.name,
                                toolUseId: block.id,
                                toolInput: block.input,
                                ...
                            });
                        }
                    }
                    store.updateTabState(sessionId, "thinking");
                    break;
                    
                case "assistant_message_delta":
                    // Streaming text chunk
                    store.updateLastAssistantMessage(sessionId, event.contentDelta);
                    break;
                    
                case "result":
                    store.updateTabState(sessionId, event.isError ? "error" : "completed");
                    store.updateTabCost(sessionId, event.totalCostUsd);
                    store.appendMessage(sessionId, {
                        type: event.isError ? "error" : "assistant",
                        content: event.resultText,
                        ...
                    });
                    break;
            }
        })
    );
    
    // Listen for exit
    unlisteners.push(
        listen<AgentExitPayload>("agent-exit", (ev) => {
            if (ev.payload.sessionId !== sessionId) return;
            // Session ended — UI should show closed state
            const store = useAgentStore.getState();
            if (store.activeTabId === sessionId) {
                // Optionally switch to another tab or show "Session Ended"
            }
        })
    );
    
    return () => {
        // Cleanup on unmount
        unlisteners.forEach((ul) => ul.then((fn) => fn()));
    };
}, [sessionId]);
```

---

## 8. KEY FILES & THEIR ROLES

| File | Purpose |
|------|---------|
| `apps/desktop/src-tauri/src/agent/claude_backend.rs` | Spawns CLI, manages I/O streams, parses events |
| `apps/desktop/src-tauri/src/agent/session.rs` | Wraps backend in abstraction, delegates to backend |
| `apps/desktop/src-tauri/src/agent/manager.rs` | Manages multiple sessions, routes commands |
| `apps/desktop/src-tauri/src/agent/backend.rs` | Trait definition for pluggable backends |
| `apps/desktop/src-tauri/src/agent/slash_commands.rs` | Discovers slash commands from CLI/plugins |
| `apps/desktop/src-tauri/src/commands/agent.rs` | Tauri command handlers: `@tauri::command` |
| `apps/desktop/src/ipc/agent.ts` | Frontend IPC layer: `agentIpc` object |
| `apps/desktop/src/hooks/useAgentSession.ts` | Frontend event listener & store updates |
| `apps/desktop/src/stores/agentStore.ts` | Zustand store for agent chat state |
| `packages/shared/src/types/agent.ts` | Shared TypeScript types (Frontend ↔ Rust) |

---

## 9. WHY "MESSAGING THE AGENT DOES NOTHING" - ROOT CAUSE ANALYSIS

### Symptom
Shows "Session initialized" → user sends message → goes directly to "Completed" without processing.

### Likely Causes (in order of probability)

#### 9.1 **Message Not Reaching CLI Process**

**Check:**
1. **Newline Missing?** In `send_message()`, check:
   ```rust
   stdin.write_all(b"\n")?;  // MUST be present
   stdin.flush()?;            // MUST be called
   ```

2. **Null stdin?** After `send_message()` is called multiple times, does `stdin` get closed?
   - The `Option<ChildStdin>` should be checked with `ok_or_else(|| "stdin not available")`

3. **Process Dead?** Check if `child.try_wait()` shows process exited prematurely

#### 9.2 **CLI Receives Message But Produces No Output**

**Check:**
1. Is the CLI invoked with correct flags?
   ```bash
   claude -p \
     --input-format stream-json \
     --output-format stream-json \
     --verbose \
     --include-partial-messages \
     --permission-mode default
   ```

2. Does the initial prompt work? (sent during `spawn()`)
   - If initial prompt succeeds but subsequent messages fail, issue is in `send_message()`

3. Is stderr being checked? The reader thread only emits errors containing "Error"/"error"
   - Add logging to stderr reader to see what's being written

#### 9.3 **Events Emitted But Not Reaching Frontend**

**Check:**
1. Are reader threads actually spawned?
   ```rust
   std::thread::spawn(move || { ... })
   ```

2. Is `app_handle.emit()` working?
   - Add logging: `eprintln!("[EMIT] agent-event: {}", event_type);`

3. Are events filtered out?
   - Check `parse_agent_event()` — does it return something unexpected?

4. Frontend not listening?
   - Check `listen("agent-event", ...)` is registered
   - Check session ID matching: `if (ev.payload.sessionId !== sessionId) return;`

#### 9.4 **State Transition Bug**

**Check:**
1. In `useAgentSession.ts`, does `system_init` properly update state?
   ```typescript
   case "system_init":
       store.updateTabState(sessionId, "thinking");  // Should be "thinking", not already "completed"
   ```

2. Is there a race condition setting state to "completed" prematurely?

---

## 10. DEBUGGING CHECKLIST

### Enable Verbose Logging

1. **Rust backend**: Add eprintln! before emit:
   ```rust
   eprintln!("[CLAUDE] Emitting event: {:?}", event);
   let _ = app_handle.emit("agent-event", AgentEventPayload { ... });
   ```

2. **Frontend**: Add console.log in event listener:
   ```typescript
   listen<AgentEventPayload>("agent-event", (ev) => {
       console.log("[AGENT-EVENT]", ev.payload.event);
       // ...
   });
   ```

3. **Check process**: Does CLI write anything to stdout/stderr?
   ```bash
   # Manually test
   echo '{"type": "user_message", "content": "hello"}' | \
     claude -p --input-format stream-json --output-format stream-json
   ```

### Verify Message Format

Ensure stdin message is exactly:
```
{"type":"user_message","content":"hello"}
\n
```
(No extra spaces, properly escaped quotes, terminated with newline)

### Check Thread Safety

- `stdin: Option<ChildStdin>` is consumed via `take()` and stored in `Option`
- Multiple calls to `send_message()` use `as_mut()` to get mutable reference
- Could there be a timing issue where stdin is dropped before message sent?

---

## 11. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Tauri)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ChatView.tsx                                                    │
│  ├─ handleSend(text)                                            │
│  │  ├─ appendMessage(user message)  ↓ agentStore               │
│  │  └─ agentIpc.sendMessage(sessionId, text)                   │
│  │                                                               │
│  useAgentSession.ts                                             │
│  └─ listen("agent-event", (ev) => {                            │
│     switch(ev.payload.event.type) { ... }                      │
│     ├─ appendMessage(assistant)  ↓ agentStore                  │
│     ├─ updateTabState(state)     ↓ agentStore                  │
│     └─ updateLastAssistantMessage(chunk) ↓ agentStore         │
│                                                                  │
│  agentStore (Zustand)                                           │
│  ├─ tabs: AgentTab[]                                            │
│  └─ messagesBySession: Record<sessionId, AgentMessage[]>      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Tauri IPC
┌─────────────────────────────────────────────────────────────────┐
│                 BACKEND (Rust + Tauri Commands)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  @tauri::command agent_send_message()                           │
│  └─ manager.send_message(sessionId, message)                   │
│     └─ session.send_message(message)                           │
│        └─ backend.send_message(message) [ClaudeBackend]        │
│           └─ stdin.write_all(json_bytes + "\n")                │
│           └─ stdin.flush()                                      │
│                                                                  │
│  @tauri::command agent_create_session()                         │
│  └─ manager.create_session(request)                            │
│     └─ ClaudeBackend::spawn()                                  │
│        ├─ which("claude") → cli_path                           │
│        ├─ Command::new(cli_path)                               │
│        │  └─ .arg("--input-format").arg("stream-json")         │
│        │  └─ .arg("--permission-mode").arg(mode_string)        │
│        ├─ cmd.spawn() → child process                          │
│        ├─ Start Stdout Reader Thread                           │
│        │  ├─ BufReader::new(stdout)                            │
│        │  ├─ for line in reader.lines()                        │
│        │  ├─ json = parse(line)                                │
│        │  ├─ event = parse_agent_event(json)                   │
│        │  └─ app_handle.emit("agent-event", event)             │
│        └─ Start Stderr Reader Thread                           │
│           └─ emit("agent-event") if line contains "error"      │
│                                                                  │
│  ClaudeBackend State                                            │
│  ├─ child: Child  [process handle]                             │
│  ├─ stdin: Option<ChildStdin>  [write to CLI]                  │
│  ├─ stdout: [in reader thread]                                 │
│  ├─ stderr: [in reader thread]                                 │
│  ├─ killed: Arc<AtomicBool>  [sync flag]                       │
│  └─ conversation_id: Arc<Mutex<Option<String>>>  [from CLI]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ stdio
┌─────────────────────────────────────────────────────────────────┐
│                 Claude CLI Process (subprocess)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  stdin: reads JSON messages                                     │
│  ├─ { "type": "user_message", "content": "..." }              │
│  └─ { "type": "permission_response", ... }                    │
│                                                                  │
│  stdout: writes JSON events (line-delimited)                   │
│  ├─ { "type": "system", "session_id": "...", "model": "..." }  │
│  ├─ { "type": "assistant", "message": { ... } }               │
│  ├─ { "type": "content_block_delta", "delta": { ... } }       │
│  └─ { "type": "result", "result": "...", ... }                │
│                                                                  │
│  stderr: error output (optionally monitored)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. CRITICAL IMPLEMENTATION NOTES

1. **Newline Termination**: Every stdin message MUST end with `\n`
2. **Flush Required**: Must call `flush()` after `write_all()` to unblock CLI
3. **Thread Safety**: `killed` flag prevents resource leaks; reader threads check it
4. **Dedup**: `system_init_sent` prevents duplicate system initialization messages
5. **Graceful Shutdown**: `abort()` sends SIGINT; `kill()` sends SIGKILL
6. **Event Isolation**: Session ID filter ensures events only affect correct tab
7. **Streaming**: `content_block_delta` events append to last message (partial updates)
8. **Mode Mapping**: Frontend modes perfectly map to CLI `--permission-mode` argument
9. **Tool Results**: Not emitted by CLI; handled separately (likely via MCP/tools protocol)
10. **Conversation ID**: Extracted from first `system` event and cached in `Arc<Mutex>`
