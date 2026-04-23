'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {
  Boxes,
  Package,
  Tag,
  MoreHorizontal,
  X,
  Bookmark,
  Check,
  Copy,
  Edit2,
  Trash2,
  Plus,
  Clock,
  User,
  AlertCircle,
  Upload,
  ImageIcon,
} from 'lucide-react';
import {LEADS, STAGE_META} from '@/lib/dmt/leads-data';

// ── Types ────────────────────────────────────────────────────────────────
type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  tags: string[];
  dimensions: string | null;
  qty: number;
  price: number | null;
  image_url: string | null;
  reserve_lead_ids: string[];
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
};

type LogEntry = {
  id: number;
  item_id: string | null;
  item_sku: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, unknown> | null;
  actor: string;
  created_at: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ka-GE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RESERVE_LEADS = LEADS.filter(
  (l) => l.stage === 'proposal' || l.stage === 'won' || l.stage === 'qualified',
);

// ── Hooks ────────────────────────────────────────────────────────────────
function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dmt/inventory');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {items, loading, error, reload: load, setItems};
}

function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dmt/inventory/logs');
      if (!res.ok) return;
      const json = await res.json();
      setLogs(json.logs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  return {logs, loading, load};
}

// ── Main page ────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [q, setQ] = useState('');
  const {items, loading, error, reload, setItems} = useInventory();
  const {logs, loading: logsLoading, load: loadLogs} = useLogs();
  const [showAdd, setShowAdd] = useState(false);
  const [reserveTarget, setReserveTarget] = useState<InventoryItem | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(
      (p) =>
        p.sku.toLowerCase().includes(t) ||
        p.name.toLowerCase().includes(t) ||
        (p.description ?? '').toLowerCase().includes(t) ||
        p.tags.some((tag) => tag.toLowerCase().includes(t)) ||
        (p.dimensions ?? '').toLowerCase().includes(t),
    );
  }, [items, q]);

  // Shared tag pool — all unique tags across all items
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b, 'ka'));
  }, [items]);

  const totalQty = items.reduce((s, p) => s + p.qty, 0);
  const inStock = items.filter((p) => p.qty > 0).length;
  const outOfStock = items.filter((p) => p.qty === 0).length;
  const totalValue = items.reduce(
    (s, p) => s + (p.qty > 0 && p.price ? p.qty * p.price : 0),
    0,
  );

  async function handleDelete(id: string) {
    if (!confirm('ამ ჩანაწერის წაშლა დაადასტურეთ.')) return;
    const res = await fetch(`/api/dmt/inventory/${id}`, {method: 'DELETE'});
    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      if (showLogs) loadLogs();
    }
  }

  async function handlePatch(id: string, patch: Partial<InventoryItem>) {
    const res = await fetch(`/api/dmt/inventory/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const {item} = await res.json();
    setItems((prev) => prev.map((p) => (p.id === id ? item : p)));
    if (showLogs) loadLogs();
  }

  function handleToggleLogs() {
    if (!showLogs) loadLogs();
    setShowLogs((v) => !v);
  }

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ინვენტარი"
      subtitle="SKU კატალოგი — ნივთები, მარაგი, ლოგები"
      searchPlaceholder="ძიება SKU / სახელი / ტეგი…"
      onQueryChange={setQ}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleLogs}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              showLogs
                ? 'border-blue bg-blue-lt text-blue'
                : 'border-bdr bg-sur-2 text-text-2 hover:border-blue hover:text-blue'
            }`}
          >
            <Clock size={13} /> ლოგები
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
          >
            <Plus size={13} /> ახალი
          </button>
        </div>
      }
    >
      <div className="px-6 py-5 md:px-8">
        {/* Stat cards */}
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <StatCard label="სულ SKU" value={String(items.length)} icon={Boxes} />
          <StatCard label="მარაგში" value={String(inStock)} accent="grn" />
          <StatCard label="გარეშე" value={String(outOfStock)} accent="red" />
          <StatCard
            label="სტ. ღირებ."
            value={totalValue > 0 ? `₾ ${fmt(Math.round(totalValue))}` : '—'}
          />
        </div>

        {/* Logs panel */}
        {showLogs && (
          <LogsPanel logs={logs} loading={logsLoading} onClose={() => setShowLogs(false)} />
        )}

        {/* Table */}
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState
            title="ინვენტარი ცარიელია"
            hint='დაამატეთ პირველი ნივთი "ახალი" ღილაკით.'
            icon={Package}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="შედეგი ვერ მოიძებნა" hint="შეცვალე ძიება." icon={Package} />
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
            <div className="border-b border-bdr bg-sur-2 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
              <span className="text-navy">{filtered.length}</span> / {items.length} პოზიცია
              {totalQty > 0 && (
                <span className="ml-3 text-text-3">
                  · სულ {fmt(totalQty)} ერთ.
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                    <th className="w-10 px-3 py-2.5 text-center font-bold">N</th>
                    <th className="w-9 px-2 py-2.5 font-bold"></th>
                    <th className="px-3 py-2.5 font-bold">კოდი</th>
                    <th className="min-w-[200px] px-3 py-2.5 font-bold">დასახელება</th>
                    <th className="min-w-[150px] px-3 py-2.5 font-bold">განმარტება</th>
                    <th className="min-w-[160px] px-3 py-2.5 font-bold">მეტა ტაგები</th>
                    <th className="min-w-[80px] px-3 py-2.5 font-bold">განზ.</th>
                    <th className="w-20 px-3 py-2.5 text-right font-bold">რაოდ.</th>
                    <th className="w-24 px-3 py-2.5 text-right font-bold">ფასი</th>
                    <th className="w-28 px-3 py-2.5 text-right font-bold">სტ. ჯამი</th>
                    <th className="min-w-[120px] px-3 py-2.5 font-bold">დაამატა</th>
                    <th className="min-w-[110px] px-3 py-2.5 font-bold">თარიღი</th>
                    <th className="w-24 px-3 py-2.5 text-center font-bold">რეზერვი</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <ProductRow
                      key={item.id}
                      index={i + 1}
                      item={item}
                      allTags={allTags}
                      onPatch={(patch) => handlePatch(item.id, patch)}
                      onDelete={() => handleDelete(item.id)}
                      onReserveClick={() => setReserveTarget(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddItemModal
          allTags={allTags}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            reload();
            if (showLogs) loadLogs();
          }}
        />
      )}

      {reserveTarget && (
        <ReserveModal
          item={reserveTarget}
          onSave={async (ids) => {
            await handlePatch(reserveTarget.id, {reserve_lead_ids: ids});
            setReserveTarget(null);
          }}
          onClose={() => setReserveTarget(null)}
        />
      )}
    </DmtPageShell>
  );
}

