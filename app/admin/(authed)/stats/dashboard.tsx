'use client';

import {useMemo, useState, useSyncExternalStore} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type {PageViewRow} from './types';

type Range = '24h' | '7d' | '30d';

const RANGE_MS: Record<Range, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
};

const COLORS = ['#1e3a5f', '#3b82f6', '#f97316', '#10b981', '#a855f7', '#ef4444', '#06b6d4', '#eab308'];

export function StatsDashboard({rows}: {rows: PageViewRow[]}) {
  const [range, setRange] = useState<Range>('7d');
  const now = useSyncExternalStore(
    subscribeTime,
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => 0
  );

  const filtered = useMemo(() => {
    if (!now) return rows;
    const cutoff = now - RANGE_MS[range];
    return rows.filter((r) => new Date(r.entered_at).getTime() >= cutoff);
  }, [rows, range, now]);

  const kpi = useMemo(() => computeKpi(filtered), [filtered]);
  const timeseries = useMemo(() => computeTimeseries(filtered, range, now), [filtered, range, now]);
  const topPages = useMemo(() => computeTopPages(filtered), [filtered]);
  const sources = useMemo(() => computeSources(filtered), [filtered]);
  const countries = useMemo(() => computeTop(filtered, 'country', 8), [filtered]);
  const devices = useMemo(() => computeTop(filtered, 'device', 5), [filtered]);
  const browsers = useMemo(() => computeTop(filtered, 'browser', 6), [filtered]);
  const live = useMemo(() => computeLive(rows, now), [rows, now]);
  const dau = useMemo(() => computeDau(filtered, range), [filtered, range]);
  const categories = useMemo(() => computeCategories(filtered), [filtered]);
  const dailyDigest = useMemo(
    () => (range !== '24h' && now ? computeDailyDigest(filtered, range, now) : []),
    [filtered, range, now]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stats</h1>
          <p className="text-sm text-fg-muted">
            ვინ შემოდის, საიდან, რა დრო რჩება გვერდებზე.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge count={live} />
          <RangeTabs value={range} onChange={setRange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="ვიზიტები" value={kpi.views.toLocaleString()} />
        <KpiCard label="უნიკ. ვიზიტორი" value={kpi.uniques.toLocaleString()} />
        <KpiCard label="საშ. DAU" value={dau.avgDau.toLocaleString()} hint="განს. ვიზ./დღეში" />
        <KpiCard label="საშ. დღ. ვიზიტები" value={dau.avgDailyViews.toLocaleString()} hint="გვ. ნახვა/დღეში" />
        <KpiCard label="საშ. დრო გვერდზე" value={formatDuration(kpi.avgDurationMs)} />
        <KpiCard label="Bounce" value={`${kpi.bouncePct}%`} hint="ერთ გვ. ვიზიტები" />
      </div>

      <Card title="ვიზიტების დინამიკა">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries} margin={{top: 8, right: 12, left: 0, bottom: 0}}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#viewsGradient)" name="ვიზიტები" />
              <Area type="monotone" dataKey="uniques" stroke="#1e3a5f" strokeWidth={2} fill="none" name="უნიკალური" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="ტოპ გვერდები">
          <TopPagesTable rows={topPages} />
        </Card>

        <Card title="ტრაფიკის წყარო">
          {sources.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sources} layout="vertical" margin={{top: 4, right: 16, left: 8, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{fontSize: 11, fill: '#334155'}} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} name="ვიზიტები" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="ქვეყნები">
          <DistList data={countries} />
        </Card>
        <Card title="მოწყობილობა">
          <PieBlock data={devices} />
        </Card>
        <Card title="ბრაუზერი">
          <PieBlock data={browsers} />
        </Card>
      </div>

      <Card title="კატეგორიები">
        <CategoryBar data={categories} />
      </Card>

      {dailyDigest.length > 0 && (
        <Card title="დღიური დინამიკა">
          <DailyDigestTable rows={dailyDigest} />
        </Card>
      )}
    </div>
  );
}

function KpiCard({label, value, hint}: {label: string; value: string; hint?: string}) {
  return (
    <div className="rounded-2xl border bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-fg-muted">{hint}</div> : null}
    </div>
  );
}

