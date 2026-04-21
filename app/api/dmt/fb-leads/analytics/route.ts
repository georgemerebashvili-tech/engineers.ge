import {NextResponse} from 'next/server';
import {getCurrentDmtUser} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LeadRow = {
  id: string;
  leadgen_id: string;
  page_id: string;
  ad_id: string | null;
  adset_id: string | null;
  campaign_id: string | null;
  form_id: string | null;
  form_name: string | null;
  created_time: string;
  field_data: Array<{name?: string; values?: string[]}> | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  lead_status: 'new' | 'called' | 'scheduled' | 'converted' | 'lost';
  assigned_to: string | null;
  received_at: string;
};

const EMPTY_ANALYTICS = {
  total: 0,
  totalContactable: 0,
  conversionRate: 0,
  last24h: 0,
  last7d: 0,
  last30d: 0,
  byStatus: [] as Array<{name: string; value: number}>,
  byDay: [] as Array<{day: string; leads: number}>,
  byHour: [] as Array<{hour: string; leads: number}>,
  byWeekday: [] as Array<{weekday: string; leads: number}>,
  byCampaign: [] as Array<{name: string; value: number}>,
  byForm: [] as Array<{name: string; value: number}>,
  byAd: [] as Array<{name: string; value: number}>,
  byPage: [] as Array<{name: string; value: number}>,
  fieldFrequency: [] as Array<{name: string; value: number}>,
  funnel: [] as Array<{name: string; value: number}>,
  recent: [] as Array<Partial<LeadRow>>,
  ready: false
};

function topN<T extends {value: number}>(items: T[], n = 8): T[] {
  return [...items].sort((a, b) => b.value - a.value).slice(0, n);
}

function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

const WEEKDAY_LABELS = ['კვი', 'ორშ', 'სამშ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let rows: LeadRow[] = [];
  try {
    const {data, error} = await supabaseAdmin()
      .from('dmt_fb_leads')
      .select(
        'id, leadgen_id, page_id, ad_id, adset_id, campaign_id, form_id, form_name, created_time, field_data, full_name, phone, email, lead_status, assigned_to, received_at'
      )
      .order('created_time', {ascending: false})
      .limit(5000);
    if (error) {
      return NextResponse.json({...EMPTY_ANALYTICS, error: error.message});
    }
    rows = (data ?? []) as LeadRow[];
  } catch (err) {
    return NextResponse.json({
      ...EMPTY_ANALYTICS,
      error: err instanceof Error ? err.message : 'fetch_failed'
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(EMPTY_ANALYTICS);
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  let last24h = 0;
  let last7d = 0;
  let last30d = 0;

  const statusMap = new Map<string, number>();
  const dayMap = new Map<string, number>();
  const hourMap = new Map<number, number>();
  const weekdayMap = new Map<number, number>();
  const campaignMap = new Map<string, number>();
  const formMap = new Map<string, number>();
  const adMap = new Map<string, number>();
  const pageMap = new Map<string, number>();
  const fieldMap = new Map<string, number>();

  // Seed last 30 days so empty days still show.
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    dayMap.set(fmtDay(d), 0);
  }
  for (let h = 0; h < 24; h++) hourMap.set(h, 0);
  for (let w = 0; w < 7; w++) weekdayMap.set(w, 0);

  const cutoff30 = now - 30 * DAY;

  for (const r of rows) {
    const t = new Date(r.created_time).getTime();
    if (Number.isFinite(t)) {
      if (now - t < DAY) last24h++;
      if (now - t < 7 * DAY) last7d++;
      if (now - t < 30 * DAY) {
        last30d++;
        const dayKey = fmtDay(new Date(t));
        dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
      }
      if (now - t < 30 * DAY || t >= cutoff30) {
        const d = new Date(t);
        hourMap.set(d.getHours(), (hourMap.get(d.getHours()) ?? 0) + 1);
        weekdayMap.set(d.getDay(), (weekdayMap.get(d.getDay()) ?? 0) + 1);
      }
    }

    statusMap.set(r.lead_status, (statusMap.get(r.lead_status) ?? 0) + 1);

    const cLabel = r.campaign_id || '—';
    campaignMap.set(cLabel, (campaignMap.get(cLabel) ?? 0) + 1);

    const fLabel = r.form_name || r.form_id || '—';
    formMap.set(fLabel, (formMap.get(fLabel) ?? 0) + 1);

    const aLabel = r.ad_id || '—';
    adMap.set(aLabel, (adMap.get(aLabel) ?? 0) + 1);

    pageMap.set(r.page_id, (pageMap.get(r.page_id) ?? 0) + 1);

    for (const f of r.field_data ?? []) {
      if (f.name && f.values?.length) {
        fieldMap.set(f.name, (fieldMap.get(f.name) ?? 0) + 1);
      }
    }
  }

  const toArr = (m: Map<string, number>) =>
    Array.from(m.entries()).map(([name, value]) => ({name, value}));

  const total = rows.length;
  const totalContactable = rows.filter((r) => r.phone || r.email).length;
  const converted = statusMap.get('converted') ?? 0;
  const conversionRate = total ? (converted / total) * 100 : 0;

  const funnel = [
    {name: 'ახალი', value: statusMap.get('new') ?? 0},
    {name: 'დარეკვა', value: statusMap.get('called') ?? 0},
    {name: 'შეხვედრა', value: statusMap.get('scheduled') ?? 0},
    {name: 'კონვერტ.', value: statusMap.get('converted') ?? 0},
    {name: 'დაკარგვა', value: statusMap.get('lost') ?? 0}
  ];

  const byDay = Array.from(dayMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, leads]) => ({day, leads}));

  const byHour = Array.from({length: 24}, (_, h) => ({
    hour: fmtHour(h),
    leads: hourMap.get(h) ?? 0
  }));

  const byWeekday = Array.from({length: 7}, (_, w) => ({
    weekday: WEEKDAY_LABELS[w],
    leads: weekdayMap.get(w) ?? 0
  }));

  const statusOrder = ['new', 'called', 'scheduled', 'converted', 'lost'] as const;
  const statusLabels: Record<(typeof statusOrder)[number], string> = {
    new: 'ახალი',
    called: 'დარეკვა',
    scheduled: 'შეხვედრა',
    converted: 'კონვერტ.',
    lost: 'დაკარგვა'
  };
  const byStatus = statusOrder.map((s) => ({
    name: statusLabels[s],
    value: statusMap.get(s) ?? 0
  }));

  return NextResponse.json({
    total,
    totalContactable,
    conversionRate: Number(conversionRate.toFixed(1)),
    last24h,
    last7d,
    last30d,
    byStatus,
    byDay,
    byHour,
    byWeekday,
    byCampaign: topN(toArr(campaignMap)),
    byForm: topN(toArr(formMap)),
    byAd: topN(toArr(adMap)),
    byPage: topN(toArr(pageMap)),
    fieldFrequency: topN(toArr(fieldMap), 12),
    funnel,
    recent: rows.slice(0, 12).map((r) => ({
      id: r.id,
      leadgen_id: r.leadgen_id,
      created_time: r.created_time,
      full_name: r.full_name,
      phone: r.phone,
      email: r.email,
      lead_status: r.lead_status,
      form_name: r.form_name,
      campaign_id: r.campaign_id
    })),
    ready: true
  });
}
