-- Registra el primer inicio de sesión exitoso (se completa al cerrar el tutorial)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Usuarios que ya tenían la intranet en uso no deben ver el tutorial de nuevo
UPDATE users
SET last_login_at = NOW()
WHERE home_tutorial_seen = TRUE
  AND last_login_at IS NULL;
