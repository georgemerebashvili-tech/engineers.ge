-- Construction Procurement Module
-- Contacts, Projects, Items, Bids, Participants, Tender Invites

CREATE TABLE IF NOT EXISTS construction_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  company     TEXT,
  email       TEXT,
  phone       TEXT,
  category    TEXT,            -- e.g. hvac, electrical, materials, general
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction_procurement_projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_no       TEXT NOT NULL DEFAULT '',
  name             TEXT NOT NULL,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',  -- draft | open | closed | awarded
  site_id          INTEGER REFERENCES construction_sites(id) ON DELETE SET NULL,
  drive_url        TEXT,
  winner_contact_id UUID REFERENCES construction_contacts(id) ON DELETE SET NULL,
  created_by       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction_procurement_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES construction_procurement_projects(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'pcs',
  qty         NUMERIC(14,4) NOT NULL DEFAULT 1,
  labor_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participants: contacts invited/added to a procurement project
CREATE TABLE IF NOT EXISTS construction_procurement_participants (
  project_id  UUID NOT NULL REFERENCES construction_procurement_projects(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES construction_contacts(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, contact_id)
);

-- Bids: price per contact per item
CREATE TABLE IF NOT EXISTS construction_procurement_bids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES construction_procurement_projects(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES construction_procurement_items(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES construction_contacts(id) ON DELETE CASCADE,
  product_price NUMERIC(14,4),
  install_price NUMERIC(14,4),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, contact_id)
);

-- Selections: admin's chosen supplier per item per price type
CREATE TABLE IF NOT EXISTS construction_procurement_selections (
  project_id  UUID NOT NULL REFERENCES construction_procurement_projects(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES construction_procurement_items(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES construction_contacts(id) ON DELETE CASCADE,
  price_type  TEXT NOT NULL,  -- 'product' | 'install'
  UNIQUE (item_id, price_type)
);

-- Tender invites: unique token per contact per project for email links
CREATE TABLE IF NOT EXISTS construction_tender_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES construction_procurement_projects(id) ON DELETE CASCADE,
  contact_id   UUID NOT NULL REFERENCES construction_contacts(id) ON DELETE CASCADE,
  token        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | viewed | submitted
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at    TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  UNIQUE (project_id, contact_id)
);

ALTER TABLE construction_contacts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_procurement_projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_procurement_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_procurement_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_procurement_bids      ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_procurement_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_tender_invites        ENABLE ROW LEVEL SECURITY;
