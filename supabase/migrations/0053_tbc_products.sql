-- TBC: global product catalog (მოწყობილობების ცნობარი)
-- Used both as reference catalog and as a data source for the device table's კონტრ. dropdown.
create table if not exists public.tbc_products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text,
  dimension   text,
  price       numeric(12,2),
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create index if not exists tbc_products_name_idx on public.tbc_products (lower(name));
create index if not exists tbc_products_code_idx on public.tbc_products (code);
