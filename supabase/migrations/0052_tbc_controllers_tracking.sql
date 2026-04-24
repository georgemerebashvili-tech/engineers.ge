-- TBC: add controllers list and tracking items per branch
ALTER TABLE public.tbc_branches
  ADD COLUMN IF NOT EXISTS controllers     jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tracking_items  jsonb NOT NULL DEFAULT '[]';
