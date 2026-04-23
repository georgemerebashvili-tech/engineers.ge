-- dmt_inventory: SKU catalog with full audit trail
-- Replaces static TRM.GE JSON catalog.
-- Idempotent — safe to re-run.

create table if not exists public.dmt_inventory (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null,
  name             text not null,
  description      text,
  tags             text[] not null default '{}',
  dimensions       text,
  qty              int not null default 0,
  price            numeric(10,2),
  image_url        text,
  reserve_lead_ids text[] not null default '{}',
  created_by       text not null,
  created_at       timestamptz not null default now(),
  updated_by       text,
  updated_at       timestamptz
);

create index if not exists dmt_inventory_sku_idx      on public.dmt_inventory(sku);
create index if not exists dmt_inventory_created_idx  on public.dmt_inventory(created_at desc);

-- audit log for every create / update / delete
create table if not exists public.dmt_inventory_logs (
  id         bigserial primary key,
  item_id    uuid references public.dmt_inventory(id) on delete set null,
  item_sku   text not null,
  action     text not null, -- 'create' | 'update' | 'delete'
  changes    jsonb,         -- {field, old, new} or snapshot for create/delete
  actor      text not null,
  created_at timestamptz not null default now()
);

create index if not exists dmt_inventory_logs_item_idx    on public.dmt_inventory_logs(item_id);
create index if not exists dmt_inventory_logs_created_idx on public.dmt_inventory_logs(created_at desc);
