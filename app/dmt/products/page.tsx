'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Plus,
  Trash2,
  Search,
  Factory,
  Info,
  Boxes,
  Link2,
  ImagePlus,
  X,
  Calculator,
  ChevronDown
} from 'lucide-react';
import {ResizableTable} from '@/components/dmt/resizable-table';
import {
  loadProducts,
  saveProducts,
  createProduct,
  componentsSubtotal,
  computeBreakdown,
  cryptoRandomId,
  type Product,
  type ComponentRow,
  type OverheadRow,
  type OverheadOp
} from '@/lib/dmt/products-store';

type Tab = 'general' | 'components' | 'usage';

const OP_LABEL: Record<OverheadOp, string> = {
  add: '+ ფიქს.',
  percent: '+ %',
  multiply: '× mult.'
};

function fmtCurrency(n: number) {
  if (!Number.isFinite(n)) return '—';
  return `₾ ${n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('general');
  const [q, setQ] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    const list = loadProducts();
    setProducts(list);
    if (list.length > 0) setSelectedId(list[0].id);
    setHydrated(true);
  }, []);

  // persist
  useEffect(() => {
    if (hydrated) saveProducts(products);
  }, [products, hydrated]);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        p.version.toLowerCase().includes(t) ||
        p.type.toLowerCase().includes(t)
    );
  }, [products, q]);

  const handleCreate = () => {
    const p = createProduct({
      name: `ახალი პროდუქცია ${products.length + 1}`,
      version: 'V0.0.1'
    });
    setProducts((prev) => [p, ...prev]);
    setSelectedId(p.id);
    setTab('general');
  };

  const handleDelete = (id: string) => {
    if (!confirm('წავშალო ეს პროდუქცია?')) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateSelected = (patch: Partial<Product>) => {
    if (!selected) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === selected.id
          ? {...p, ...patch, updatedAt: new Date().toISOString()}
          : p
      )
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-bdr bg-sur px-6 py-3 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
              MANUFACTURING
            </div>
            <h1 className="text-xl font-bold tracking-tight text-navy md:text-2xl">
              პროდუქციების კატალოგი
            </h1>
            <p className="mt-0.5 text-[12px] text-text-2">
              წარმოებული პროდუქცია, მაკომპლექტებლები, თვითღირებულება და ფასების ფორმულა.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={14} /> ახალი პროდუქცია
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT — product list */}
        <aside className="w-[300px] shrink-0 border-r border-bdr bg-sur-2 flex flex-col overflow-hidden">
          <div className="border-b border-bdr bg-sur px-3 py-2">
            <div className="relative">
              <Search
                size={13}
                strokeWidth={2}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
              />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ძიება სახელი / ვერსია / ტიპი…"
                className="w-full rounded-md border border-bdr bg-sur-2 pl-7 pr-2.5 py-1.5 text-[12px] text-text outline-none focus:border-blue focus:bg-sur"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Factory size={28} className="text-text-3 mb-2" />
                <div className="text-[12px] text-text-3">
                  {products.length === 0
                    ? 'ჯერ არაფერია'
                    : 'ძიების შედეგი ცარიელია'}
                </div>
              </div>
            ) : (
              filtered.map((p, idx) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  index={products.findIndex((x) => x.id === p.id) + 1}
                  active={p.id === selectedId}
                  onSelect={() => setSelectedId(p.id)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* RIGHT — product detail */}
        <section className="flex-1 min-w-0 overflow-y-auto bg-bg">
          {selected ? (
            <ProductDetail
              key={selected.id}
              product={selected}
              tab={tab}
              onTab={setTab}
              onUpdate={updateSelected}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Factory size={40} className="mx-auto text-text-3 mb-3" />
                <div className="text-[14px] font-semibold text-navy">
                  არჩევა საჭიროა
                </div>
                <div className="mt-1 text-[12px] text-text-3">
                  მარცხნიდან აირჩიე პროდუქცია ან შექმენი ახალი.
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  index,
  active,
  onSelect,
  onDelete
}: {
  product: Product;
  index: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {total} = computeBreakdown(product);
  return (
    <div
      className={`group relative flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-all ${
        active
          ? 'border-blue bg-blue-lt shadow-sm'
          : 'border-bdr bg-sur hover:border-bdr-2 hover:bg-sur-2'
      }`}
      onClick={onSelect}
    >
      <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-bdr bg-sur-2">
        {product.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageDataUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Factory size={16} className="text-text-3" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-text-3">
            {index}
          </span>
          <span className="truncate text-[12.5px] font-semibold text-navy">
            {product.name}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="font-mono text-[10.5px] text-text-3">
            {product.version}
          </span>
          {product.type && (
            <>
              <span className="text-text-3">·</span>
              <span className="truncate text-[10.5px] text-text-2">
                {product.type}
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[10.5px] font-semibold text-ora">
          {fmtCurrency(total)}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-1 top-1 rounded-md p-1 text-text-3 opacity-0 transition-all hover:bg-red-lt hover:text-red group-hover:opacity-100"
        aria-label="წაშლა"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function ProductDetail({
  product,
  tab,
  onTab,
  onUpdate
}: {
  product: Product;
  tab: Tab;
  onTab: (t: Tab) => void;
  onUpdate: (patch: Partial<Product>) => void;
}) {
  const {subtotal, steps, total} = computeBreakdown(product);

  return (
    <div className="px-6 py-5 md:px-8">
      {/* Title row */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-bdr bg-sur">
            {product.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageDataUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Factory size={22} className="text-text-3" />
            )}
          </div>
          <div>
            <input
              type="text"
              value={product.name}
              onChange={(e) => onUpdate({name: e.target.value})}
              className="w-full bg-transparent text-[20px] font-bold tracking-tight text-navy outline-none border-b border-transparent focus:border-bdr-2"
            />
            <div className="mt-0.5 flex items-center gap-2">
              <input
                type="text"
                value={product.version}
                onChange={(e) => onUpdate({version: e.target.value})}
                className="w-24 bg-transparent font-mono text-[11.5px] text-text-2 outline-none border-b border-transparent focus:border-bdr-2"
                placeholder="V0.0.1"
              />
              <span className="text-text-3">·</span>
              <input
                type="text"
                value={product.type}
                onChange={(e) => onUpdate({type: e.target.value})}
                placeholder="ტიპი (მაგ. Control Board)"
                className="min-w-0 flex-1 bg-transparent text-[11.5px] text-text-2 outline-none border-b border-transparent focus:border-bdr-2"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 rounded-[10px] border border-ora-bd bg-ora-lt px-4 py-3 text-right">
          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
            თვითღირებულება
          </div>
          <div className="font-mono text-[18px] font-bold text-ora">
            {fmtCurrency(total)}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-text-3">
            მაკომპლ. {fmtCurrency(subtotal)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-0 border-b border-bdr">
        <TabBtn active={tab === 'general'} onClick={() => onTab('general')} icon={Info}>
          ზოგადი
        </TabBtn>
        <TabBtn
          active={tab === 'components'}
          onClick={() => onTab('components')}
          icon={Boxes}
        >
          მაკომპლექტებლები · ფასი
        </TabBtn>
        <TabBtn active={tab === 'usage'} onClick={() => onTab('usage')} icon={Link2}>
          გამოყენება
        </TabBtn>
      </div>

      {/* Tab content */}
      {tab === 'general' && <GeneralTab product={product} onUpdate={onUpdate} />}
      {tab === 'components' && (
        <ComponentsTab
          product={product}
          subtotal={subtotal}
          steps={steps}
          total={total}
          onUpdate={onUpdate}
        />
      )}
      {tab === 'usage' && <UsageTab product={product} onUpdate={onUpdate} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-[12.5px] font-semibold transition-colors ${
        active
          ? 'border-blue text-blue'
          : 'border-transparent text-text-2 hover:text-navy'
      }`}
    >
      <Icon size={14} strokeWidth={2} />
      {children}
    </button>
  );
}

