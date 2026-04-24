-- TBC products: add tags array (hint/label tokens like #ძველი, #ვრცელი, #გარე).
alter table public.tbc_products
  add column if not exists tags text[] not null default '{}';

create index if not exists tbc_products_tags_idx on public.tbc_products using gin (tags);
