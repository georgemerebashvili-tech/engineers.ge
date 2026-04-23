-- Add identification_code (Georgian tax ID / ს.კ.) to construction_contacts
ALTER TABLE construction_contacts ADD COLUMN IF NOT EXISTS identification_code TEXT;
CREATE INDEX IF NOT EXISTS idx_construction_contacts_identification_code
  ON construction_contacts(identification_code)
  WHERE identification_code IS NOT NULL;

NOTIFY pgrst, 'reload schema';
