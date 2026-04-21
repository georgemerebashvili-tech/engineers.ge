'use client';

import {useEffect, useMemo, useState} from 'react';
import {useSearchParams, useRouter, usePathname} from 'next/navigation';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {ResizableTable} from '@/components/dmt/resizable-table';
import {Boxes, Building2, Package, Link2, ExternalLink, Tag} from 'lucide-react';
import Link from 'next/link';
import {LEADS, leadToObjectCode} from '@/lib/dmt/leads-data';
import {
  loadTrmCatalog,
  leafCategory,
  uniqueCategories,
  type TrmProduct
} from '@/lib/dmt/trm-catalog';

type Tab = 'objects' | 'stock';

function parseTab(v: string | null): Tab {
  return v === 'stock' ? 'stock' : 'objects';
}

type ObjectStatus = 'active' | 'pipeline';

type InventoryObject = {
  code: string;
  name: string;
  leadId: string;
  client: string;
  status: ObjectStatus;
  value: number;
  startDate: string;
  owner: string;
};

const STATUS_META: Record<ObjectStatus, {label: string; color: string; bg: string; border: string}> = {
  active:   {label: 'აქტიური',  color: 'var(--grn)',  bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  pipeline: {label: 'pipeline', color: 'var(--ora)',  bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'}
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function leadsToObjects(): InventoryObject[] {
  return LEADS.filter((l) => l.stage === 'won' || l.stage === 'proposal').map((l) => ({
    code: leadToObjectCode(l.id),
    name: l.company,
    leadId: l.id,
    client: l.name,
    status: l.stage === 'won' ? 'active' : 'pipeline',
    value: l.value,
    startDate: l.created,
    owner: l.owner
  }));
}

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlTab = parseTab(searchParams.get('tab'));
  const [tab, setTab] = useState<Tab>(urlTab);
  const [q, setQ] = useState('');

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  const switchTab = (next: Tab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`${pathname}?${params.toString()}`, {scroll: false});
  };

  const objects = useMemo(leadsToObjects, []);
  const filteredObjects = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return objects;
    return objects.filter(
      (o) =>
        o.code.toLowerCase().includes(t) ||
        o.name.toLowerCase().includes(t) ||
        o.client.toLowerCase().includes(t) ||
        o.leadId.toLowerCase().includes(t)
    );
  }, [q, objects]);

  const activeCount = objects.filter((o) => o.status === 'active').length;
  const pipelineCount = objects.filter((o) => o.status === 'pipeline').length;
  const totalValue = objects.reduce((s, o) => s + o.value, 0);

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ინვენტარიზაცია"
      subtitle="ობიექტები (ლიდებიდან) და მარაგი — SKU კატალოგი"
      searchPlaceholder={
        tab === 'objects'
          ? 'ძიება ობიექტის კოდი / კომპანია / ლიდი…'
          : 'ძიება SKU / სახელი / კატეგორია…'
      }
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 inline-flex items-center gap-1 rounded-[10px] border border-bdr bg-sur p-1">
          <TabButton active={tab === 'objects'} onClick={() => switchTab('objects')} icon={Building2}>
            ობიექტები
            <span className="ml-1.5 rounded-full bg-sur-2 px-1.5 py-[1px] font-mono text-[10px] font-semibold text-text-3">
              {objects.length}
            </span>
          </TabButton>
          <TabButton active={tab === 'stock'} onClick={() => switchTab('stock')} icon={Package}>
            მარაგი · SKU
          </TabButton>
        </div>

        {tab === 'objects' && (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <StatCard label="სულ ობიექტი" value={String(objects.length)} icon={Building2} />
              <StatCard label="აქტიური" value={String(activeCount)} accent="grn" />
              <StatCard label="pipeline" value={String(pipelineCount)} accent="ora" />
              <StatCard label="ჯამური ღირებ." value={`₾ ${fmt(totalValue)}`} />
            </div>

            {filteredObjects.length === 0 ? (
              <EmptyState
                title={objects.length === 0 ? 'ობიექტი ჯერ არ არსებობს' : 'ძიების შედეგი ვერ მოიძებნა'}
                hint={
                  objects.length === 0
                    ? 'ობიექტები ავტომატურად იქმნება ლიდებიდან, როცა სტადია „შეთავაზება" ან „მოგება" ხდება.'
                    : undefined
                }
                icon={Building2}
              />
            ) : (
              <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
                <ResizableTable storageKey="inventory-objects" className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                      <th className="px-4 py-2.5 font-bold">კოდი</th>
                      <th className="px-4 py-2.5 font-bold">ობიექტი</th>
                      <th className="px-4 py-2.5 font-bold">კლიენტი</th>
                      <th className="px-4 py-2.5 font-bold">წყარო</th>
                      <th className="px-4 py-2.5 font-bold">სტატუსი</th>
                      <th className="px-4 py-2.5 font-bold">დაიწყო</th>
                      <th className="px-4 py-2.5 font-bold">მფლ.</th>
                      <th className="px-4 py-2.5 text-right font-bold">ღირებ.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredObjects.map((o) => {
                      const st = STATUS_META[o.status];
                      return (
                        <tr key={o.code} className="border-b border-bdr last:border-b-0 hover:bg-sur-2">
                          <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-navy">{o.code}</td>
                          <td className="px-4 py-2.5 text-text">{o.name}</td>
                          <td className="px-4 py-2.5 text-text-2">{o.client}</td>
                          <td className="px-4 py-2.5">
                            <Link
                              href="/dmt/leads"
                              className="inline-flex items-center gap-1 rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[10px] text-text-2 transition-colors hover:border-blue-bd hover:bg-blue-lt hover:text-blue"
                              title="ლიდზე გადასვლა"
                            >
                              <Link2 size={9} strokeWidth={2} /> {o.leadId}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                              style={{color: st.color, background: st.bg, borderColor: st.border}}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-text-2">{o.startDate}</td>
                          <td className="px-4 py-2.5 text-text-2">{o.owner}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-[12px] font-semibold text-navy">
                            ₾ {fmt(o.value)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </ResizableTable>
              </div>
            )}
          </>
        )}

        {tab === 'stock' && <StockPanel q={q} />}
      </div>
    </DmtPageShell>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold transition-colors ${
        active
          ? 'bg-blue-lt text-blue'
          : 'text-text-2 hover:bg-sur-2 hover:text-navy'
      }`}
    >
      <Icon size={14} strokeWidth={2} />
      {children}
    </button>
  );
}

function EmptyState({
  title,
  hint,
  icon: Icon
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
      {hint && <div className="mt-1 max-w-sm text-[12px] text-text-3">{hint}</div>}
    </div>
  );
}

function StockPanel({q}: {q: string}) {
  const [products, setProducts] = useState<TrmProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    loadTrmCatalog()
      .then((c) => {
        if (!cancelled) setProducts(c.products);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'load failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allCats = useMemo(
    () => (products ? uniqueCategories(products) : []),
    [products]
  );

  const filtered = useMemo(() => {
    if (!products) return [];
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== 'all' && leafCategory(p.category) !== cat) return false;
      if (!t) return true;
      return (
        p.name.toLowerCase().includes(t) ||
        p.sku.toLowerCase().includes(t) ||
        p.category.toLowerCase().includes(t) ||
        p.brand.toLowerCase().includes(t) ||
        p.model.toLowerCase().includes(t)
      );
    });
  }, [products, q, cat]);

  if (error) {
    return (
      <EmptyState
        title="კატალოგის ჩატვირთვა ვერ მოხერხდა"
        hint={error}
        icon={Package}
      />
    );
  }
  if (!products) {
    return (
      <div className="flex items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-[12px] text-text-3">
        იტვირთება კატალოგი…
      </div>
    );
  }

  const total = products.length;
  const inStock = products.filter((p) => p.in_stock).length;
  const outOfStock = total - inStock;
  const avgPrice = (() => {
    const withPrice = products.filter((p) => typeof p.price === 'number' && p.price! > 0);
    if (!withPrice.length) return 0;
    return withPrice.reduce((s, p) => s + (p.price || 0), 0) / withPrice.length;
  })();

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <StatCard label="SKU" value={String(total)} icon={Boxes} />
        <StatCard label="მარაგში" value={String(inStock)} accent="grn" />
        <StatCard label="მარაგგარეშე" value={String(outOfStock)} accent="red" />
        <StatCard label="საშ. ფასი" value={`₾ ${fmt(Math.round(avgPrice))}`} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <CatChip active={cat === 'all'} onClick={() => setCat('all')}>
          ყველა
          <span className="ml-1.5 font-mono text-[10px] text-text-3">{total}</span>
        </CatChip>
        {allCats.map((c) => {
          const n = products.filter((p) => leafCategory(p.category) === c).length;
          return (
            <CatChip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
              <span className="ml-1.5 font-mono text-[10px] text-text-3">{n}</span>
            </CatChip>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="შედეგი ვერ მოიძებნა"
          hint="შეცვალე ძიება ან კატეგორია."
          icon={Package}
        />
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <div className="border-b border-bdr bg-sur-2 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
            <span className="text-navy">{filtered.length}</span> / {total} პოზიცია
            {' · '}
            წყარო:{' '}
            <a
              href="https://trm.ge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue hover:underline"
            >
              trm.ge
            </a>
          </div>
          <ResizableTable storageKey="inventory-stock" className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                  <th className="w-12 px-2 py-2 font-bold"></th>
                  <th className="px-3 py-2 font-bold">SKU</th>
                  <th className="px-3 py-2 font-bold">დასახელება</th>
                  <th className="px-3 py-2 font-bold">კატეგორია</th>
                  <th className="px-3 py-2 font-bold">ბრენდი</th>
                  <th className="px-3 py-2 text-right font-bold">ფასი</th>
                  <th className="px-3 py-2 font-bold">სტატუსი</th>
                  <th className="w-10 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-bdr last:border-b-0 hover:bg-sur-2"
                  >
                    <td className="px-2 py-1.5">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-bdr bg-sur-2">
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
                            <Tag size={12} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[11px] font-semibold text-navy">
                      {p.sku || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-text">
                      <div className="line-clamp-1">{p.name}</div>
                      {p.model && (
                        <div className="font-mono text-[10px] text-text-3">
                          {p.model}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-text-2">
                      <span className="text-[11.5px]">{leafCategory(p.category)}</span>
                    </td>
                    <td className="px-3 py-1.5 text-text-2">{p.brand || '—'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-[12px] font-semibold text-navy">
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
                    <td className="px-3 py-1.5">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                        style={
                          p.in_stock
                            ? {
                                color: 'var(--grn)',
                                background: 'var(--grn-lt)',
                                borderColor: 'var(--grn-bd)'
                              }
                            : {
                                color: 'var(--red)',
                                background: 'var(--red-lt)',
                                borderColor: 'var(--red)'
                              }
                        }
                      >
                        {p.in_stock ? 'მარაგში' : 'გარეშე'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-3 hover:bg-blue-lt hover:text-blue"
                          aria-label="გახსენი trm.ge-ზე"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResizableTable>
        </div>
      )}
    </>
  );
}

function CatChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors ${
        active
          ? 'border-blue bg-blue text-white'
          : 'border-bdr bg-sur text-text-2 hover:border-blue-bd hover:bg-blue-lt hover:text-blue'
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon
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