// ── TagInput ─────────────────────────────────────────────────────────────
function TagInput({
  value,
  onChange,
  suggestions,
  onBlur,
  autoFocus,
  placeholder = 'ტეგი…',
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  onBlur?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const filtered = useMemo(
    () =>
      suggestions.filter(
        (s) => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase()),
      ),
    [suggestions, value, input],
  );

  function add(tag: string) {
    const t = tag.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) add(input);
      else if (filtered[0]) add(filtered[0]);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      onBlur?.();
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setOpen(false);
    onBlur?.();
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <div
        className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-md border border-blue bg-sur px-2 py-1"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-2 py-0.5 font-mono text-[9.5px] text-blue"
          >
            {tag}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                remove(tag);
              }}
              className="ml-0.5 text-blue/60 hover:text-blue"
            >
              <X size={9} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[80px] flex-1 bg-transparent text-[12px] text-text outline-none placeholder:text-text-3"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-[8px] border border-bdr bg-sur shadow-lg">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-text hover:bg-sur-2"
            >
              <Tag size={10} className="shrink-0 text-text-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ProductRow ───────────────────────────────────────────────────────────
function ProductRow({
  index,
  item,
  allTags,
  onPatch,
  onDelete,
  onReserveClick,
}: {
  index: number;
  item: InventoryItem;
  allTags: string[];
  onPatch: (patch: Partial<InventoryItem>) => void;
  onDelete: () => void;
  onReserveClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingTags, setEditingTags] = useState(false);
  const [qtyDraft, setQtyDraft] = useState(String(item.qty));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQtyDraft(String(item.qty));
  }, [item.qty]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  const stockTotal =
    item.qty > 0 && item.price != null ? item.qty * item.price : null;
  const reserveCount = item.reserve_lead_ids.length;

  function commitDesc() {
    onPatch({description: descDraft});
    setEditingDesc(false);
  }

  function commitQty() {
    const n = Math.max(0, parseInt(qtyDraft, 10) || 0);
    if (n !== item.qty) onPatch({qty: n});
    setQtyDraft(String(n));
  }

  return (
    <tr className="border-b border-bdr last:border-b-0 hover:bg-sur-2">
      {/* N */}
      <td className="px-3 py-2 text-center font-mono text-[10px] text-text-3">{index}</td>

      {/* Actions menu */}
      <td className="px-2 py-2">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-blue-lt hover:text-blue"
          >
            <MoreHorizontal size={13} strokeWidth={2} />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-7 z-20 min-w-[170px] overflow-hidden rounded-[8px] border border-bdr bg-sur shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setDescDraft(item.description ?? '');
                  setEditingDesc(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11.5px] text-text hover:bg-sur-2"
              >
                <Edit2 size={11} /> განმარტება შეცვლა
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(item.sku);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11.5px] text-text hover:bg-sur-2"
              >
                <Copy size={11} /> კოდი კოპირება
              </button>
              <div className="border-t border-bdr" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11.5px] text-red hover:bg-red-lt"
              >
                <Trash2 size={11} /> წაშლა
              </button>
            </div>
          )}
        </div>
      </td>

      {/* კოდი */}
      <td className="px-3 py-2 font-mono text-[11px] font-semibold text-navy">
        {item.sku}
      </td>

      {/* დასახელება */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="h-8 w-8 shrink-0 rounded-md border border-bdr object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-bdr bg-sur-2 text-text-3">
              <Tag size={10} />
            </div>
          )}
          <div className="min-w-0">
            <div className="line-clamp-1 font-medium text-text">{item.name}</div>
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
            onClick={() => {
              setDescDraft(item.description ?? '');
              setEditingDesc(true);
            }}
            className="line-clamp-2 cursor-pointer text-[11.5px] text-text-2 hover:text-navy"
            title="დააჭირე შესაცვლელად"
          >
            {item.description || <span className="italic text-text-3">+ დამატება</span>}
          </span>
        )}
      </td>

      {/* მეტა ტაგები */}
      <td className="px-3 py-2">
        {editingTags ? (
          <TagInput
            value={item.tags}
            suggestions={allTags}
            onChange={(tags) => {
              onPatch({tags});
              setEditingTags(false);
            }}
            onBlur={() => setEditingTags(false)}
            autoFocus
          />
        ) : (
          <div
            className="flex min-h-[28px] cursor-pointer flex-wrap gap-1"
            onClick={() => setEditingTags(true)}
            title="დააჭირე შესაცვლელად"
          >
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-bdr bg-sur-2 px-1.5 py-0.5 font-mono text-[9.5px] text-text-3"
              >
                {tag}
              </span>
            ))}
            {item.tags.length === 0 && (
              <span className="text-[11px] italic text-text-3">+ ტეგი</span>
            )}
          </div>
        )}
      </td>

      {/* განზ. */}
      <td className="px-3 py-2 text-[11.5px] text-text-2">
        {item.dimensions || '—'}
      </td>

      {/* რაოდ. */}
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          min={0}
          value={qtyDraft}
          onChange={(e) => setQtyDraft(e.target.value)}
          onBlur={commitQty}
          onKeyDown={(e) => e.key === 'Enter' && commitQty()}
          className="w-16 rounded border border-bdr bg-sur px-2 py-0.5 text-right font-mono text-[11.5px] text-navy outline-none focus:border-blue"
        />
      </td>

      {/* ფასი */}
      <td className="px-3 py-2 text-right font-mono text-[12px] font-semibold text-navy">
        {item.price != null ? `₾ ${fmt(item.price)}` : '—'}
      </td>

      {/* სტ. ჯამი */}
      <td className="px-3 py-2 text-right font-mono text-[12px] font-semibold">
        {stockTotal != null ? (
          <span className="text-navy">₾ {fmt(Math.round(stockTotal))}</span>
        ) : (
          <span className="text-text-3">—</span>
        )}
      </td>

      {/* დაამატა */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-text-2">
          <User size={11} strokeWidth={2} className="shrink-0 text-text-3" />
          <span className="line-clamp-1">{item.created_by}</span>
        </div>
        {item.updated_by && (
          <div className="mt-0.5 font-mono text-[9.5px] text-text-3">
            განახლდა: {item.updated_by}
          </div>
        )}
      </td>

      {/* თარიღი */}
      <td className="px-3 py-2 font-mono text-[10.5px] text-text-3">
        {fmtDate(item.created_at)}
        {item.updated_at && (
          <div className="text-[9.5px] text-text-3">
            ↑ {fmtDate(item.updated_at)}
          </div>
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

// ── ImageUploadCrop ──────────────────────────────────────────────────────
function ImageUploadCrop({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [step, setStep] = useState<'idle' | 'crop' | 'uploading'>('idle');
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setCrop(undefined);
      setStep('crop');
    };
    reader.readAsDataURL(file);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const {naturalWidth: w, naturalHeight: h} = e.currentTarget;
    const c = centerCrop(makeAspectCrop({unit: '%', width: 80}, 1, w, h), w, h);
    setCrop(c);
  }

  async function handleCrop() {
    if (!completedCrop || !imgRef.current) return;
    setStep('uploading');
    setUploadErr(null);
    try {
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(completedCrop.width * scaleX * dpr);
      canvas.height = Math.floor(completedCrop.height * scaleY * dpr);
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        completedCrop.x * scaleX, completedCrop.y * scaleY,
        completedCrop.width * scaleX, completedCrop.height * scaleY,
        0, 0,
        completedCrop.width * scaleX, completedCrop.height * scaleY,
      );
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas empty'))), 'image/jpeg', 0.9),
      );
      const fd = new FormData();
      fd.append('file', blob, 'crop.jpg');
      const r = await fetch('/api/dmt/inventory/upload', {method: 'POST', body: fd});
      if (!r.ok) throw new Error((await r.json()).error ?? 'upload failed');
      const {url} = await r.json();
      onChange(url);
      setSrc(null);
      setStep('idle');
    } catch (e) {
      setUploadErr((e as Error).message);
      setStep('crop');
    }
  }

  // uploading spinner
  if (step === 'uploading') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-4 py-5 text-[12px] text-text-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-bdr border-t-blue" />
        იტვირთება…
      </div>
    );
  }

  // crop step
  if (step === 'crop' && src) {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-md border border-bdr bg-[#000]">
          <ReactCrop
            crop={crop}
            onChange={(_, pc) => setCrop(pc)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            minWidth={40}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="crop"
              onLoad={onImageLoad}
              style={{maxHeight: 260, width: '100%', objectFit: 'contain', display: 'block'}}
            />
          </ReactCrop>
        </div>
        {uploadErr && <div className="text-[11px] text-red">{uploadErr}</div>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {setStep('idle'); setSrc(null);}}
            className="h-7 rounded-md border border-bdr px-3 text-[11.5px] text-text-2 hover:bg-sur-2"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={handleCrop}
            disabled={!completedCrop}
            className="h-7 rounded-md bg-blue px-3 text-[11.5px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            ამოჭრა და ატვირთვა
          </button>
        </div>
      </div>
    );
  }

  // has uploaded image — preview + replace
  if (value && step === 'idle') {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt=""
          className="h-16 w-16 rounded-md border border-bdr object-contain bg-sur-2"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => replaceRef.current?.click()}
            className="text-[11.5px] text-blue hover:underline"
          >
            სხვა სურათი
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11.5px] text-red hover:underline"
          >
            წაშლა
          </button>
        </div>
        <input
          ref={replaceRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onSelectFile}
        />
      </div>
    );
  }

  // default: drop zone
  return (
    <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-bdr bg-sur-2 px-4 py-6 transition-colors hover:border-blue hover:bg-blue-lt">
      <Upload size={20} className="text-text-3 transition-colors group-hover:text-blue" />
      <div className="text-center">
        <div className="text-[12px] font-semibold text-text-2 group-hover:text-blue">
          სურათის ატვირთვა
        </div>
        <div className="mt-0.5 text-[10.5px] text-text-3">JPEG / PNG / WebP · max 5 MB</div>
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onSelectFile}
      />
    </label>
  );
}

