'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  MapPin,
  User,
  Calendar,
  Ruler,
  Building2,
  Thermometer,
  Camera,
  FileText,
  ChevronRight,
  ArrowRight,
  Plus,
  Trash2
} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';

type InspectionStatus = 'scheduled' | 'onsite' | 'report' | 'done' | 'canceled';
type InspectionType = 'heat-loss' | 'ventilation' | 'fire-safety' | 'full' | 'acoustic';

type Inspection = {
  id: string;
  leadId: string;
  leadCompany: string;
  addressCity: string;
  addressDetail: string;
  objectType: string;
  m2: number;
  stories: number;
  type: InspectionType;
  scheduledFor: string;
  inspector: string;
  status: InspectionStatus;
  findings: string;
  photoCount: number;
  estimate: number | null;
  invoiceId: string | null;
  createdAt: string;
};

const SEED: Inspection[] = [
  {
    id: 'INS-0047',
    leadId: 'L-1042',
    leadCompany: 'შპს აზიზი',
    addressCity: 'თბილისი',
    addressDetail: 'ვაჟა-ფშაველას 76, VI სართ.',
    objectType: 'ოფისი',
    m2: 184,
    stories: 1,
    type: 'ventilation',
    scheduledFor: '2026-04-22 11:00',
    inspector: 'გიორგი',
    status: 'scheduled',
    findings: '',
    photoCount: 0,
    estimate: null,
    invoiceId: null,
    createdAt: '2026-04-20'
  },
  {
    id: 'INS-0046',
    leadId: 'L-1041',
    leadCompany: 'ი/მ კიკნაძე',
    addressCity: 'თბილისი',
    addressDetail: 'ალ. ყაზბეგის 18, ვილა',
    objectType: 'საცხ. სახლი',
    m2: 320,
    stories: 2,
    type: 'heat-loss',
    scheduledFor: '2026-04-21 15:00',
    inspector: 'ლანა',
    status: 'onsite',
    findings: 'კედლები 200მმ Ytong, კრემონა ფანჯრები 3-ქიმი, სახურავი გაუუტამების გარეშე. VRF ცივი ცდით.',
    photoCount: 12,
    estimate: 14200,
    invoiceId: null,
    createdAt: '2026-04-19'
  },
  {
    id: 'INS-0045',
    leadId: 'L-1037',
    leadCompany: 'Caucasus Roads',
    addressCity: 'ქუთაისი',
    addressDetail: 'გ. ტაბიძის 3, საოფისე შენობა',
    objectType: 'კომერციული',
    m2: 2400,
    stories: 4,
    type: 'full',
    scheduledFor: '2026-04-18 10:00',
    inspector: 'გიორგი',
    status: 'report',
    findings: 'ცენტრალური სადარბაზოს დაწნეხვა არ აქვს, ლიფტის შახტი without pressurization, პარკინგ CO system outdated (2014). 4 სართ.-ზე heat-loss calc needed.',
    photoCount: 47,
    estimate: 48000,
    invoiceId: null,
    createdAt: '2026-04-14'
  },
  {
    id: 'INS-0044',
    leadId: 'L-1040',
    leadCompany: 'Sazeo International',
    addressCity: 'ბათუმი',
    addressDetail: 'ხიმშიაშვილის 4, თბოცენტრი',
    objectType: 'ინდუსტრიული',
    m2: 1800,
    stories: 1,
    type: 'heat-loss',
    scheduledFor: '2026-04-15 09:00',
    inspector: 'ლანა',
    status: 'done',
    findings: 'ჭერი 4.5მ, sandwich panels 100მმ, ოთხი air curtain-ის საჭიროება. თბოდანაკარგი EN 12831-ით — 186 kW.',
    photoCount: 28,
    estimate: 22000,
    invoiceId: 'INV-2026-0142',
    createdAt: '2026-04-12'
  },
  {
    id: 'INS-0043',
    leadId: 'L-1038',
    leadCompany: 'HVAC Pro Georgia',
    addressCity: 'თბილისი',
    addressDetail: 'დადიანის 7, warehouse',
    objectType: 'საწყობი',
    m2: 900,
    stories: 1,
    type: 'ventilation',
    scheduledFor: '2026-04-13 14:00',
    inspector: 'გიორგი',
    status: 'done',
    findings: 'ADB-ს ქვეშ არ არის. Sandwich wall 80მმ. Extract fan-ის საჭიროება — 12000 m³/h.',
    photoCount: 18,
    estimate: 6400,
    invoiceId: 'INV-2026-0146',
    createdAt: '2026-04-10'
  },
  {
    id: 'INS-0042',
    leadId: 'L-1031',
    leadCompany: 'Tegeta Motors',
    addressCity: 'თბილისი',
    addressDetail: 'ჯიქიას 1, ავტოსერვისი',
    objectType: 'კომერციული',
    m2: 540,
    stories: 2,
    type: 'fire-safety',
    scheduledFor: '2026-04-05 11:00',
    inspector: 'გიორგი',
    status: 'done',
    findings: 'ორი ევაკუაციის გასასვლელი, სადარბაზო 24მ, EN 12101-6 compliance — stair pressurization აუცილებელია.',
    photoCount: 22,
    estimate: 15800,
    invoiceId: 'INV-2026-0140',
    createdAt: '2026-04-03'
  }
];

