-- migrations/007_vacation_module.sql
-- Módulo de gestión de vacaciones (Chile / Perú)
-- Fuente canónica del schema. El arranque de la app también lo asegura
-- de forma idempotente vía src/services/vacations/vacationSchema.js.

BEGIN;

-- ==========================================================
-- 1. Extensión de la tabla users (campos laborales)
-- ==========================================================

-- País del contrato laboral (determina el motor de reglas)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employment_country VARCHAR(2) NOT NULL DEFAULT 'CL'
    CHECK (employment_country IN ('CL', 'PE'));

-- Fecha de ingreso a la empresa (aniversario laboral)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Jefe directo (opcional, para flujo de aprobación futura)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS manager_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_employment_country ON users (employment_country);
CREATE INDEX IF NOT EXISTS idx_users_hire_date ON users (hire_date) WHERE hire_date IS NOT NULL;

-- ==========================================================
-- 2. vacation_periods — Períodos de devengo
-- ==========================================================

CREATE TABLE IF NOT EXISTS vacation_periods (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code    VARCHAR(2) NOT NULL CHECK (country_code IN ('CL', 'PE')),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  entitled_days   NUMERIC(5,2) NOT NULL,
  used_days       NUMERIC(5,2) NOT NULL DEFAULT 0,
  adjusted_days   NUMERIC(5,2) NOT NULL DEFAULT 0,
  expires_at      DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_vacation_periods_user ON vacation_periods (user_id);

-- ==========================================================
-- 3. vacation_requests — Solicitudes
-- ==========================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vacation_request_status') THEN
    CREATE TYPE vacation_request_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'in_progress',
      'completed'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS vacation_requests (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code       VARCHAR(2) NOT NULL CHECK (country_code IN ('CL', 'PE')),
  vacation_period_id INTEGER REFERENCES vacation_periods(id) ON DELETE SET NULL,
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  business_days      NUMERIC(5,2),
  calendar_days      INTEGER,
  status             vacation_request_status NOT NULL DEFAULT 'pending',
  requester_notes    TEXT,
  reviewer_notes     TEXT,
  reviewed_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vacation_requests_user ON vacation_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON vacation_requests (status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_dates ON vacation_requests (start_date, end_date);

-- ==========================================================
-- 4. vacation_balance_adjustments — Auditoría de ajustes
-- ==========================================================

CREATE TABLE IF NOT EXISTS vacation_balance_adjustments (
  id                 SERIAL PRIMARY KEY,
  vacation_period_id INTEGER NOT NULL REFERENCES vacation_periods(id) ON DELETE CASCADE,
  adjusted_by        INTEGER NOT NULL REFERENCES users(id),
  days_delta         NUMERIC(5,2) NOT NULL,
  reason             TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vacation_balance_adjustments_period
  ON vacation_balance_adjustments (vacation_period_id);

-- ==========================================================
-- 5. public_holidays — Feriados por país
-- ==========================================================

CREATE TABLE IF NOT EXISTS public_holidays (
  id            SERIAL PRIMARY KEY,
  country_code  VARCHAR(2) NOT NULL CHECK (country_code IN ('CL', 'PE')),
  holiday_date  DATE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  is_recurring  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_public_holidays_country_date
  ON public_holidays (country_code, holiday_date);

COMMIT;