// ── AddItemModal ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  dimensions: '',
  qty: '0',
  price: '',
};

function AddItemModal({
  allTags,
  onClose,
  onSaved,
}: {
  allTags: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({...prev, [k]: e.target.value}));
  }

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/dmt/inventory', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          sku: form.sku.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          tags,
          dimensions: form.dimensions.trim() || undefined,
          qty: Math.max(0, parseInt(form.qty, 10) || 0),
          price: form.price ? parseFloat(form.price) : undefined,
          image_url: imageUrl || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setErr(j.error?.formErrors?.join(', ') ?? j.error ?? 'შეცდომა');
        return;
      }
      onSaved();
    } catch {
      setErr('ქსელის შეცდომა');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg overflow-hidden rounded-[14px] border border-bdr bg-sur shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-bdr px-5 py-4">
          <div className="font-semibold text-navy">ახალი ნივთი</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-sur-2"
          >
            <X size={15} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU *" required>
              <input
                value={form.sku}
                onChange={set('sku')}
                required
                placeholder="009840"
                className={inputCls}
              />
            </Field>
            <Field label="განზ." >
              <input
                value={form.dimensions}
                onChange={set('dimensions')}
                placeholder="16 კვტ"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="დასახელება *" required className="mt-3">
            <input
              value={form.name}
              onChange={set('name')}
              required
              placeholder="ჭერის კონდიციონერი 24000BTU"
              className={inputCls}
            />
          </Field>

          <Field label="განმარტება" className="mt-3">
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              placeholder="დამატებითი ინფო..."
              className={`${inputCls} resize-none`}
            />
          </Field>

          <Field label="მეტა ტაგები" className="mt-3">
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={allTags}
              placeholder="ტეგი + Enter…"
            />
          </Field>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="რაოდ.">
              <input
                type="number"
                min={0}
                value={form.qty}
                onChange={set('qty')}
                className={inputCls}
              />
            </Field>
            <Field label="ფასი (₾)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={set('price')}
                placeholder="1250"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="სურათი" className="mt-3">
            <ImageUploadCrop value={imageUrl} onChange={setImageUrl} />
          </Field>

          {err && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-red bg-red-lt px-3 py-2 text-[11.5px] text-red">
              <AlertCircle size={13} /> {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-bdr px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-bdr px-4 text-[12px] font-semibold text-text-2 hover:bg-sur-2"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-8 rounded-md bg-blue px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'ინახება…' : 'შენახვა'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── ReserveModal ─────────────────────────────────────────────────────────
function ReserveModal({
  item,
  onSave,
  onClose,
}: {
  item: InventoryItem;
  onSave: (ids: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(item.reserve_lead_ids),
  );
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    await onSave([...selected]);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[14px] border border-bdr bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-bdr px-5 py-4">
          <div>
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
              რეზერვი — პოტენციური პროექტები
            </div>
            <div className="mt-0.5 font-semibold text-navy">{item.name}</div>
            <div className="font-mono text-[10.5px] text-text-3">{item.sku}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-sur-2"
          >
            <X size={15} />
          </button>
        </div>

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
                    className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-sur-2 ${checked ? 'bg-blue-lt' : ''}`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked ? 'border-blue bg-blue' : 'border-bdr bg-sur'
                      }`}
                    >
                      {checked && <Check size={10} strokeWidth={2.5} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(l.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-text">{l.company}</div>
                      <div className="font-mono text-[10px] text-text-3">{l.id} · {l.name}</div>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={{color: sm.color, background: sm.bg, borderColor: sm.border}}
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

        <div className="flex items-center justify-between border-t border-bdr px-5 py-3">
          <span className="font-mono text-[10.5px] text-text-3">{selected.size} პროექტი</span>
          <div className="flex gap-2">
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
              disabled={saving}
              className="h-8 rounded-md bg-blue px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'ინახება…' : 'შენახვა'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LogsPanel ────────────────────────────────────────────────────────────
const ACTION_STYLE = {
  create: {label: 'დამატება',  color: 'var(--grn)', bg: 'var(--grn-lt)', border: 'var(--grn-bd)'},
  update: {label: 'განახლება', color: 'var(--ora)', bg: 'var(--ora-lt)', border: 'var(--ora-bd)'},
  delete: {label: 'წაშლა',    color: 'var(--red)', bg: 'var(--red-lt)', border: 'var(--red)'},
};

function LogsPanel({
  logs,
  loading,
  onClose,
}: {
  logs: LogEntry[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-[10px] border border-bdr bg-sur">
      <div className="flex items-center justify-between border-b border-bdr bg-sur-2 px-4 py-2">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
          <Clock size={11} /> ლოგები
          <span className="text-navy">({logs.length})</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-3 hover:bg-bdr"
        >
          <X size={13} />
        </button>
      </div>
      {loading ? (
        <div className="px-4 py-6 text-center text-[12px] text-text-3">იტვირთება…</div>
      ) : logs.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-text-3">ლოგი ცარიელია</div>
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-bdr">
          {logs.map((log) => {
            const st = ACTION_STYLE[log.action];
            return (
              <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className="mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold"
                  style={{color: st.color, background: st.bg, borderColor: st.border}}
                >
                  {st.label}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] font-semibold text-navy">
                    {log.item_sku}
                  </span>
                  {log.action === 'update' && log.changes && (
                    <span className="ml-2 text-[10.5px] text-text-3">
                      {Object.keys(log.changes)
                        .filter((k) => k !== 'snapshot')
                        .join(', ')}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-[10.5px] text-text-2">
                    <User size={10} className="text-text-3" />
                    {log.actor}
                  </div>
                  <div className="font-mono text-[9.5px] text-text-3">
                    {fmtDate(log.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12.5px] text-text placeholder:text-text-3 focus:border-blue focus:outline-none';

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
        {label}
        {required && <span className="ml-0.5 text-red">*</span>}
      </div>
      {children}
    </label>
  );
}

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
    accent === 'red' ? 'var(--red)' : accent === 'grn' ? 'var(--grn)' : accent === 'ora' ? 'var(--ora)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">{label}</div>
        {Icon && <Icon size={14} className="text-text-3" />}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>{value}</div>
    </div>
  );
}

function EmptyState({title, hint, icon: Icon}: {title: string; hint?: string; icon: typeof Boxes}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sur-2 text-text-3">
        <Icon size={22} strokeWidth={1.6} />
      </div>
      <div className="mt-3 text-[14px] font-semibold text-navy">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-[12px] text-text-3">{hint}</div>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-[12px] text-text-3">
      იტვირთება…
    </div>
  );
}

function ErrorState({message}: {message: string}) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-red bg-red-lt px-4 py-4 text-[12px] text-red">
      <AlertCircle size={15} /> {message}
    </div>
  );
}
