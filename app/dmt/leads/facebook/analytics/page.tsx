'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  ArrowLeft,
  Facebook,
  TrendingUp,
  Users,
  Clock,
  Target,
  PhoneCall,
  Mail,
  CheckCircle2,
  XCircle,
  CalendarClock,
  AlertCircle,
  RefreshCw,
  Database
} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';

type Analytics = {
  total: number;
  totalContactable: number;
  conversionRate: number;
  last24h: number;
  last7d: number;
  last30d: number;
  byStatus: Array<{name: string; value: number}>;
  byDay: Array<{day: string; leads: number}>;
  byHour: Array<{hour: string; leads: number}>;
  byWeekday: Array<{weekday: string; leads: number}>;
  byCampaign: Array<{name: string; value: number}>;
  byForm: Array<{name: string; value: number}>;
  byAd: Array<{name: string; value: number}>;
  byPage: Array<{name: string; value: number}>;
  fieldFrequency: Array<{name: string; value: number}>;
  funnel: Array<{name: string; value: number}>;
  recent: Array<{
    id?: string;
    leadgen_id?: string;
    created_time?: string;
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    lead_status?: string;
    form_name?: string | null;
    campaign_id?: string | null;
  }>;
  ready: boolean;
  error?: string;
};

const PALETTE = ['#1565C0', '#7c3aed', '#059669', '#ea580c', '#dc2626', '#0d9488', '#db2777', '#a16207'];

const STATUS_COLOR: Record<string, string> = {
  new: '#64748b',
  called: '#1565C0',
  scheduled: '#7c3aed',
  converted: '#059669',
  lost: '#dc2626'
};
const STATUS_LABEL: Record<string, string> = {
  new: 'ახალი',
  called: 'დარეკვა',
  scheduled: 'შეხვედრა',
  converted: 'კონვერტ.',
  lost: 'დაკარგვა'
};