const STATUS_META: Record<InspectionStatus, {label: string; color: string; bg: string; border: string}> = {
  scheduled: {label: 'დაგეგმ.',     color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  onsite:    {label: 'ადგილზე',     color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  report:    {label: 'რეპორტი',     color: 'var(--ora)',    bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  done:      {label: 'დასრულ.',    color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  canceled:  {label: 'გაუქმ.',     color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'}
};

const TYPE_META: Record<InspectionType, {label: string; color: string; bg: string}> = {
  'heat-loss':   {label: 'თბოდანაკ.',  color: 'var(--red)',    bg: 'var(--red-lt)'},
  'ventilation': {label: 'ვენტილ.',    color: 'var(--blue)',   bg: 'var(--blue-lt)'},
  'fire-safety': {label: 'სახანძრო',   color: 'var(--ora)',    bg: 'var(--ora-lt)'},
  'full':        {label: 'სრული',      color: '#7c3aed',       bg: '#ede9fe'},
  'acoustic':    {label: 'აკუსტიკა',   color: '#0d9488',       bg: '#ccfbf1'}
};

const STORE_KEY = 'dmt_inspections_v1';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

export default function InspectionsPage() {
  const [rows, setRows] = useState<Inspection[]>(SEED);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<Inspection | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setRows(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(rows));
    } catch {}
  }, [rows, hydrated]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.id, r.leadId, r.leadCompany, r.addressCity, r.addressDetail, r.inspector, r.status, r.type]
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const byStatus = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {} as Record<InspectionStatus, number>);
    const pipeline = rows
      .filter((r) => r.estimate != null && r.status !== 'canceled' && !r.invoiceId)
      .reduce((s, r) => s + (r.estimate ?? 0), 0);
    const converted = rows.filter((r) => r.invoiceId).length;
    return {byStatus, pipeline, converted};
  }, [rows]);

  const update = (id: string, patch: Partial<Inspection>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? {...r, ...patch} : r)));
    setActive((prev) => (prev && prev.id === id ? {...prev, ...patch} : prev));
  };

  const addNew = () => {
    const id = 'INS-' + String(Date.now()).slice(-4);
    const blank: Inspection = {
      id,
      leadId: '',
      leadCompany: '',
      addressCity: '',
      addressDetail: '',
      objectType: '',
      m2: 0,
      stories: 1,
      type: 'heat-loss',
      scheduledFor: new Date().toISOString().slice(0, 10) + ' 10:00',
      inspector: '',
      status: 'scheduled',
      findings: '',
      photoCount: 0,
      estimate: null,
      invoiceId: null,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setRows((prev) => [blank, ...prev]);
    setActive(blank);
  };

  const remove = (id: string) => {
    if (!confirm('ინსპექტირება წავშალო?')) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (active?.id === id) setActive(null);
  };

  return (
    <DmtPageShell
      kicker="PIPELINE · STEP 2"
      title="ობიექტის ინსპექტირება"
      subtitle="ლიდი → მოლაპარაკება → ინსპექტირება → ინვოისი. ხუთი ტიპი: თბოდანაკ., ვენტ., სახანძრო, აკუსტიკა, სრული."
      searchPlaceholder="ძიება ID / კომპანია / ქალაქი / ინსპექტორი…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        {/* Pipeline flow */}
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[10px] border border-bdr bg-sur p-3 text-[11.5px]">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">flow</span>
          <Link href="/dmt/leads" className="rounded-md bg-sur-2 px-2 py-1 font-semibold text-text-2 hover:bg-blue-lt hover:text-blue">
            1 · ლიდი
          </Link>
          <ChevronRight size={12} className="text-text-3" />
          <Link href="/dmt/leads?stage=negotiating" className="rounded-md bg-sur-2 px-2 py-1 font-semibold text-text-2 hover:bg-blue-lt hover:text-blue">
            მოლაპარაკება
          </Link>
          <ChevronRight size={12} className="text-text-3" />
          <span className="rounded-md bg-blue-lt px-2 py-1 font-semibold text-blue">2 · ინსპექტირება</span>
          <ChevronRight size={12} className="text-text-3" />
          <Link href="/dmt/invoices" className="rounded-md bg-sur-2 px-2 py-1 font-semibold text-text-2 hover:bg-blue-lt hover:text-blue">
            3 · ინვოისი
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <StatCard label="სულ" value={String(rows.length)} />
          <StatCard label="დაგეგმილი" value={String((stats.byStatus.scheduled ?? 0) + (stats.byStatus.onsite ?? 0))} accent="blue" />
          <StatCard label="რეპორტში" value={String(stats.byStatus.report ?? 0)} accent="ora" />
          <StatCard label="დასრულებული" value={String(stats.byStatus.done ?? 0)} accent="grn" />
          <StatCard label="Pipeline $" value={`₾ ${fmt(stats.pipeline)}`} />
        </div>

        <div className="mb-3 flex items-center justify-end">
          <button
            onClick={addNew}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={13} /> ახალი ინსპექტირება
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_360px]">
          {/* Table */}
          <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5">ობიექტი</th>
                    <th className="px-3 py-2.5">ტიპი</th>
                    <th className="px-3 py-2.5 text-right">მ²</th>
                    <th className="px-3 py-2.5">თარიღი</th>
                    <th className="px-3 py-2.5">ინსპ.</th>
                    <th className="px-3 py-2.5">სტატუსი</th>
                    <th className="px-3 py-2.5 text-right">შეფას.</th>
                    <th className="px-3 py-2.5">ინვ.</th>
                    <th className="px-3 py-2.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const st = STATUS_META[r.status];
                    const tp = TYPE_META[r.type];
                    const isActive = active?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setActive(r)}
                        className={`cursor-pointer border-b border-bdr last:border-b-0 hover:bg-sur-2 ${
                          isActive ? 'bg-blue-lt/50' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono text-[10.5px] font-semibold text-navy">{r.id}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-text">{r.leadCompany}</div>
                          <div className="flex items-center gap-1 font-mono text-[10px] text-text-3">
                            <MapPin size={9} /> {r.addressCity} · {r.addressDetail}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{color: tp.color, background: tp.bg}}
                          >
                            {tp.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-navy">{fmt(r.m2)}</td>
                        <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">{r.scheduledFor}</td>
                        <td className="px-3 py-2.5 text-text-2">{r.inspector || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{color: st.color, background: st.bg, borderColor: st.border}}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] font-semibold text-navy">
                          {r.estimate != null ? `₾ ${fmt(r.estimate)}` : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.invoiceId ? (
                            <Link
                              href="/dmt/invoices"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 rounded-full bg-grn-lt px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-grn hover:bg-grn hover:text-white"
                            >
                              {r.invoiceId}
                            </Link>
                          ) : (
                            <span className="font-mono text-[10px] text-text-3">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-text-3">
                          <ChevronRight size={12} />
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-text-3">
                        ინსპექტირება ვერ მოიძებნა
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          <aside className="rounded-[10px] border border-bdr bg-sur p-4">
            {active ? (
              <InspectionDetail
                inspection={active}
                onUpdate={(patch) => update(active.id, patch)}
                onRemove={() => remove(active.id)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <ClipboardCheck size={32} className="mb-2 text-text-3" strokeWidth={1.5} />
                <div className="text-[12.5px] text-text-3">
                  დააჭირე ინსპექტირებას → ცხრილიდან ან <b>+</b> ახალი
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-4 rounded-[10px] border border-bdr bg-sur-2 p-3 text-[11.5px] leading-relaxed text-text-2">
          📋 <b>Flow:</b> ლიდი pipeline-ში → მოლაპარაკების პროცესი → ინსპექტირება (site visit, findings, photos, estimate) → ინვოისი. ინსპექტირება ყოველთვის მიბმულია ლიდზე (`leadId`). როცა "done" სტატუსი + estimate მზად → "generate invoice" ღილაკი INVოისს შექმნის (ჯერ stub; დავამატოთ /api/dmt/inspections მერე).
        </div>
      </div>
    </DmtPageShell>
  );
}

function InspectionDetail({
  inspection,
  onUpdate,
  onRemove
}: {
  inspection: Inspection;
  onUpdate: (patch: Partial<Inspection>) => void;
  onRemove: () => void;
}) {
  const tp = TYPE_META[inspection.type];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
            {inspection.id} · {inspection.createdAt}
          </div>
          <div className="mt-0.5 text-[14px] font-bold text-navy">{inspection.leadCompany || '— ობიექტი არ არის არჩეული —'}</div>
        </div>
        <button
          onClick={onRemove}
          className="rounded p-1 text-text-3 hover:bg-red-lt hover:text-red"
          title="წაშლა"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <Field icon={Building2} label="ობიექტის ტიპი">
        <input
          value={inspection.objectType}
          onChange={(e) => onUpdate({objectType: e.target.value})}
          placeholder="e.g. ოფისი / საცხ. სახლი / კომერციული"
          className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 text-[12px] focus:border-blue focus:outline-none"
        />
      </Field>

      <Field icon={MapPin} label="მისამართი">
        <div className="flex gap-2">
          <input
            value={inspection.addressCity}
            onChange={(e) => onUpdate({addressCity: e.target.value})}
            placeholder="ქალაქი"
            className="w-24 rounded-md border border-bdr bg-sur-2 px-2.5 py-1 text-[12px] focus:border-blue focus:outline-none"
          />
          <input
            value={inspection.addressDetail}
            onChange={(e) => onUpdate({addressDetail: e.target.value})}
            placeholder="ქუჩა, ნომერი, ორიენტ."
            className="flex-1 rounded-md border border-bdr bg-sur-2 px-2.5 py-1 text-[12px] focus:border-blue focus:outline-none"
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field icon={Ruler} label="ფართობი (მ²)">
          <input
            type="number"
            value={inspection.m2 || ''}
            onChange={(e) => onUpdate({m2: Number(e.target.value) || 0})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 font-mono text-[12px] focus:border-blue focus:outline-none"
          />
        </Field>
        <Field icon={Building2} label="სართულები">
          <input
            type="number"
            value={inspection.stories || ''}
            onChange={(e) => onUpdate({stories: Number(e.target.value) || 1})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 font-mono text-[12px] focus:border-blue focus:outline-none"
          />
        </Field>
      </div>

      <Field icon={Thermometer} label="ინსპექტირების ტიპი">
        <select
          value={inspection.type}
          onChange={(e) => onUpdate({type: e.target.value as InspectionType})}
          className="w-full rounded-md border px-2.5 py-1 text-[12px] font-semibold focus:outline-none"
          style={{color: tp.color, background: tp.bg, borderColor: tp.color}}
        >
          {(Object.keys(TYPE_META) as InspectionType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t].label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field icon={Calendar} label="დაგეგმ. თარიღი">
          <input
            value={inspection.scheduledFor}
            onChange={(e) => onUpdate({scheduledFor: e.target.value})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 font-mono text-[11.5px] focus:border-blue focus:outline-none"
          />
        </Field>
        <Field icon={User} label="ინსპექტორი">
          <input
            value={inspection.inspector}
            onChange={(e) => onUpdate({inspector: e.target.value})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 text-[12px] focus:border-blue focus:outline-none"
          />
        </Field>
      </div>

      <Field icon={FileText} label="სტატუსი">
        <select
          value={inspection.status}
          onChange={(e) => onUpdate({status: e.target.value as InspectionStatus})}
          className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 text-[12px] font-semibold focus:border-blue focus:outline-none"
        >
          {(Object.keys(STATUS_META) as InspectionStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </Field>

      <Field icon={ClipboardCheck} label="Findings · ველზე ნაპოვნი">
        <textarea
          value={inspection.findings}
          onChange={(e) => onUpdate({findings: e.target.value})}
          placeholder="კედლის მასალა, ფანჯრები, სახურავი, არსებული სისტემა, განსაკუთრებული ფაქტორები…"
          rows={5}
          className="w-full resize-none rounded-md border border-bdr bg-sur-2 px-2.5 py-1.5 text-[12px] leading-relaxed focus:border-blue focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field icon={Camera} label="ფოტოები">
          <input
            type="number"
            value={inspection.photoCount || ''}
            onChange={(e) => onUpdate({photoCount: Number(e.target.value) || 0})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 font-mono text-[12px] focus:border-blue focus:outline-none"
          />
        </Field>
        <Field icon={FileText} label="შეფასება (₾)">
          <input
            type="number"
            value={inspection.estimate ?? ''}
            onChange={(e) => onUpdate({estimate: e.target.value === '' ? null : Number(e.target.value)})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 font-mono text-[12px] text-navy focus:border-blue focus:outline-none"
          />
        </Field>
      </div>

      <div className="border-t border-bdr pt-3 text-[11px] text-text-3">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          Lead კავშირი
        </div>
        <input
          value={inspection.leadId}
          onChange={(e) => onUpdate({leadId: e.target.value})}
          placeholder="L-1042"
          className="mt-1 w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 font-mono text-[11.5px] focus:border-blue focus:outline-none"
        />
        <input
          value={inspection.leadCompany}
          onChange={(e) => onUpdate({leadCompany: e.target.value})}
          placeholder="კომპანია"
          className="mt-1 w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 text-[12px] focus:border-blue focus:outline-none"
        />
      </div>

      {inspection.status === 'done' && inspection.estimate && !inspection.invoiceId && (
        <button
          onClick={() => {
            const invId = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4);
            onUpdate({invoiceId: invId});
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-grn bg-grn px-3 py-2 text-[12px] font-semibold text-white hover:bg-navy-2"
        >
          3 · ინვოისის გენერაცია <ArrowRight size={13} />
        </button>
      )}

      {inspection.invoiceId && (
        <Link
          href="/dmt/invoices"
          className="flex items-center justify-between rounded-md border border-grn-bd bg-grn-lt px-3 py-2 text-[12px] font-semibold text-grn hover:bg-grn hover:text-white"
        >
          <span>ინვოისი {inspection.invoiceId}</span>
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children
}: {
  icon: React.ComponentType<{size?: number; className?: string; strokeWidth?: number}>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        <Icon size={11} strokeWidth={1.8} />
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'blue' | 'grn' | 'ora'}) {
  const color =
    accent === 'blue' ? 'var(--blue)' :
    accent === 'grn' ? 'var(--grn)' :
    accent === 'ora' ? 'var(--ora)' :
    'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>
        {value}
      </div>
    </div>
  );
}
