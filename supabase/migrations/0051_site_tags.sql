CREATE TABLE IF NOT EXISTS site_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path   text NOT NULL,
  selector    text NOT NULL,
  element_type text,
  element_text text,
  tag_name    text NOT NULL,
  note        text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_tags_page ON site_tags(page_path);
CREATE INDEX IF NOT EXISTS idx_site_tags_name ON site_tags(tag_name);
