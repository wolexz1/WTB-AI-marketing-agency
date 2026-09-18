CREATE TABLE IF NOT EXISTS whatsapp_ai_funnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  product_id TEXT,
  cta_location TEXT,
  page_path TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS whatsapp_ai_funnel_events_created_at_idx
  ON whatsapp_ai_funnel_events(created_at);

CREATE INDEX IF NOT EXISTS whatsapp_ai_funnel_events_event_name_idx
  ON whatsapp_ai_funnel_events(event_name);
