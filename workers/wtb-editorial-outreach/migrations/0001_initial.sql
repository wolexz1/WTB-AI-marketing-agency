CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  publication_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL UNIQUE,
  contact_source TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_text TEXT NOT NULL,
  follow_up_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'replied', 'declined', 'paid_only', 'suppressed', 'failed')),
  initial_sent_at TEXT,
  follow_up_sent_at TEXT,
  resend_message_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outreach_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  initial_sent_count INTEGER NOT NULL DEFAULT 0,
  follow_up_sent_count INTEGER NOT NULL DEFAULT 0,
  skipped_reason TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS prospects_status_verified_idx ON prospects(status, verified_at);
CREATE INDEX IF NOT EXISTS prospects_follow_up_idx ON prospects(status, initial_sent_at, follow_up_sent_at);
