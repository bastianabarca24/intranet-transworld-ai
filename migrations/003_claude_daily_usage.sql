-- Contadores diarios de uso del asistente Claude (por usuario)
CREATE TABLE IF NOT EXISTS claude_daily_usage (
  user_id INTEGER NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  file_count INTEGER NOT NULL DEFAULT 0 CHECK (file_count >= 0),
  PRIMARY KEY (user_id, usage_date)
);

-- Preferencias del usuario para el asistente Claude
CREATE TABLE IF NOT EXISTS claude_user_settings (
  user_id INTEGER PRIMARY KEY,
  limits_notice_seen_at TIMESTAMPTZ
);

-- Reparar tablas creadas sin PK (CREATE IF NOT EXISTS no altera esquema existente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claude_daily_usage_pkey'
      AND conrelid = 'claude_daily_usage'::regclass
  ) THEN
    ALTER TABLE claude_daily_usage ADD CONSTRAINT claude_daily_usage_pkey PRIMARY KEY (user_id, usage_date);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claude_user_settings_pkey'
      AND conrelid = 'claude_user_settings'::regclass
  ) THEN
    ALTER TABLE claude_user_settings ADD CONSTRAINT claude_user_settings_pkey PRIMARY KEY (user_id);
  END IF;
END $$;
