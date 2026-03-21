CREATE TABLE IF NOT EXISTS bays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_path TEXT NOT NULL UNIQUE,
  git_branch TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  window_state TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_accessed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS lanes (
  id TEXT PRIMARY KEY,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  agent_id TEXT,
  model_id TEXT,
  file_scope TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_lanes_bay_id ON lanes(bay_id);
CREATE INDEX IF NOT EXISTS idx_lanes_status ON lanes(status);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  lane_id TEXT NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input TEXT,
  output TEXT,
  parent_task_id TEXT REFERENCES tasks(id),
  depends_on TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_lane_id ON tasks(lane_id);
CREATE INDEX IF NOT EXISTS idx_tasks_bay_id ON tasks(bay_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS agent_configs (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  model_id TEXT NOT NULL,
  permissions TEXT NOT NULL,
  system_prompt TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  lane_id TEXT NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  label TEXT,
  snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_lane_id ON checkpoints(lane_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  bay_id TEXT NOT NULL,
  lane_id TEXT,
  task_id TEXT,
  agent_id TEXT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_events_bay_id ON events(bay_id);
CREATE INDEX IF NOT EXISTS idx_events_lane_id ON events(lane_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

CREATE TABLE IF NOT EXISTS model_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  api_endpoint TEXT,
  model_name TEXT NOT NULL,
  api_key_ref TEXT,
  is_local INTEGER DEFAULT 0,
  config TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
