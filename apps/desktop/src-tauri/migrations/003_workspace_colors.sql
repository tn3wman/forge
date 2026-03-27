ALTER TABLE workspaces ADD COLUMN color TEXT NOT NULL DEFAULT 'blue';

UPDATE workspaces SET color = CASE (rowid % 10)
  WHEN 0 THEN 'blue'
  WHEN 1 THEN 'green'
  WHEN 2 THEN 'purple'
  WHEN 3 THEN 'orange'
  WHEN 4 THEN 'pink'
  WHEN 5 THEN 'teal'
  WHEN 6 THEN 'red'
  WHEN 7 THEN 'yellow'
  WHEN 8 THEN 'indigo'
  WHEN 9 THEN 'emerald'
END;
