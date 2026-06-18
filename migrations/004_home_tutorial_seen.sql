-- Marca si el usuario ya vio el tutorial de bienvenida del home
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS home_tutorial_seen BOOLEAN NOT NULL DEFAULT TRUE;

-- Usuarios nuevos (registro o alta RRHH) deben insertar home_tutorial_seen = FALSE explícitamente.
-- El primer ingreso real se detecta con last_login_at (migración 005).
