-- Procurement v2: project_date, formulas JSONB, item drive_url, Q&A tables

ALTER TABLE construction_procurement_projects
  ADD COLUMN IF NOT EXISTS project_date DATE,
  ADD COLUMN IF NOT EXISTS formulas JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE construction_procurement_items
  ADD COLUMN IF NOT EXISTS drive_url TEXT;

CREATE TABLE IF NOT EXISTS construction_procurement_qa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES construction_procurement_projects(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES construction_contacts(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction_procurement_qa_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_id       UUID NOT NULL REFERENCES construction_procurement_qa(id) ON DELETE CASCADE,
  answer      TEXT NOT NULL,
  answered_by TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE construction_procurement_qa         ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_procurement_qa_answers ENABLE ROW LEVEL SECURITY;
