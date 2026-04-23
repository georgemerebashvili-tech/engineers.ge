-- BOG Business Online config — single row, admin-only
CREATE TABLE IF NOT EXISTS construction_bog_config (
  id              SERIAL PRIMARY KEY,
  client_id       TEXT NOT NULL,
  client_secret   TEXT NOT NULL,
  account_iban    TEXT NOT NULL,
  account_currency TEXT NOT NULL DEFAULT 'GEL',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      TEXT
);

ALTER TABLE construction_bog_config ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS; no public access needed
