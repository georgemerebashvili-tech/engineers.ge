-- Allow admins to block a construction contact/company from procurement participation.
ALTER TABLE public.construction_contacts
  ADD COLUMN IF NOT EXISTS procurement_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS procurement_block_reason TEXT,
  ADD COLUMN IF NOT EXISTS procurement_blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS procurement_blocked_by TEXT;

CREATE INDEX IF NOT EXISTS idx_construction_contacts_procurement_blocked
  ON public.construction_contacts(procurement_blocked);