export default function FacebookAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch('/api/dmt/fb-leads/analytics', {cache: 'no-store'});
      const json = (await res.json()) as Analytics;
      setData(json);
    } catch (err) {
      setData({
        ...EMPTY,
        error: err instanceof Error ? err.message : 'network'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isEmpty = data?.ready === false && !data?.error;

  const dayData = useMemo(
    () =>
      (data?.byDay ?? []).map((d) => ({
        day: d.day.slice(5), // MM-DD
        leads: d.leads
      })),
    [data]
  );

  return (
    <DmtPageShell
      kicker="FACEBOOK LEAD ADS · ANALYTICS"
      title="FB ლიდების ანალიტიკა"
      subtitle="რეალური მონაცემები ცხრილიდან dmt_fb_leads — Meta Webhook-ით ავტომატურად ივსება"
      hideSearch
      actions={
        <>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'იტვირთება…' : 'განახლება'}
          </button>
          <Link
            href="/dmt/leads/facebook"
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Facebook size={14} /> ცხრილი
          </Link>
        </>
      }
    >
      <div className="px-6 py-5 md:px-8">
        <Link
          href="/dmt/leads/facebook"
          className="mb-4 inline-flex items-center gap-1 text-[12px] text-text-3 hover:text-blue"
        >
          <ArrowLeft size={12} /> Facebook ლიდებზე დაბრუნება
        </Link>

        {loading && (
          <div className="rounded-md border border-bdr bg-sur p-6 text-center text-[12px] text-text-3">
            ანალიტიკის ჩატვირთვა…
          </div>
        )}

        {data?.error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <b>შეცდომა:</b> {data.error}
            </div>
          </div>
        )}

        {isEmpty && !loading && <EmptyState />}

        {!loading && data && data.ready && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid gap-3 md:grid-cols-5">
              <Kpi
                icon={Users}
                label="სულ ლიდები"
                value={String(data.total)}
                sub={`${data.totalContactable} კონტაქტი`}
              />
              <Kpi
                icon={Clock}
                label="24 საათში"
                value={String(data.last24h)}
                sub={data.last24h > 0 ? 'ახალი შემოსული' : 'ცარიელი'}
                accent={data.last24h > 0 ? 'blue' : 'muted'}
              />
              <Kpi
                icon={CalendarClock}
                label="7 დღეში"
                value={String(data.last7d)}
              />
              <Kpi
                icon={CalendarClock}
                label="30 დღეში"
                value={String(data.last30d)}
              />
              <Kpi
                icon={Target}
                label="კონვერსია"
                value={`${data.conversionRate}%`}
                accent={data.conversionRate >= 10 ? 'grn' : data.conversionRate > 0 ? 'blue' : 'muted'}
              />
            </div>

            {/* Time series — 30 days */}
            <ChartCard
              title="ლიდების ნაკადი · ბოლო 30 დღე"
              hint="ყოველდღიური შემოსული ლიდების რაოდენობა"
            >
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dayData} margin={{top: 10, right: 10, bottom: 20, left: 0}}>
                  <defs>
                    <linearGradient id="fbArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1565C0" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#1565C0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" vertical={false} />
                  <XAxis dataKey="day" tick={{fontSize: 10, fill: 'var(--text-3)'}} interval={3} />
                  <YAxis tick={{fontSize: 10, fill: 'var(--text-3)'}} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="leads" stroke="#1565C0" strokeWidth={2} fill="url(#fbArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Status split + Funnel */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="სტატუსების განაწილება"
                hint="მიმდინარე pipeline — ყველა ლიდი"
              >
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data.byStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {data.byStatus.map((e, i) => {
                        const key = Object.keys(STATUS_LABEL).find((k) => STATUS_LABEL[k] === e.name);
                        return (
                          <Cell
                            key={e.name}
                            fill={key ? STATUS_COLOR[key] : PALETTE[i % PALETTE.length]}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      wrapperStyle={{fontSize: 11}}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Funnel — ლიდიდან კონვერსიამდე"
                hint="ყოველი ეტაპის ლიდების რაოდენობა"
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={data.funnel}
                    layout="vertical"
                    margin={{top: 8, right: 24, bottom: 8, left: 60}}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" horizontal={false} />
                    <XAxis type="number" tick={{fontSize: 10, fill: 'var(--text-3)'}} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{fontSize: 11, fill: 'var(--text-2)'}}
                      width={80}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {data.funnel.map((e, i) => {
                        const key = Object.keys(STATUS_LABEL).find((k) => STATUS_LABEL[k] === e.name);
                        return (
                          <Cell
                            key={e.name}
                            fill={key ? STATUS_COLOR[key] : PALETTE[i % PALETTE.length]}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Hour of day + Weekday */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="საათობრივი განაწილება"
                hint="რომელ საათებში იგზავნება მეტი ფორმა"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.byHour} margin={{top: 8, right: 8, bottom: 8, left: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" vertical={false} />
                    <XAxis dataKey="hour" tick={{fontSize: 9, fill: 'var(--text-3)'}} interval={2} />
                    <YAxis tick={{fontSize: 10, fill: 'var(--text-3)'}} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="leads" fill="#1565C0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="კვირის დღეები"
                hint="კვირის დღე vs ლიდების ნაკადი"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.byWeekday} margin={{top: 8, right: 8, bottom: 8, left: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" vertical={false} />
                    <XAxis dataKey="weekday" tick={{fontSize: 11, fill: 'var(--text-3)'}} />
                    <YAxis tick={{fontSize: 10, fill: 'var(--text-3)'}} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="leads" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Campaigns + Forms */}
            <div className="grid gap-4 lg:grid-cols-2">
              <RankCard
                title="TOP კამპანიები"
                icon={TrendingUp}
                items={data.byCampaign}
                empty="კამპანიის ID ჯერ არ მოდის — Graph API token საჭიროა"
              />
              <RankCard
                title="TOP ფორმები"
                icon={Facebook}
                items={data.byForm}
                empty="ფორმის სახელი ჯერ არ მოდის"
              />
            </div>

            {/* Ads + Fields */}
            <div className="grid gap-4 lg:grid-cols-2">
              <RankCard
                title="TOP რეკლამები"
                icon={TrendingUp}
                items={data.byAd}
                empty="რეკლამის ID ჯერ არ მოდის"
              />
              <RankCard
                title="ფორმის ველების გამოყენება"
                icon={Database}
                items={data.fieldFrequency}
                empty="ჯერ არცერთი ფორმის ველი არ ჩაიწერა"
                suffix="×"
              />
            </div>

            {/* Recent leads */}
            <section className="rounded-[10px] border border-bdr bg-sur">
              <header className="border-b border-bdr px-4 py-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  RECENT ACTIVITY
                </div>
                <h2 className="mt-0.5 text-[14px] font-bold text-navy">
                  ბოლო 12 ლიდი
                </h2>
              </header>
              {data.recent.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-text-3">
                  ცხრილში ლიდი ჯერ არ არის
                </div>
              ) : (
                <div className="divide-y divide-bdr">
                  {data.recent.map((r) => (
                    <div
                      key={r.id ?? r.leadgen_id}
                      className="flex items-center gap-3 px-4 py-2.5 text-[12px] hover:bg-sur-2"
                    >
                      <span
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: r.lead_status
                            ? `${STATUS_COLOR[r.lead_status]}18`
                            : 'var(--sur-2)',
                          color: r.lead_status ? STATUS_COLOR[r.lead_status] : 'var(--text-3)'
                        }}
                      >
                        {r.lead_status === 'converted' ? (
                          <CheckCircle2 size={12} />
                        ) : r.lead_status === 'lost' ? (
                          <XCircle size={12} />
                        ) : (
                          <Facebook size={11} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <b className="truncate text-navy">
                            {r.full_name || '(სახელი არ არის)'}
                          </b>
                          {r.lead_status && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9.5px] font-semibold"
                              style={{
                                background: `${STATUS_COLOR[r.lead_status]}18`,
                                color: STATUS_COLOR[r.lead_status]
                              }}
                            >
                              {STATUS_LABEL[r.lead_status] ?? r.lead_status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-text-3">
                          {r.phone && (
                            <span className="inline-flex items-center gap-1">
                              <PhoneCall size={10} /> {r.phone}
                            </span>
                          )}
                          {r.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail size={10} /> {r.email}
                            </span>
                          )}
                          {r.form_name && <span>· {r.form_name}</span>}
                          {r.campaign_id && <span>· camp {r.campaign_id}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-[10px] text-text-3">
                        {r.created_time
                          ? new Date(r.created_time).toLocaleString('en-GB')
                          : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Data-source note */}
            <section className="rounded-[10px] border border-blue-bd bg-blue-lt/50 p-4 text-[11.5px] leading-relaxed text-text-2">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-blue">
                <Database size={11} /> მონაცემების წყარო
              </div>
              ყველა ციფრი ცოცხლად იკითხება ცხრილიდან{' '}
              <code className="rounded bg-sur px-1 font-mono">public.dmt_fb_leads</code>. Meta Webhook ყოველი ახალი ლიდით ჩასვამს row-ს. Campaign / Ad / Form სახელები საჭიროებს{' '}
              <code className="rounded bg-sur px-1 font-mono">FB_PAGE_ACCESS_TOKEN</code>-ს Graph API enrichment-ისთვის. ქვემოთ — რა ველებს ვიღებთ სრულად:{' '}
              <Link href="/dmt/leads/facebook/setup" className="text-blue underline">
                Webhook Setup
              </Link>
              .
            </section>
          </div>
        )}
      </div>
    </DmtPageShell>
  );
}

const EMPTY: Analytics = {
  total: 0,
  totalContactable: 0,
  conversionRate: 0,
  last24h: 0,
  last7d: 0,
  last30d: 0,
  byStatus: [],
  byDay: [],
  byHour: [],
  byWeekday: [],
  byCampaign: [],
  byForm: [],
  byAd: [],
  byPage: [],
  fieldFrequency: [],
  funnel: [],
  recent: [],
  ready: false
};

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid var(--bdr)',
  background: 'var(--sur)',
  color: 'var(--text)'
} as const;

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent
}: {
  icon: React.ComponentType<{size?: number; strokeWidth?: number}>;
  label: string;
  value: string;
  sub?: string;
  accent?: 'grn' | 'blue' | 'muted';
}) {
  const color =
    accent === 'grn' ? 'var(--grn)' : accent === 'muted' ? 'var(--text-3)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {label}
        </div>
        <Icon size={13} strokeWidth={1.6} />
      </div>
      <div className="mt-1.5 font-mono text-[22px] font-bold leading-none" style={{color}}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[10.5px] text-text-3">{sub}</div>}
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-bdr bg-sur">
      <header className="border-b border-bdr px-4 py-2.5">
        <h3 className="text-[13px] font-bold text-navy">{title}</h3>
        {hint && <p className="mt-0.5 text-[10.5px] text-text-3">{hint}</p>}
      </header>
      <div className="p-2">{children}</div>
    </section>
  );
}

function RankCard({
  title,
  icon: Icon,
  items,
  empty,
  suffix
}: {
  title: string;
  icon: React.ComponentType<{size?: number; strokeWidth?: number}>;
  items: Array<{name: string; value: number}>;
  empty: string;
  suffix?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="rounded-[10px] border border-bdr bg-sur">
      <header className="flex items-center gap-2 border-b border-bdr px-4 py-2.5">
        <Icon size={13} strokeWidth={1.6} />
        <h3 className="text-[13px] font-bold text-navy">{title}</h3>
      </header>
      {items.length === 0 ? (
        <div className="p-4 text-[11.5px] text-text-3">{empty}</div>
      ) : (
        <ul className="divide-y divide-bdr">
          {items.map((it) => {
            const pct = (it.value / max) * 100;
            return (
              <li key={it.name} className="relative px-4 py-2 text-[12px]">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-blue-lt/50"
                  style={{width: `${pct}%`}}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] text-text">{it.name}</span>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-navy">
                    {it.value}
                    {suffix ?? ''}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[10px] border border-dashed border-bdr bg-sur p-10 text-center">
      <Facebook size={40} className="mx-auto mb-3 text-text-3" strokeWidth={1.2} />
      <h3 className="text-[15px] font-bold text-navy">ცხრილი ცარიელია</h3>
      <p className="mx-auto mt-2 max-w-md text-[12px] text-text-3">
        Meta Lead Ads webhook ჯერ არ გადმოაგზავნა ლიდი. დარწმუნდი რომ:
      </p>
      <ul className="mx-auto mt-3 max-w-sm space-y-1 text-left text-[11.5px] text-text-2">
        <li>
          • <code className="rounded bg-sur-2 px-1 font-mono">FB_APP_SECRET</code> +{' '}
          <code className="rounded bg-sur-2 px-1 font-mono">FB_VERIFY_TOKEN</code> Vercel env-ზეა
        </li>
        <li>• Meta Dashboard → Webhooks → Page → Subscribe `leadgen`</li>
        <li>• Page-ს App-ზე წვდომა აქვს (business.facebook.com)</li>
        <li>• ტესტი: Meta → Webhooks → Page → Test your server</li>
      </ul>
      <Link
        href="/dmt/leads/facebook/setup"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
      >
        Setup გვერდზე გადასვლა
      </Link>
    </div>
  );
}