function GeneralTab({
  product,
  onUpdate
}: {
  product: Product;
  onUpdate: (patch: Partial<Product>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickImage = () => fileRef.current?.click();

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({imageDataUrl: String(reader.result || '')});
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-1">
        <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
          სურათი
        </label>
        <div
          className="flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-bdr bg-sur hover:border-blue-bd hover:bg-blue-lt"
          onClick={onPickImage}
        >
          {product.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageDataUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-center text-text-3">
              <ImagePlus size={22} className="mx-auto mb-1" />
              <div className="text-[11px]">აირჩიე ფაილი</div>
            </div>
          )}
        </div>
        {product.imageDataUrl && (
          <button
            type="button"
            onClick={() => onUpdate({imageDataUrl: ''})}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-red hover:underline"
          >
            <X size={11} /> წაშლა
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChosen}
        />
      </div>

      <div className="md:col-span-2 space-y-3">
        <Field label="აღწერა">
          <textarea
            value={product.description}
            onChange={(e) => onUpdate({description: e.target.value})}
            placeholder="რა არის ეს, რისთვის არის, სპეციფიკა…"
            rows={6}
            className="w-full resize-y rounded-md border border-bdr bg-sur px-3 py-2 text-[12.5px] text-text outline-none focus:border-blue"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </label>
      {children}
    </div>
  );
}

function ComponentsTab({
  product,
  subtotal,
  steps,
  total,
  onUpdate
}: {
  product: Product;
  subtotal: number;
  steps: {id: string; label: string; delta: number; running: number}[];
  total: number;
  onUpdate: (patch: Partial<Product>) => void;
}) {
  const addComponent = () => {
    const row: ComponentRow = {
      id: cryptoRandomId(),
      name: '',
      type: '',
      qty: 1,
      unit: 'ც',
      price: 0
    };
    onUpdate({components: [...product.components, row]});
  };

  const updateComponent = (id: string, patch: Partial<ComponentRow>) => {
    onUpdate({
      components: product.components.map((r) =>
        r.id === id ? {...r, ...patch} : r
      )
    });
  };

  const removeComponent = (id: string) => {
    onUpdate({components: product.components.filter((r) => r.id !== id)});
  };

  const addOverhead = () => {
    const row: OverheadRow = {
      id: cryptoRandomId(),
      label: 'ახალი ხარჯი',
      op: 'percent',
      value: 0
    };
    onUpdate({overhead: [...product.overhead, row]});
  };

  const updateOverhead = (id: string, patch: Partial<OverheadRow>) => {
    onUpdate({
      overhead: product.overhead.map((r) =>
        r.id === id ? {...r, ...patch} : r
      )
    });
  };

  const removeOverhead = (id: string) => {
    onUpdate({overhead: product.overhead.filter((r) => r.id !== id)});
  };

  return (
    <div className="space-y-4">
      {/* Components table */}
      <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
        <div className="flex items-center justify-between border-b border-bdr bg-sur-2 px-4 py-2.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-navy">
            <Boxes size={13} strokeWidth={2} />
            მაკომპლექტებლები
          </div>
          <button
            type="button"
            onClick={addComponent}
            className="inline-flex items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2 py-1 text-[11px] font-semibold text-blue hover:bg-blue hover:text-white"
          >
            <Plus size={11} /> კომპონენტი
          </button>
        </div>
        <ResizableTable storageKey="products-components" className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[9.5px] uppercase tracking-[0.06em] text-text-3">
              <th className="px-3 py-2 font-bold">დასახელება</th>
              <th className="px-3 py-2 font-bold">ტიპი</th>
              <th className="px-3 py-2 text-right font-bold">რაოდ.</th>
              <th className="px-3 py-2 font-bold">განზ.</th>
              <th className="px-3 py-2 text-right font-bold">ფასი</th>
              <th className="px-3 py-2 text-right font-bold">ჯამი</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {product.components.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[12px] text-text-3">
                  ჯერ არაფერი არ არის. დააჭირე „+ კომპონენტი" რომ დაამატო მაკომპლექტებელი.
                </td>
              </tr>
            ) : (
              product.components.map((row) => {
                const total = (row.qty || 0) * (row.price || 0);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-bdr last:border-b-0 hover:bg-sur-2"
                  >
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          updateComponent(row.id, {name: e.target.value})
                        }
                        placeholder="დასახელება"
                        className="w-full bg-transparent text-[12px] text-text outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={row.type}
                        onChange={(e) =>
                          updateComponent(row.id, {type: e.target.value})
                        }
                        placeholder="ტიპი"
                        className="w-full bg-transparent text-[12px] text-text-2 outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={row.qty}
                        step="0.01"
                        onChange={(e) =>
                          updateComponent(row.id, {
                            qty: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-20 bg-transparent text-right font-mono text-[12px] text-text outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) =>
                          updateComponent(row.id, {unit: e.target.value})
                        }
                        placeholder="ც"
                        className="w-14 bg-transparent text-[12px] text-text-2 outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={row.price}
                        step="0.01"
                        onChange={(e) =>
                          updateComponent(row.id, {
                            price: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-24 bg-transparent text-right font-mono text-[12px] text-text outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[12px] font-semibold text-navy">
                      {fmtCurrency(total)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeComponent(row.id)}
                        className="rounded-md p-1 text-text-3 hover:bg-red-lt hover:text-red"
                        aria-label="წაშლა"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-bdr-2 bg-sur-2">
              <td colSpan={5} className="px-3 py-2 text-right font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-text-3">
                ქვეჯამი · მაკომპლექტებლები
              </td>
              <td className="px-3 py-2 text-right font-mono text-[13px] font-bold text-navy">
                {fmtCurrency(subtotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        </ResizableTable>
      </div>

      {/* Overhead table (Excel-like formulas at bottom) */}
      <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
        <div className="flex items-center justify-between border-b border-bdr bg-sur-2 px-4 py-2.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-navy">
            <Calculator size={13} strokeWidth={2} />
            დამატებითი ხარჯები · ფორმულა
          </div>
          <button
            type="button"
            onClick={addOverhead}
            className="inline-flex items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2 py-1 text-[11px] font-semibold text-blue hover:bg-blue hover:text-white"
          >
            <Plus size={11} /> ხარჯი
          </button>
        </div>
        <ResizableTable storageKey="products-overhead" className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[9.5px] uppercase tracking-[0.06em] text-text-3">
              <th className="px-3 py-2 font-bold">დასახელება</th>
              <th className="w-40 px-3 py-2 font-bold">ოპერაცია</th>
              <th className="w-28 px-3 py-2 text-right font-bold">მნიშვნ.</th>
              <th className="w-32 px-3 py-2 text-right font-bold">+ დელტა</th>
              <th className="w-32 px-3 py-2 text-right font-bold">Running</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {product.overhead.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-5 text-center text-[12px] text-text-3">
                  ხარჯები არ არის — დაამატე აწყობა, ტრანსპორტირება, დღგ...
                </td>
              </tr>
            ) : (
              product.overhead.map((row, i) => {
                const step = steps[i];
                return (
                  <tr
                    key={row.id}
                    className="border-b border-bdr last:border-b-0 hover:bg-sur-2"
                  >
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) =>
                          updateOverhead(row.id, {label: e.target.value})
                        }
                        placeholder="დასახელება"
                        className="w-full bg-transparent text-[12px] text-text outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="relative">
                        <select
                          value={row.op}
                          onChange={(e) =>
                            updateOverhead(row.id, {
                              op: e.target.value as OverheadOp
                            })
                          }
                          className="w-full appearance-none rounded-md border border-bdr bg-sur pl-2 pr-6 py-1 text-[11.5px] text-text outline-none focus:border-blue"
                        >
                          <option value="percent">{OP_LABEL.percent}</option>
                          <option value="add">{OP_LABEL.add}</option>
                          <option value="multiply">{OP_LABEL.multiply}</option>
                        </select>
                        <ChevronDown
                          size={12}
                          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-text-3"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={row.value}
                        step="0.01"
                        onChange={(e) =>
                          updateOverhead(row.id, {
                            value: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-24 bg-transparent text-right font-mono text-[12px] text-text outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[12px] text-text-2">
                      {step ? fmtCurrency(step.delta) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[12px] font-semibold text-navy">
                      {step ? fmtCurrency(step.running) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeOverhead(row.id)}
                        className="rounded-md p-1 text-text-3 hover:bg-red-lt hover:text-red"
                        aria-label="წაშლა"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-bdr-2 bg-ora-lt">
              <td colSpan={4} className="px-3 py-2.5 text-right font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-ora">
                საბოლოო · თვითღირებულება
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-[15px] font-bold text-ora">
                {fmtCurrency(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        </ResizableTable>
      </div>

      <div className="rounded-[10px] border border-bdr bg-sur-2 px-4 py-3 text-[11px] text-text-2">
        <span className="font-semibold text-navy">შენიშვნა:</span> ფორმულები
        ვრცელდება რიგრიგობით. მაგ. „+18% დღგ" გამოითვლება წინა მწკრივის Running
        თანხაზე. ცვლი რიგს → მიიღებ სხვა შედეგს.
      </div>
    </div>
  );
}

function UsageTab({
  product,
  onUpdate
}: {
  product: Product;
  onUpdate: (patch: Partial<Product>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="რისთვის გამოიყენება">
        <textarea
          value={product.usage}
          onChange={(e) => onUpdate({usage: e.target.value})}
          placeholder="სად არის დამონტაჟებული, რომელ სისტემაშია, რომელ ობიექტებზე…"
          rows={8}
          className="w-full resize-y rounded-md border border-bdr bg-sur px-3 py-2 text-[12.5px] text-text outline-none focus:border-blue"
        />
      </Field>
      <div className="rounded-[10px] border border-dashed border-bdr bg-sur-2 px-4 py-3 text-[11.5px] text-text-3">
        მომავალ ფაზაში — ავტოლინკი DMT-ის ობიექტებზე (რომელ ობიექტზე ცხრება ეს
        პროდუქცია) და ინვენტარიზაციის SKU-ებზე.
      </div>
    </div>
  );
}
