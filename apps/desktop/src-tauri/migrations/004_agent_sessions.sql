-- Migration 004: Agent session persistence
CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    cli_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    permission_mode TEXT,
    agent TEXT,
    effort TEXT,
    claude_path TEXT,
    plan_mode INTEGER DEFAULT 0,
    working_directory TEXT,
    conversation_id TEXT,
    total_cost REAL NOT NULL DEFAULT 0.0,
    label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_workspace ON agent_sessions(workspace_id);

CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    reasoning TEXT,
    message_id TEXT,
    turn_id TEXT,
    tool_use_id TEXT,
    tool_name TEXT,
    tool_input TEXT,
    tool_status TEXT,
    detail TEXT,
    approval_id TEXT,
    resolved INTEGER,
    is_error INTEGER,
    state TEXT,
    stream_state TEXT NOT NULL DEFAULT 'completed',
    reasoning_state TEXT,
    images TEXT,
    timestamp INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session ON agent_messages(session_id, seq);
