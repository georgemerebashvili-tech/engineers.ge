'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {
  Boxes,
  Package,
  Tag,
  ExternalLink,
  MoreHorizontal,
  X,
  Bookmark,
  Check,
  Copy,
  Edit2,
} from 'lucide-react';
import {LEADS, STAGE_META} from '@/lib/dmt/leads-data';
import {
  loadTrmCatalog,
  leafCategory,
  type TrmProduct,
} from '@/lib/dmt/trm-catalog';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

// ── Per-SKU local metadata ───────────────────────────────────────────────
type ProductMeta = {
  qty: number;
  description: string;
  extraTags: string[];
  reservedLeadIds: string[];
};

const STORAGE_KEY = 'dmt_inv_meta_v1';

function loadAllMeta(): Record<string, ProductMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProductMeta>) : {};
  } catch {
    return {};
  }
}

function saveAllMeta(map: Record<string, ProductMeta>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

function defaultMeta(): ProductMeta {
  return {qty: 0, description: '', extraTags: [], reservedLeadIds: []};
}

function autoTags(p: TrmProduct): string[] {
  const tags: string[] = [];
  const leaf = leafCategory(p.category);
  if (leaf) tags.push(leaf);
  if (p.brand) tags.push(p.brand);
  if (p.power) tags.push(p.power);
  if (p.made_in) tags.push(p.made_in);
  return [...new Set(tags)];
}

// Leads available for reserve linking
const RESERVE_LEADS = LEADS.filter(
  (l) => l.stage === 'proposal' || l.stage === 'won' || l.stage === 'qualified',
);

// ── Main page ────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<TrmProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metaMap, setMetaMap] = useState<Record<string, ProductMeta>>({});
  const [reserveTarget, setReserveTarget] = useState<TrmProduct | null>(null);

  useEffect(() => {
    loadTrmCatalog()
      .then((c) => setProducts(c.products))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    setMetaMap(loadAllMeta());
  }, []);

  const getMeta = useCallback(
    (sku: string): ProductMeta => metaMap[sku] ?? defaultMeta(),
    [metaMap],
  );

  const updateMeta = useCallback((sku: string, patch: Partial<ProductMeta>) => {
    setMetaMap((prev) => {
      const next = {
        ...prev,
        [sku]: {...(prev[sku] ?? defaultMeta()), ...patch},
      };
      saveAllMeta(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) => {
      const meta = metaMap[p.sku];
      return (
        p.name.toLowerCase().includes(t) ||
        p.sku.toLowerCase().includes(t) ||
        p.category.toLowerCase().includes(t) ||
        p.brand.toLowerCase().includes(t) ||
        p.model.toLowerCase().includes(t) ||
        (meta?.description ?? '').toLowerCase().includes(t) ||
        autoTags(p).some((tag) => tag.toLowerCase().includes(t)) ||
        (meta?.extraTags ?? []).some((tag) => tag.toLowerCase().includes(t))
      );
    });
  }, [products, q, metaMap]);

  const total = products?.length ?? 0;
  const inStock = products?.filter((p) => p.in_stock).length ?? 0;
  const outOfStock = total - inStock;
  const avgPrice = useMemo(() => {
    if (!products) return 0;
    const wp = products.filter(
      (p) => typeof p.price === 'number' && (p.price ?? 0) > 0,
    );
    if (!wp.length) return 0;
    return wp.reduce((s, p) => s + (p.price ?? 0), 0) / wp.length;
  }, [products]);

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ინვენტარიზაცია"
      subtitle="SKU კატალოგი — მარაგი, ობიექტებთან კავშირი და რეზერვი"
      searchPlaceholder="ძიება SKU / სახელი / კატეგორია / ბრენდი / ტეგი…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <StatCard label="SKU" value={String(total)} icon={Boxes} />
          <StatCard label="მარაგში" value={String(inStock)} accent="grn" />
          <StatCard label="მარაგგარეშე" value={String(outOfStock)} accent="red" />
          <StatCard
            label="საშ. ფასი"
            value={total ? `₾ ${fmt(Math.round(avgPrice))}` : '—'}
          />
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        {error ? (
          <EmptyState
            title="კატალოგის ჩატვირთვა ვერ მოხერხდა"
            hint={error}
            icon={Package}
          />
        ) : !products ? (
          <div className="flex items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-[12px] text-text-3">
            იტვირთება კატალოგი…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="შედეგი ვერ მოიძებნა"
            hint="შეცვალე ძიება."
            icon={Package}
          />
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
            <div className="border-b border-bdr bg-sur-2 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
              <span className="text-navy">{filtered.length}</span> / {total}{' '}
              პოზიცია · წყარო:{' '}
              <a
                href="https://trm.ge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue hover:underline"
              >
                TRM.GE
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                    <th className="w-10 px-3 py-2.5 text-center font-bold">N</th>
                    <th className="w-9 px-2 py-2.5 font-bold"></th>
                    <th className="px-3 py-2.5 font-bold">კოდი</th>
                    <th className="min-w-[200px] px-3 py-2.5 font-bold">
                      დასახელება
                    </th>
                    <th className="min-w-[150px] px-3 py-2.5 font-bold">
                      განმარტება
                    </th>
                    <th className="min-w-[180px] px-3 py-2.5 font-bold">
                      მეტა ტაგები
                    </th>
                    <th className="min-w-[80px] px-3 py-2.5 font-bold">
                      განზ.
                    </th>
                    <th className="w-20 px-3 py-2.5 text-right font-bold">
                      რაოდ.
                    </th>
                    <th className="w-24 px-3 py-2.5 text-right font-bold">
                      ფასი
                    </th>
                    <th className="w-28 px-3 py-2.5 text-right font-bold">
                      სტ. ჯამი
                    </th>
                    <th className="w-24 px-3 py-2.5 text-center font-bold">
                      რეზერვი
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <ProductRow
                      key={p.id}
                      index={i + 1}
                      product={p}
                      meta={getMeta(p.sku)}
                      onMetaChange={(patch) => updateMeta(p.sku, patch)}
                      onReserveClick={() => setReserveTarget(p)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {reserveTarget && (
        <ReserveModal
          product={reserveTarget}
          meta={getMeta(reserveTarget.sku)}
          onMetaChange={(patch) => updateMeta(reserveTarget.sku, patch)}
          onClose={() => setReserveTarget(null)}
        />
      )}
    </DmtPageShell>
  );
}

// ── ProductRow ───────────────────────────────────────────────────────────
function ProductRow({
  index,
  product: p,
  meta,
  onMetaChange,
  onReserveClick,
}: {
  index: number;
  product: TrmProduct;
  meta: ProductMeta;
  onMetaChange: (patch: Partial<ProductMeta>) => void;
  onReserveClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const tags = autoTags(p);
  const qty = meta.qty;
  const stockTotal =
    qty > 0 && typeof p.price === 'number' && p.price > 0
      ? qty * p.price
      : null;
  const reserveCount = meta.reservedLeadIds.length;
  const displayDesc = meta.description || p.model || '';

  function startEditDesc() {
    setDescDraft(meta.description || p.model || '');
    setEditingDesc(true);
    setMenuOpen(false);
  }

  function commitDesc() {
    onMetaChange({description: descDraft});
    setEditingDesc(false);
  }

  return (
    <tr className="border-b border-bdr last:border-b-0 hover:bg-sur-2">
      {/* N */}
      <td className="px-3 py-2 text-center font-mono text-[10px] text-text-3">
        {index}
      </td>

      {/* Actions */}
      <td className="px-2 py-2">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-blue-lt hover:text-blue"
            title="ფუნქციები"
          >
            <MoreHorizontal size={13} strokeWidth={2} />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-7 z-20 min-w-[160px] overflow-hidden rounded-[8px] border border-bdr bg-sur shadow-lg">
              <button
                type="button"
                onClick={startEditDesc}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11.5px] text-text hover:bg-sur-2"
              >
                <Edit2 size={11} strokeWidth={2} /> განმარტება
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(p.sku);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11.5px] text-text hover:bg-sur-2"
              >
                <Copy size={11} strokeWidth={2} /> კოდი (კოპირება)
              </button>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11.5px] text-text hover:bg-sur-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <ExternalLink size={11} strokeWidth={2} /> TRM.GE
                </a>
              )}
            </div>
          )}
        </div>
      </td>

      {/* კოდი */}
      <td className="px-3 py-2 font-mono text-[11px] font-semibold text-navy">
        {p.sku || '—'}
      </td>

      {/* დასახელება */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-bdr bg-sur-2">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-3">
                <Tag size={10} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="line-clamp-1 font-medium text-text">{p.name}</div>
            {p.brand && (
              <div className="font-mono text-[10px] text-text-3">{p.brand}</div>
            )}
          </div>
        </div>
      </td>

      {/* განმარტება */}
      <td className="px-3 py-2">
        {editingDesc ? (
          <input
            autoFocus
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={commitDesc}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDesc();
              if (e.key === 'Escape') setEditingDesc(false);
            }}
            className="w-full rounded border border-blue bg-sur px-2 py-0.5 text-[11.5px] text-text outline-none"
          />
        ) : (
          <span
            onClick={startEditDesc}
            className="line-clamp-2 cursor-pointer text-[11.5px] text-text-2 hover:text-navy"
            title="დააჭირე შესაცვლელად"
          >
            {displayDesc || (
              <span className="italic text-text-3">+ დამატება</span>
            )}
          </span>
        )}
      </td>

      {/* მეტა ტაგები */}
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-bdr bg-sur-2 px-1.5 py-0.5 font-mono text-[9.5px] text-text-3"
            >
              {tag}
            </span>
          ))}
          {meta.extraTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-blue-bd bg-blue-lt px-1.5 py-0.5 font-mono text-[9.5px] text-blue"
            >
              {tag}
            </span>
          ))}
        </div>
      </td>

      {/* განზ. */}
      <td className="px-3 py-2 text-[11.5px] text-text-2">
        {p.power || '—'}
      </td>

      {/* რაოდ. */}
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          min={0}
          value={qty}
          onChange={(e) =>
            onMetaChange({qty: Math.max(0, Number(e.target.value))})
          }
          className="w-16 rounded border border-bdr bg-sur px-2 py-0.5 text-right font-mono text-[11.5px] text-navy outline-none focus:border-blue"
        />
      </td>

      {/* ფასი */}
      <td className="px-3 py-2 text-right font-mono text-[12px] font-semibold text-navy">
        {typeof p.price === 'number' && p.price > 0
          ? `₾ ${fmt(p.price)}`
          : '—'}
        {p.on_sale &&
          typeof p.regular === 'number' &&
          p.regular !== p.price && (
            <div className="font-mono text-[10px] text-text-3 line-through">
              ₾ {fmt(p.regular)}
            </div>
          )}
      </td>

      {/* სტ. ჯამი */}
      <td className="px-3 py-2 text-right font-mono text-[12px] font-semibold">
        {stockTotal !== null ? (
          <span className="text-navy">₾ {fmt(Math.round(stockTotal))}</span>
        ) : (
          <span className="text-text-3">—</span>
        )}
      </td>

      {/* რეზერვი */}
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={onReserveClick}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold transition-colors hover:border-blue-bd hover:bg-blue-lt hover:text-blue ${
            reserveCount > 0
              ? 'border-blue-bd bg-blue-lt text-blue'
              : 'border-bdr bg-sur text-text-3'
          }`}
        >
          <Bookmark size={10} strokeWidth={2} />
          {reserveCount > 0 ? reserveCount : '—'}
        </button>
      </td>
    </tr>
  );
}

// ── ReserveModal ─────────────────────────────────────────────────────────
function ReserveModal({
  product: p,
  meta,
  onMetaChange,
  onClose,
}: {
  product: TrmProduct;
  meta: ProductMeta;
  onMetaChange: (patch: Partial<ProductMeta>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(meta.reservedLeadIds),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    onMetaChange({reservedLeadIds: [...selected]});
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[14px] border border-bdr bg-sur shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-bdr px-5 py-4">
          <div>
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
              რეზერვი — პოტენციური პროექტები
            </div>
            <div className="mt-0.5 font-semibold text-navy">{p.name}</div>
            <div className="font-mono text-[10.5px] text-text-3">{p.sku}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-sur-2 hover:text-navy"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Lead list */}
        <div className="max-h-[400px] overflow-y-auto">
          {RESERVE_LEADS.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-text-3">
              პოტენციური პროექტი არ არსებობს
            </div>
          ) : (
            <div className="divide-y divide-bdr">
              {RESERVE_LEADS.map((l) => {
                const checked = selected.has(l.id);
                const sm = STAGE_META[l.stage];
                return (
                  <label
                    key={l.id}
                    className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-sur-2 ${
                      checked ? 'bg-blue-lt' : ''
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked ? 'border-blue bg-blue' : 'border-bdr bg-sur'
                      }`}
                    >
                      {checked && (
                        <Check size={10} strokeWidth={2.5} className="text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(l.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-text">
                        {l.company}
                      </div>
                      <div className="font-mono text-[10px] text-text-3">
                        {l.id} · {l.name}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        color: sm.color,
                        background: sm.bg,
                        borderColor: sm.border,
                      }}
                    >
                      {sm.label}
                    </span>
                    {l.value > 0 && (
                      <div className="shrink-0 font-mono text-[11px] font-semibold text-navy">
                        ₾ {fmt(l.value)}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-bdr px-5 py-3">
          <span className="font-mono text-[10.5px] text-text-3">
            {selected.size} პროექტი მონიშნული
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-md border border-bdr px-4 text-[12px] font-semibold text-text-2 hover:bg-sur-2"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={save}
              className="h-8 rounded-md bg-blue px-4 text-[12px] font-semibold text-white hover:opacity-90"
            >
              შენახვა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────
function EmptyState({
  title,
  hint,
  icon: Icon,
}: {
  title: string;
  hint?: string;
  icon: typeof Boxes;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sur-2 text-text-3">
        <Icon size={22} strokeWidth={1.6} />
      </div>
      <div className="mt-3 text-[14px] font-semibold text-navy">{title}</div>
      {hint && (
        <div className="mt-1 max-w-sm text-[12px] text-text-3">{hint}</div>
      )}
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  accent?: 'red' | 'grn' | 'ora';
  icon?: typeof Boxes;
}) {
  const color =
    accent === 'red'
      ? 'var(--red)'
      : accent === 'grn'
        ? 'var(--grn)'
        : accent === 'ora'
          ? 'var(--ora)'
          : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {label}
        </div>
        {Icon && <Icon size={14} className="text-text-3" />}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>
        {value}
      </div>
    </div>
  );
}
