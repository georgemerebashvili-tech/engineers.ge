'use client';

import {useEffect, useMemo, useState} from 'react';
import {PackageSearch, Plus, Search} from 'lucide-react';

export type InventoryCatalogItem = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  tags: string[];
  dimensions: string | null;
  qty: number;
  price: number | null;
  image_url: string | null;
};

type Props = {
  onPick: (item: InventoryCatalogItem) => void;
  selectedId?: string | null;
  compact?: boolean;
};

function asItem(raw: Record<string, unknown>): InventoryCatalogItem {
  return {
    id: String(raw.id ?? ''),
    sku: String(raw.sku ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description ? String(raw.description) : null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    dimensions: raw.dimensions ? String(raw.dimensions) : null,
    qty: Number(raw.qty ?? 0),
    price: raw.price === null || raw.price === undefined ? null : Number(raw.price),
    image_url: raw.image_url ? String(raw.image_url) : null
  };
}

export function InventoryPicker({onPick, selectedId, compact = false}: Props) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<InventoryCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dmt/inventory', {cache: 'no-store'})
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String(data.error ?? `HTTP ${res.status}`));
        if (!cancelled) setItems((data.items ?? []).map(asItem));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'inventory load failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items.slice(0, compact ? 8 : 20);
    return items.filter((item) =>
      item.sku.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      (item.description ?? '').toLowerCase().includes(term) ||
      item.tags.some((tag) => tag.toLowerCase().includes(term))
    ).slice(0, compact ? 8 : 30);
  }, [compact, items, q]);

  return (
    <div className="rounded-md border border-bdr bg-sur">
      <div className="flex items-center gap-2 border-b border-bdr px-3 py-2">
        <PackageSearch size={15} className="text-blue" />
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SKU / name search..."
            className="h-8 w-full rounded-md border border-bdr bg-sur-2 pl-7 pr-2 text-[12px] text-text focus:border-blue focus:outline-none"
          />
        </div>
      </div>
      <div className={compact ? 'max-h-56 overflow-auto' : 'max-h-72 overflow-auto'}>
        {loading && <div className="px-3 py-4 text-[12px] text-text-3">Loading inventory...</div>}
        {error && <div className="px-3 py-4 text-[12px] text-red">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-3 py-4 text-[12px] text-text-3">No SKU found.</div>
        )}
        {filtered.map((item) => {
          const selected = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item)}
              className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b border-bdr/60 px-3 py-2 text-left last:border-b-0 hover:bg-blue-lt/50 ${
                selected ? 'bg-blue-lt' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-navy">{item.name}</span>
                <span className="mt-0.5 block truncate font-mono text-[10.5px] text-text-3">
                  {item.sku || 'NO-SKU'} · qty {item.qty}
                  {item.dimensions ? ` · ${item.dimensions}` : ''}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 self-center rounded-md border border-bdr bg-sur-2 px-2 py-1 font-mono text-[10.5px] text-text-2">
                <Plus size={12} /> {item.price ? `₾ ${item.price}` : 'add'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
