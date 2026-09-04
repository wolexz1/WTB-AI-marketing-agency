ALTER TABLE whatsapp_ai_orders ADD COLUMN email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sending', 'sent', 'failed'));
ALTER TABLE whatsapp_ai_orders ADD COLUMN email_attempted_at TEXT;
ALTER TABLE whatsapp_ai_orders ADD COLUMN email_attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whatsapp_ai_orders ADD COLUMN email_sent_at TEXT;
ALTER TABLE whatsapp_ai_orders ADD COLUMN email_last_error TEXT;

ALTER TABLE whatsapp_ai_orders ADD COLUMN meta_status TEXT NOT NULL DEFAULT 'pending' CHECK (meta_status IN ('pending', 'sending', 'sent', 'failed'));
ALTER TABLE whatsapp_ai_orders ADD COLUMN meta_attempted_at TEXT;
ALTER TABLE whatsapp_ai_orders ADD COLUMN meta_attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whatsapp_ai_orders ADD COLUMN meta_sent_at TEXT;
ALTER TABLE whatsapp_ai_orders ADD COLUMN meta_last_error TEXT;
