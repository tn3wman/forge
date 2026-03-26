CREATE TABLE IF NOT EXISTS terminal_configs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    cli_name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'Normal',
    working_directory TEXT,
    label TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_terminal_configs_workspace
ON terminal_configs(workspace_id);