function Card({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="rounded-2xl border bg-surface p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function RangeTabs({value, onChange}: {value: Range; onChange: (v: Range) => void}) {
  const opts: {v: Range; label: string}[] = [
    {v: '24h', label: '24 სთ'},
    {v: '7d', label: '7 დღე'},
    {v: '30d', label: '30 დღე'}
  ];
  return (
    <div className="inline-flex rounded-lg border bg-surface p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-md px-3 py-1.5 font-medium transition ${
            value === o.v ? 'bg-navy text-white' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LiveBadge({count}: {count: number}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-medium">{count}</span>
      <span className="text-fg-muted">online</span>
    </div>
  );
}

function TopPagesTable({rows}: {rows: {path: string; views: number; uniques: number; avgDurationMs: number}[]}) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Path</th>
            <th className="px-3 py-2 text-right font-medium">Views</th>
            <th className="px-3 py-2 text-right font-medium">Uniq</th>
            <th className="px-3 py-2 text-right font-medium">Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t">
              <td className="max-w-[240px] truncate px-3 py-2 font-mono text-xs">{r.path}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.views.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.uniques.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-fg-muted">{formatDuration(r.avgDurationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DistList({data}: {data: {label: string; value: number}[]}) {
  if (data.length === 0) return <EmptyState />;
  const max = data[0]?.value || 1;
  return (
    <ul className="space-y-2 text-sm">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-center justify-between">
            <span className="truncate">{d.label}</span>
            <span className="tabular-nums text-fg-muted">{d.value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full bg-blue-500" style={{width: `${(d.value / max) * 100}%`}} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PieBlock({data}: {data: {label: string; value: number}[]}) {
  if (data.length === 0) return <EmptyState />;
  return (
    <div className="flex h-48 items-center gap-3">
      <div className="h-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={36} outerRadius={64} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1 text-xs">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{background: COLORS[i % COLORS.length]}} />
            <span className="truncate">{d.label}</span>
            <span className="ml-auto tabular-nums text-fg-muted">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTooltip({active, payload, label}: {active?: boolean; payload?: {name?: string; value?: number; color?: string}[]; label?: string | number}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-surface px-3 py-2 text-xs shadow-sm">
      {label ? <div className="font-medium">{label}</div> : null}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{background: p.color}} />
          <span className="text-fg-muted">{p.name}</span>
          <span className="ml-2 tabular-nums font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({label = 'მონაცემები ჯერ არ არის'}: {label?: string} = {}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span
        aria-hidden
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-bdr bg-sur-2 text-text-3"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9" />
          <path d="M3 12 12 3" />
        </svg>
      </span>
      <div className="text-[12px] font-semibold text-text-2">{label}</div>
      <div className="text-[11px] text-text-3">როცა traffic გაიზრდება, აქ გამოჩნდება ჩარტი</div>
    </div>
  );
}

function formatDuration(ms: number) {
  if (!ms || ms < 1000) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}წმ`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs ? `${m}წთ ${rs}წმ` : `${m}წთ`;
}

function computeKpi(rows: PageViewRow[]) {
  const views = rows.length;
  const uniques = new Set(rows.map((r) => r.visitor_id)).size;
  const durations = rows.map((r) => r.duration_ms).filter((d): d is number => typeof d === 'number' && d > 0);
  const avgDurationMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const byVisitor = new Map<string, number>();
  for (const r of rows) byVisitor.set(r.visitor_id, (byVisitor.get(r.visitor_id) ?? 0) + 1);
  const totalVisitors = byVisitor.size;
  const singlePage = Array.from(byVisitor.values()).filter((n) => n === 1).length;
  const bouncePct = totalVisitors ? Math.round((singlePage / totalVisitors) * 100) : 0;

  return {views, uniques, avgDurationMs, bouncePct};
}

function computeTimeseries(rows: PageViewRow[], range: Range, now: number) {
  if (!now) return [];
  const bucketMs = range === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const bucketCount = range === '24h' ? 24 : range === '7d' ? 7 : 30;
  const buckets = new Map<number, {views: number; uniqueSet: Set<string>}>();

  for (let i = bucketCount - 1; i >= 0; i--) {
    const t = now - i * bucketMs;
    buckets.set(Math.floor(t / bucketMs), {views: 0, uniqueSet: new Set()});
  }

  for (const r of rows) {
    const t = new Date(r.entered_at).getTime();
    const key = Math.floor(t / bucketMs);
    const b = buckets.get(key);
    if (b) {
      b.views++;
      b.uniqueSet.add(r.visitor_id);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([key, b]) => {
      const d = new Date(key * bucketMs);
      const label = range === '24h'
        ? `${d.getHours().toString().padStart(2, '0')}:00`
        : `${d.getMonth() + 1}/${d.getDate()}`;
      return {label, views: b.views, uniques: b.uniqueSet.size};
    });
}

function computeTopPages(rows: PageViewRow[]) {
  const map = new Map<string, {views: number; uniqueSet: Set<string>; durSum: number; durN: number}>();
  for (const r of rows) {
    const e = map.get(r.path) ?? {views: 0, uniqueSet: new Set(), durSum: 0, durN: 0};
    e.views++;
    e.uniqueSet.add(r.visitor_id);
    if (r.duration_ms && r.duration_ms > 0) {
      e.durSum += r.duration_ms;
      e.durN++;
    }
    map.set(r.path, e);
  }
  return Array.from(map.entries())
    .map(([path, e]) => ({
      path,
      views: e.views,
      uniques: e.uniqueSet.size,
      avgDurationMs: e.durN ? Math.round(e.durSum / e.durN) : 0
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

function computeSources(rows: PageViewRow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    let src = 'Direct';
    if (r.utm_source) src = `utm:${r.utm_source}`;
    else if (r.referrer_domain) src = r.referrer_domain;
    map.set(src, (map.get(src) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({label, value}))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function computeTop<K extends keyof PageViewRow>(rows: PageViewRow[], key: K, limit: number) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = (r[key] ?? 'Unknown') as string;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({label, value}))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function subscribeTime(callback: () => void) {
  const id = setInterval(callback, 30_000);
  return () => clearInterval(id);
}

function computeLive(rows: PageViewRow[], now: number) {
  if (!now) return 0;
  const cutoff = now - 5 * 60 * 1000;
  const seen = new Set<string>();
  for (const r of rows) {
    if (new Date(r.entered_at).getTime() >= cutoff) seen.add(r.visitor_id);
  }
  return seen.size;
}

function computeDau(rows: PageViewRow[], range: Range) {
  const days = range === '24h' ? 1 : range === '7d' ? 7 : 30;
  const byDay = new Map<string, Set<string>>();
  for (const r of rows) {
    const day = r.entered_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, new Set());
    byDay.get(day)!.add(r.visitor_id);
  }
  const dailyUniques = Array.from(byDay.values()).map((s) => s.size);
  const avgDau = dailyUniques.length
    ? Math.round(dailyUniques.reduce((a, b) => a + b, 0) / dailyUniques.length)
    : 0;
  const avgDailyViews = Math.round(rows.length / days);
  return {avgDau, avgDailyViews};
}

function categorize(path: string): string {
  if (path === '/') return 'მთავარი';
  const seg = path.split('/')[1] ?? '';
  if (seg === 'calculators') return 'კალკულატორები';
  if (seg === 'construction') return 'მშენებლობა';
  if (seg === 'tbc') return 'TBC';
  if (seg === 'regulations') return 'რეგულაციები';
  if (seg === 'dashboard') return 'Dashboard';
  if (['about', 'contact', 'faq', 'terms', 'privacy', 'feed'].includes(seg)) return 'ინფო';
  return 'სხვა';
}

function computeCategories(rows: PageViewRow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const cat = categorize(r.path);
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({label, value}))
    .sort((a, b) => b.value - a.value);
}

function computeDailyDigest(rows: PageViewRow[], range: Range, now: number) {
  const days = range === '7d' ? 7 : 30;
  const firstSeen = new Map<string, string>();
  for (const r of rows) {
    const day = r.entered_at.slice(0, 10);
    const cur = firstSeen.get(r.visitor_id);
    if (!cur || day < cur) firstSeen.set(r.visitor_id, day);
  }

  type DayBucket = {views: number; visitors: Set<string>; newV: Set<string>; durSum: number; durN: number};
  const byDay = new Map<string, DayBucket>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    byDay.set(d.toISOString().slice(0, 10), {views: 0, visitors: new Set(), newV: new Set(), durSum: 0, durN: 0});
  }

  for (const r of rows) {
    const day = r.entered_at.slice(0, 10);
    const b = byDay.get(day);
    if (!b) continue;
    b.views++;
    b.visitors.add(r.visitor_id);
    if (firstSeen.get(r.visitor_id) === day) b.newV.add(r.visitor_id);
    if (r.duration_ms && r.duration_ms > 0) {
      b.durSum += r.duration_ms;
      b.durN++;
    }
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, b]) => ({
      day,
      views: b.views,
      uniques: b.visitors.size,
      newVisitors: b.newV.size,
      avgDurationMs: b.durN ? Math.round(b.durSum / b.durN) : 0,
    }));
}

function CategoryBar({data}: {data: {label: string; value: number}[]}) {
  if (data.length === 0) return <EmptyState />;
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = data[0]?.value || 1;
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-xs font-medium">{d.label}</span>
          <div className="relative h-5 flex-1 overflow-hidden rounded bg-surface-alt">
            <div
              className="absolute inset-y-0 left-0 rounded"
              style={{width: `${(d.value / max) * 100}%`, background: COLORS[i % COLORS.length]}}
            />
          </div>
          <span className="w-10 shrink-0 text-right tabular-nums text-xs text-fg-muted">{d.value}</span>
          <span className="w-10 shrink-0 text-right tabular-nums text-xs text-fg-muted">
            {total ? `${Math.round((d.value / total) * 100)}%` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function DailyDigestTable({rows}: {rows: {day: string; views: number; uniques: number; newVisitors: number; avgDurationMs: number}[]}) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">თარიღი</th>
            <th className="px-3 py-2 text-right font-medium">ნახვები</th>
            <th className="px-3 py-2 text-right font-medium">უნიკ.</th>
            <th className="px-3 py-2 text-right font-medium">ახალი</th>
            <th className="px-3 py-2 text-right font-medium">საშ. დრო</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className="border-t hover:bg-surface-alt/50">
              <td className="px-3 py-2 font-mono text-xs">{r.day}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.views.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.uniques.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{r.newVisitors || '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums text-fg-muted">{formatDuration(r.avgDurationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
