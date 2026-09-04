CREATE TABLE IF NOT EXISTS whatsapp_ai_orders (
  reference TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cta_location TEXT,
  status TEXT NOT NULL CHECK (status IN ('initialized', 'verified')),
  created_at TEXT NOT NULL,
  verified_at TEXT,
  paystack_transaction_id TEXT,
  delivery_key TEXT NOT NULL,
  delivery_expires_at TEXT NOT NULL,
  tracking_json TEXT NOT NULL DEFAULT '{}',
  download_count INTEGER NOT NULL DEFAULT 0,
  last_download_at TEXT
);

CREATE INDEX IF NOT EXISTS whatsapp_ai_orders_email_created_idx
  ON whatsapp_ai_orders (email, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_ai_rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_minute INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1
);
