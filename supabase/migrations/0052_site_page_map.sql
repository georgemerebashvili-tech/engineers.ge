CREATE TABLE IF NOT EXISTS site_page_nodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key    text NOT NULL UNIQUE,   -- e.g. "AUDIT.INPUT"
  page_path   text NOT NULL,          -- e.g. "/audit/input"
  label       text,
  next_keys   text[]  DEFAULT '{}',   -- ["AUDIT.CALC"]
  requires    text[]  DEFAULT '{}',   -- data keys required
  outputs     text[]  DEFAULT '{}',   -- data keys produced
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_actions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key    text NOT NULL,        -- "ACT.RUN"
  tag_id        uuid REFERENCES site_tags(id) ON DELETE SET NULL,
  from_page_key text,
  to_page_key   text,
  guard_keys    text[] DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);
