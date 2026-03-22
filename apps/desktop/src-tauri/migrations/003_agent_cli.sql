-- Agent CLI configurations (which CLIs are available)
CREATE TABLE IF NOT EXISTS agent_cli_configs (
  id TEXT PRIMARY KEY,
  cli_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  executable_path TEXT NOT NULL,
  default_model TEXT,
  default_allowed_tools TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS role_cli_mappings (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  cli_config_id TEXT NOT NULL REFERENCES agent_cli_configs(id) ON DELETE CASCADE,
  model_override TEXT,
  system_prompt_override TEXT,
  allowed_tools_override TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(role)
);

CREATE INDEX IF NOT EXISTS idx_role_cli_mappings_role ON role_cli_mappings(role);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  lane_id TEXT NOT NULL,
  cli_type TEXT NOT NULL,
  cli_config_id TEXT REFERENCES agent_cli_configs(id),
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  exit_code INTEGER,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  model TEXT,
  token_usage TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_bay_id ON agent_sessions(bay_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_lane_id ON agent_sessions(lane_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
