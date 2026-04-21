'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Megaphone,
  Plus,
  Printer,
  Download,
  ExternalLink,
  MoreVertical,
  Archive,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Upload,
  MessageSquare,
  Bell,
  ClipboardList,
  Activity,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  XCircle
} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {ResizableTable} from '@/components/dmt/resizable-table';

type RecordStatus = 'new' | 'in-process' | 'finished' | 'tem-stopped' | 'canceled';
type TabKey = 'records' | 'analytics' | 'autotasks' | 'threats' | 'archive';

type Confirmation = {
  id: string;
  attendantName: string;
  status: 'pending' | 'confirmed' | 'rejected';
  dueDate: string;
  sentAt: string;
};

type ActionItem = {
  id: string;
  index: number;
  imageUrl: string;
  description: string;
  status: RecordStatus;
  createdAt: string;
  attendantName: string;
  commentsOpen: boolean;
  comments: {id: string; text: string; createdAt: string; authorName: string; imageUrl?: string}[];
};

type ServiceRecord = {
  id: string;
  code: number;
  title: string;
  description: string;
  status: RecordStatus;
  attendantName: string;
  attendantId: string;
  creatorName: string;
  updaterName: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  confirmations: Confirmation[];
  actions: ActionItem[];
  notifyUser: 'არჩევა' | string;
  notifyEmail: boolean;
  notifySms: boolean;
  dueDate: string;
};

const STATUS_META: Record<RecordStatus, {label: string; color: string; bg: string; border: string; icon: typeof AlertCircle}> = {
  'new':         {label: 'New',          color: '#b91c1c',    bg: '#fee2e2',     border: '#f0b8b4', icon: AlertCircle},
  'in-process':  {label: 'In-Process',   color: '#c2410c',    bg: '#ffedd5',     border: '#fed7aa', icon: Clock},
  'finished':    {label: 'Finished',     color: '#15803d',    bg: '#dcfce7',     border: '#86efac', icon: CheckCircle2},
  'tem-stopped': {label: 'Tem. Stopped', color: '#a16207',    bg: '#fef9c3',     border: '#fde68a', icon: PauseCircle},
  'canceled':    {label: 'გაუქმდა',      color: '#475569',    bg: '#e2e8f0',     border: '#cbd5e1', icon: XCircle}
};

const LEGEND: {status: RecordStatus; label: string; dot: string}[] = [
  {status: 'new', label: 'ახალი', dot: '#7f1d1d'},
  {status: 'in-process', label: 'in-process', dot: '#ea580c'},
  {status: 'canceled', label: 'გაუქმდა', dot: '#94a3b8'},
  {status: 'tem-stopped', label: 'Tem. Stopped', dot: '#eab308'},
  {status: 'finished', label: 'დასრულდა', dot: '#16a34a'}
];

const TABS: {key: TabKey; label: string; icon: typeof ClipboardList}[] = [
  {key: 'records',   label: 'მომსახურების ჩანაწერები', icon: ClipboardList},
  {key: 'analytics', label: 'სერვისის ჩანაწერების ანალიტიკა', icon: Activity},
  {key: 'autotasks', label: 'ავტოტასკები', icon: Clock},
  {key: 'threats',   label: 'საფრთხეები და საფრთხოებები', icon: ShieldAlert},
  {key: 'archive',   label: 'მომსახურების ჩანაწერების არქივი', icon: Archive}
];

const STORE_KEY = 'dmt_announcements_v1';

const SEED: ServiceRecord[] = [
  {
    id: 'A-535', code: 535, title: 'გეგმიური შემოვლა',
    description:
      'ობიექტზე განხორციელდა გეგმიური შემოვლა. ინსპექტირების შედეგად გამოვლენილია ხარვეზები და შესაბამოფები მოცემულია ქვემოთ, შესაძამისი ფოტოდასეტია და კომპტარების სახით. ამასთანავე, გთხოვთ, წარმოადგინო დანაფარების მოვლა-პატრონობის აქტები. აღნიშნული დოკუმენტაციის გარეშე შეუძლებელი ხდება აგრეგატების ტექნიკური მდგომარეობის სრულფასოვანი შეფასება და შემდგომი ექსპლუატაციის განსაზღვრა.',
    status: 'in-process',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'ვაშო კილაძე', updaterName: 'ვაშო კილაძე',
    createdAt: '2026-04-14 16:29:18', updatedAt: '2026-04-15 10:35:02',
    archived: false,
    dueDate: '30.04.2026',
    notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [
      {id: 'c1', attendantName: 'davit bailashvili', status: 'pending', dueDate: '30.04.2026', sentAt: '2026-04-14 16:30'}
    ],
    actions: [
      {
        id: 'act-1', index: 1,
        imageUrl: '',
        description:
          'დარბაზის აჰუსთან მოსაწყობია საფეხმავლო ბილიკი ან შესაბამისი ტიპის მყარი ბეპავიარი, რომელიც უზრუნველყოფს დანაფარის უსაფრთხო და შეუფერხებელ წვდომას, რათა დროულად და სრულფასოვნად განხორციელდეს მისი სერვისული მომსახურება. აღნიშნული ბილიკი უნდა იყოს სტაბილური, არამოცურებადი და სათანადო სიგანის, რაც ტექნიკური პერსონალის თავისუფალ გადადგილებას და სამუშაოების ეფექტურად შესრულებას შეუწყობს ხელს.',
        status: 'new',
        createdAt: '2026-04-14 16:29',
        attendantName: 'ვაშო კილაძე',
        commentsOpen: false,
        comments: []
      }
    ]
  },
  {
    id: 'A-505', code: 505, title: 'გადასაკეთები ფიცრის ჩანაცვლება',
    description: 'დამღუპული ფიცრის მოცულობითი ჩანაცვლება. სამუშაოს ხანგრძლივობა ≈ 2 დღე.',
    status: 'finished',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'davit bailashvili', updaterName: 'Ilia Gatenash...',
    createdAt: '2026-03-11 09:14:02', updatedAt: '2026-03-13 17:41:11',
    archived: false,
    dueDate: '25.03.2026',
    notifyUser: 'არჩევა', notifyEmail: true, notifySms: false,
    confirmations: [],
    actions: []
  },
  {
    id: 'A-504', code: 504, title: 'აგროპანი ს...',
    description: 'ობიექტზე გაჩერება, აგრო სექტორი.', status: 'in-process',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'ვაშო კილაძე', updaterName: 'ვაშო კილაძე',
    createdAt: '2026-03-10 14:20:55', updatedAt: '2026-03-17 11:02:09',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-503', code: 503, title: 'სანაპიროს ს...',
    description: 'შემოვიდა შენ... მოთხოვნა სანაპირო ზოლზე.', status: 'in-process',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'თემო მერება...', updaterName: 'თემო მერება...',
    createdAt: '2026-03-09 10:00:00', updatedAt: '2026-03-09 10:05:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-487', code: 487, title: 'ლიმიტერები...',
    description: 'სანაპიროს ლიმიტერების გადაანგარიშება.', status: 'finished',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'ვაშო კილაძე', updaterName: 'ვაშო კილაძე',
    createdAt: '2026-02-26 13:30:00', updatedAt: '2026-02-26 18:10:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-475', code: 475, title: 'აგრომობი ს...',
    description: 'გეგმიური შემოვლის მოთხოვნა.', status: 'in-process',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'ვაშო კილაძე', updaterName: 'ვაშო კილაძე',
    createdAt: '2026-02-17 09:00:00', updatedAt: '2026-02-17 09:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-474', code: 474, title: 'დარბაზის ფა...',
    description: 'დარ.ფანკ.N... დარბაზის ფანჯრის შეცვლა.', status: 'in-process',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'davit bailashvili', updaterName: 'თემო მერება...',
    createdAt: '2026-02-16 15:00:00', updatedAt: '2026-02-19 16:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-421', code: 421, title: 'სანაპირო აკ...',
    description: 'გთხოვთ გამო... სანაპირო აკუსტიკა.', status: 'finished',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: '—', updaterName: '—',
    createdAt: '2026-01-08 10:00:00', updatedAt: '2026-01-09 15:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-401', code: 401, title: 'სანაპირო გე...',
    description: 'გთხოვთ ელ... სანაპირო გეგმიური.', status: 'new',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'თემო მერება...', updaterName: 'თემო მერება...',
    createdAt: '2025-12-16 09:00:00', updatedAt: '2025-12-16 09:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-383', code: 383, title: 'ნისკვილის აპ',
    description: 'კოლექტორი... ნისკვილის აპარატი.', status: 'finished',
    attendantName: 'თემო მერება...', attendantId: 'x7Y8zLQpqES0SUWSyaFOTttufEIC9',
    creatorName: 'თემო მერება...', updaterName: 'თემო მერება...',
    createdAt: '2025-11-21 14:00:00', updatedAt: '2025-11-21 18:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-372', code: 372, title: 'სანაპირო გე...',
    description: '—', status: 'new',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'თემო მერება...', updaterName: 'თემო მერება...',
    createdAt: '2025-11-03 09:00:00', updatedAt: '2025-11-03 09:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-347', code: 347, title: 'სანაპირო გე...',
    description: 'შემოვლის დ... სანაპირო გეგმიური.', status: 'new',
    attendantName: 'davit bailashvili', attendantId: 'i2x5PLQmsES0SUWSyaFOTttufEIC3',
    creatorName: 'თემო მერება...', updaterName: 'თემო მერება...',
    createdAt: '2025-10-09 10:00:00', updatedAt: '2025-10-09 10:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  },
  {
    id: 'A-332', code: 332, title: 'დინების რელ',
    description: 'ჩილერზე და... დინების რელე.', status: 'finished',
    attendantName: 'თემო მერება...', attendantId: 'x7Y8zLQpqES0SUWSyaFOTttufEIC9',
    creatorName: 'თემო მერება...', updaterName: 'თემო მერება...',
    createdAt: '2025-08-29 11:00:00', updatedAt: '2025-08-29 18:00:00',
    archived: false, dueDate: '', notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
    confirmations: [], actions: []
  }
];

function shortDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AnnouncementsPage() {
  const [tab, setTab] = useState<TabKey>('records');
  const [rows, setRows] = useState<ServiceRecord[]>(SEED);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<ServiceRecord | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  const [filterCat, setFilterCat] = useState('ყველა');
  const [filterSub, setFilterSub] = useState('ყველა');
  const [filterCol, setFilterCol] = useState('Column');
  const [filterOp, setFilterOp] = useState('Contains');
  const [filterVal, setFilterVal] = useState('');

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

  useEffect(() => {
    if (!rowMenu) return;
    const close = () => setRowMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [rowMenu]);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    const inArchive = tab === 'archive';
    return rows.filter((r) => {
      if (inArchive !== r.archived) return false;
      if (t) {
        const hit = [String(r.code), r.title, r.description, r.attendantName, r.creatorName, r.updaterName, r.status]
          .some((v) => String(v).toLowerCase().includes(t));
        if (!hit) return false;
      }
      if (filterCol !== 'Column' && filterVal.trim()) {
        const fv = filterVal.trim().toLowerCase();
        const src = String((r as any)[filterCol] ?? '').toLowerCase();
        if (filterOp === 'Contains' && !src.includes(fv)) return false;
        if (filterOp === 'Equals' && src !== fv) return false;
        if (filterOp === 'StartsWith' && !src.startsWith(fv)) return false;
      }
      return true;
    });
  }, [rows, q, tab, filterCol, filterOp, filterVal]);

  const counts = useMemo(() => {
    const acc: Record<RecordStatus, number> = {
      'new': 0, 'in-process': 0, 'finished': 0, 'tem-stopped': 0, 'canceled': 0
    };
    for (const r of rows) if (!r.archived) acc[r.status]++;
    return acc;
  }, [rows]);

  const addNew = () => {
    const maxCode = rows.reduce((m, r) => Math.max(m, r.code), 0);
    const blank: ServiceRecord = {
      id: 'A-' + String(Date.now()).slice(-6),
      code: maxCode + 1,
      title: 'ახალი ჩანაწერი',
      description: '',
      status: 'new',
      attendantName: '', attendantId: '',
      creatorName: 'მე', updaterName: 'მე',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      dueDate: '',
      notifyUser: 'არჩევა', notifyEmail: false, notifySms: false,
      confirmations: [],
      actions: []
    };
    setRows((prev) => [blank, ...prev]);
    setActive(blank);
  };

  const update = (id: string, patch: Partial<ServiceRecord>) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const next = {...r, ...patch, updatedAt: new Date().toISOString()};
      return next;
    }));
    setActive((prev) => (prev && prev.id === id ? {...prev, ...patch} : prev));
  };

  const archiveRow = (id: string) => {
    update(id, {archived: true});
    if (active?.id === id) setActive(null);
  };

  const removeRow = (id: string) => {
    if (!confirm('ჩანაწერი წავშალო?')) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (active?.id === id) setActive(null);
  };

  const exportCsv = () => {
    const header = ['code', 'title', 'status', 'attendant', 'creator', 'updater', 'created', 'updated'].join(',');
    const lines = visible.map((r) =>
      [r.code, r.title, r.status, r.attendantName, r.creatorName, r.updaterName, r.createdAt, r.updatedAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8;'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'announcements.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DmtPageShell
      kicker="OPERATIONS · SERVICE RECORDS"
      title="განცხადებები"
      subtitle="მომსახურების ჩანაწერები, ავტოტასკები, საფრთხეები და არქივი — ერთიანი pipeline."
      searchPlaceholder="ძიება კოდი / სათაური / აღწერა / პასუხისმგებელი…"
      onQueryChange={setQ}
      actions={
        <>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue">
            <Printer size={14} /> ბეჭდვა
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue">
            <Download size={14} /> CSV
          </button>
          <button onClick={addNew} className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2">
            <Plus size={14} /> ახალი ჩანაწერი
          </button>
        </>
      }
    >
      <div className="px-6 py-5 md:px-8">
        {/* Tab row */}
        <div className="mb-4 flex flex-wrap items-center gap-0 border-b border-bdr">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                  active
                    ? 'border-blue text-blue'
                    : 'border-transparent text-text-2 hover:text-navy'
                }`}
              >
                <Icon size={13} strokeWidth={1.8} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'records' && (
          <RecordsView
            rows={visible}
            counts={counts}
            active={active}
            setActive={setActive}
            update={update}
            removeRow={removeRow}
            archiveRow={archiveRow}
            rowMenu={rowMenu}
            setRowMenu={setRowMenu}
            filterCat={filterCat}
            filterSub={filterSub}
            filterCol={filterCol}
            filterOp={filterOp}
            filterVal={filterVal}
            setFilterCat={setFilterCat}
            setFilterSub={setFilterSub}
            setFilterCol={setFilterCol}
            setFilterOp={setFilterOp}
            setFilterVal={setFilterVal}
          />
        )}

        {tab === 'analytics' && <AnalyticsView rows={rows} />}
        {tab === 'autotasks' && <AutotasksView />}
        {tab === 'threats' && <ThreatsView />}
        {tab === 'archive' && (
          <RecordsView
            rows={visible}
            counts={counts}
            active={active}
            setActive={setActive}
            update={update}
            removeRow={removeRow}
            archiveRow={(id) => update(id, {archived: false})}
            archiveLabel="ამოღება არქივიდან"
            rowMenu={rowMenu}
            setRowMenu={setRowMenu}
            filterCat={filterCat}
            filterSub={filterSub}
            filterCol={filterCol}
            filterOp={filterOp}
            filterVal={filterVal}
            setFilterCat={setFilterCat}
            setFilterSub={setFilterSub}
            setFilterCol={setFilterCol}
            setFilterOp={setFilterOp}
            setFilterVal={setFilterVal}
          />
        )}
      </div>
    </DmtPageShell>
  );
}

function RecordsView(props: {
  rows: ServiceRecord[];
  counts: Record<RecordStatus, number>;
  active: ServiceRecord | null;
  setActive: (r: ServiceRecord | null) => void;
  update: (id: string, patch: Partial<ServiceRecord>) => void;
  removeRow: (id: string) => void;
  archiveRow: (id: string) => void;
  archiveLabel?: string;
  rowMenu: string | null;
  setRowMenu: (id: string | null) => void;
  filterCat: string; filterSub: string; filterCol: string; filterOp: string; filterVal: string;
  setFilterCat: (v: string) => void; setFilterSub: (v: string) => void;
  setFilterCol: (v: string) => void; setFilterOp: (v: string) => void; setFilterVal: (v: string) => void;
}) {
  const {rows, counts, active, setActive, update, removeRow, archiveRow, archiveLabel = 'Archive', rowMenu, setRowMenu} = props;
  return (
    <>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11.5px]">
        {LEGEND.map((l) => (
          <div key={l.status} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{background: l.dot}} />
            <span className="text-text-2">{l.label}</span>
            <span className="font-mono text-[10px] text-text-3">({counts[l.status] ?? 0})</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-bdr bg-sur p-3">
        <Select value={props.filterCat} onChange={props.setFilterCat} options={['ყველა', 'MEP', 'Civil', 'Facade']} />
        <Select value={props.filterSub} onChange={props.setFilterSub} options={['ყველა', 'ხელშეკრულება', 'გეგმ. შემოვლა', 'ავარია']} />
        <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">Filter</span>
        <Select value={props.filterCol} onChange={props.setFilterCol} options={['Column', 'title', 'description', 'attendantName', 'creatorName', 'status']} />
        <Select value={props.filterOp} onChange={props.setFilterOp} options={['Contains', 'Equals', 'StartsWith']} label="Operator" />
        <input
          value={props.filterVal}
          onChange={(e) => props.setFilterVal(e.target.value)}
          placeholder="Value"
          className="h-8 rounded-md border border-bdr bg-sur-2 px-2 text-[12px] focus:border-blue focus:outline-none"
        />
      </div>

      {/* Table + detail */}
      <div className={`grid gap-4 ${active ? 'md:grid-cols-[1fr_420px]' : 'md:grid-cols-1'}`}>
        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <ResizableTable storageKey="dmt-announcements" className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                  <th className="w-1.5 px-0 py-2.5"></th>
                  <th className="w-8 px-2 py-2.5"></th>
                  <th className="px-3 py-2.5">სა...</th>
                  <th className="px-3 py-2.5">აღწერა</th>
                  <th className="px-3 py-2.5">სათაური</th>
                  <th className="px-3 py-2.5">სტატუსი</th>
                  <th className="px-3 py-2.5">attendant</th>
                  <th className="px-3 py-2.5">შემქმნი</th>
                  <th className="px-3 py-2.5">განახლ.</th>
                  <th className="px-3 py-2.5">შექმნის თარიღი</th>
                  <th className="px-3 py-2.5">განახლების თარიღი</th>
                  <th className="w-8 px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS_META[r.status];
                  const StIcon = st.icon;
                  const isActive = active?.id === r.id;
                  const color =
                    r.status === 'new' ? '#7f1d1d' :
                    r.status === 'in-process' ? '#ea580c' :
                    r.status === 'finished' ? '#16a34a' :
                    r.status === 'tem-stopped' ? '#eab308' :
                    '#94a3b8';
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setActive(r)}
                      className={`cursor-pointer border-b border-bdr last:border-b-0 hover:bg-sur-2 ${isActive ? 'bg-blue-lt/50' : ''}`}
                    >
                      <td className="p-0" style={{background: color, width: 6}}></td>
                      <td className="px-2 py-2.5 text-text-3">
                        <button
                          onClick={(e) => {e.stopPropagation(); setActive(r);}}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-bdr text-blue hover:border-blue"
                          title="გახსნა"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-navy">{r.code}</td>
                      <td className="px-3 py-2.5 text-text-2 max-w-[180px]">
                        <div className="truncate" title={r.description}>{r.description || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 text-text max-w-[180px]">
                        <div className="truncate" title={r.title}>{r.title}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                          style={{color: st.color, background: st.bg, borderColor: st.border}}
                        >
                          <StIcon size={10} strokeWidth={2} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-2">{r.attendantName || '—'}</td>
                      <td className="px-3 py-2.5 text-text-2">{r.creatorName || '—'}</td>
                      <td className="px-3 py-2.5 text-text-2">{r.updaterName || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">{shortDate(r.createdAt)}</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">{shortDate(r.updatedAt)}</td>
                      <td className="relative px-2 py-2.5 text-text-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowMenu(rowMenu === r.id ? null : r.id);
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-sur-2 hover:text-navy"
                          title="მეტი"
                        >
                          <MoreVertical size={13} />
                        </button>
                        {rowMenu === r.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-2 top-8 z-20 min-w-[160px] rounded-md border border-bdr bg-sur shadow-lg"
                          >
                            <button
                              onClick={() => {archiveRow(r.id); setRowMenu(null);}}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-text-2 hover:bg-sur-2"
                            >
                              <Archive size={12} /> {archiveLabel}
                            </button>
                            <button
                              onClick={() => {alert('აუდიტის ლოგები — მალე'); setRowMenu(null);}}
                              className="flex w-full items-center gap-2 border-t border-bdr px-3 py-2 text-left text-[12px] text-text-2 hover:bg-sur-2"
                            >
                              <ScrollText size={12} /> აუდიტის ლოგები
                            </button>
                            <button
                              onClick={() => {removeRow(r.id); setRowMenu(null);}}
                              className="flex w-full items-center gap-2 border-t border-bdr px-3 py-2 text-left text-[12px] text-red hover:bg-red-lt"
                            >
                              <Trash2 size={12} /> წაშლა
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-text-3">
                      ჩანაწერი ვერ მოიძებნა
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResizableTable>
        </div>

        {active && (
          <aside className="sticky top-0 self-start max-h-[calc(100vh-140px)] overflow-y-auto rounded-[10px] border border-bdr bg-sur p-4">
            <DetailPanel
              record={active}
              onUpdate={(patch) => update(active.id, patch)}
              onClose={() => setActive(null)}
            />
          </aside>
        )}
      </div>
    </>
  );
}

function DetailPanel({
  record,
  onUpdate,
  onClose
}: {
  record: ServiceRecord;
  onUpdate: (patch: Partial<ServiceRecord>) => void;
  onClose: () => void;
}) {
  const [secRec, setSecRec] = useState(true);
  const [secConf, setSecConf] = useState(true);
  const [secNotif, setSecNotif] = useState(true);
  const [secTask, setSecTask] = useState(false);
  const [secAct, setSecAct] = useState(true);

  const addAction = () => {
    const nextIndex = (record.actions.at(-1)?.index ?? 0) + 1;
    const a: ActionItem = {
      id: 'act-' + Date.now(),
      index: nextIndex,
      imageUrl: '',
      description: '',
      status: 'new',
      createdAt: new Date().toISOString(),
      attendantName: record.attendantName || 'მე',
      commentsOpen: false,
      comments: []
    };
    onUpdate({actions: [...record.actions, a]});
  };

  const updateAction = (id: string, patch: Partial<ActionItem>) => {
    onUpdate({actions: record.actions.map((a) => (a.id === id ? {...a, ...patch} : a))});
  };

  const removeAction = (id: string) => {
    if (!confirm('მოქმედება წავშალო?')) return;
    onUpdate({actions: record.actions.filter((a) => a.id !== id)});
  };

  const addComment = (actionId: string, text: string) => {
    if (!text.trim()) return;
    const c = {id: 'c-' + Date.now(), text, createdAt: new Date().toISOString(), authorName: record.attendantName || 'მე'};
    onUpdate({
      actions: record.actions.map((a) => (a.id === actionId ? {...a, comments: [...a.comments, c]} : a))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
            ID {record.code} · {shortDate(record.createdAt)}
          </div>
          <div className="mt-0.5 text-[14px] font-bold text-navy truncate">{record.title}</div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-text-3 hover:bg-sur-2 hover:text-navy" title="დახურვა">
          <XCircle size={16} />
        </button>
      </div>

      {/* ჩანაწერი */}
      <Section title="ჩანაწერი" open={secRec} onToggle={() => setSecRec((v) => !v)}>
        <Field label="სათაური">
          <input
            value={record.title}
            onChange={(e) => onUpdate({title: e.target.value})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 text-[12px] focus:border-blue focus:outline-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <ReadonlyField label="საიდენტიფიკაციო კოდი" value={String(record.code)} />
          <ReadonlyField label="სტატუსი">
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
              style={{
                color: STATUS_META[record.status].color,
                background: STATUS_META[record.status].bg,
                borderColor: STATUS_META[record.status].border
              }}
            >
              {STATUS_META[record.status].label}
            </span>
          </ReadonlyField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ReadonlyField label="შექმნის თარიღი" value={shortDate(record.createdAt)} />
          <ReadonlyField label="განახლების თარიღი" value={shortDate(record.updatedAt)} />
        </div>
        <ReadonlyField label="პასუხისმგებელი პირი" value={record.attendantName || '—'} />
        <ReadonlyField label="პასუხისმგებლის ID" value={record.attendantId || '—'} />
        <Field label="აღწერა">
          <textarea
            value={record.description}
            onChange={(e) => onUpdate({description: e.target.value})}
            rows={6}
            className="w-full resize-none rounded-md border border-bdr bg-sur-2 px-2.5 py-1.5 text-[12px] leading-relaxed focus:border-blue focus:outline-none"
          />
        </Field>
        <div className="flex justify-end">
          <button
            onClick={() => onUpdate({updatedAt: new Date().toISOString()})}
            className="rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            შენახვა
          </button>
        </div>
      </Section>

      {/* დადასტურებები */}
      <Section title="დადასტურებები" open={secConf} onToggle={() => setSecConf((v) => !v)}>
        <div className="space-y-2">
          <ReadonlyField label="დამსწრე" value={record.attendantName || '—'} />
          <ReadonlyField label="სტატუსი" value={record.confirmations[0]?.status === 'confirmed' ? 'დადასტურდა' : record.confirmations[0]?.status === 'rejected' ? 'უარყოფილი' : 'მუშავდება'} />
          <Field label="დროული ვადა">
            <input
              value={record.dueDate}
              onChange={(e) => onUpdate({dueDate: e.target.value})}
              placeholder="DD.MM.YYYY"
              className="w-full rounded-md border border-bdr bg-sur-2 px-2.5 py-1 font-mono text-[11.5px] focus:border-blue focus:outline-none"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onUpdate({confirmations: []})}
              disabled={record.confirmations.length === 0}
              className="rounded-md border border-red bg-red px-3 py-1.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-red/90"
            >
              დადასტურების წაშლა
            </button>
            <button
              onClick={() =>
                onUpdate({
                  confirmations: [{
                    id: 'c' + Date.now(),
                    attendantName: record.attendantName,
                    status: 'pending',
                    dueDate: record.dueDate,
                    sentAt: new Date().toISOString()
                  }]
                })
              }
              className="rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
            >
              დადასტურების ხელახლა გაგზავნა
            </button>
            <button
              onClick={() => onUpdate({updatedAt: new Date().toISOString()})}
              className="rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-3 hover:border-blue hover:text-blue"
            >
              შენახვა
            </button>
          </div>
        </div>
      </Section>

      {/* შეტყობინება */}
      <Section title="შეტყობინება" open={secNotif} onToggle={() => setSecNotif((v) => !v)}>
        <Field label="არჩიეთ მომხმარებელი">
          <Select
            value={record.notifyUser}
            onChange={(v) => onUpdate({notifyUser: v})}
            options={['არჩევა', 'davit bailashvili', 'ვაშო კილაძე', 'თემო მერება']}
          />
        </Field>
        <div className="flex items-center gap-4 pt-1 text-[12px]">
          <label className="flex items-center gap-1.5 text-text-2">
            <input type="checkbox" checked={record.notifyEmail} onChange={(e) => onUpdate({notifyEmail: e.target.checked})} />
            ელ-ფოსტა
          </label>
          <label className="flex items-center gap-1.5 text-text-2">
            <input type="checkbox" checked={record.notifySms} onChange={(e) => onUpdate({notifySms: e.target.checked})} />
            სმს
          </label>
          <button
            onClick={() => alert('გაგზავნა — დაფიქსირდა (stub)')}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Bell size={12} /> გაგზავნა
          </button>
        </div>
      </Section>

      {/* დავალება */}
      <Section title="დავალება" open={secTask} onToggle={() => setSecTask((v) => !v)}>
        <div className="rounded-md border border-bdr bg-sur-2 p-3 text-[11.5px] text-text-3">
          დავალების მოდული — მალე. დაუკავშირდი დავალებას ლიდს ან ინსპექტირებას.
        </div>
      </Section>

      {/* მოქმედება */}
      <Section
        title={`მოქმედება${record.actions.length ? ` (${record.actions.length})` : ''}`}
        open={secAct}
        onToggle={() => setSecAct((v) => !v)}
        right={
          <button
            onClick={addAction}
            className="inline-flex items-center gap-1 rounded-md border border-blue bg-blue px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={11} /> ახალი
          </button>
        }
      >
        {record.actions.length === 0 && (
          <div className="rounded-md border border-dashed border-bdr p-4 text-center text-[11.5px] text-text-3">
            მოქმედება არ დამატებულა
          </div>
        )}
        <div className="space-y-3">
          {record.actions.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              onUpdate={(patch) => updateAction(a.id, patch)}
              onRemove={() => removeAction(a.id)}
              onAddComment={(text) => addComment(a.id, text)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

function ActionCard({
  action,
  onUpdate,
  onRemove,
  onAddComment
}: {
  action: ActionItem;
  onUpdate: (patch: Partial<ActionItem>) => void;
  onRemove: () => void;
  onAddComment: (text: string) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const st = STATUS_META[action.status];

  return (
    <div className="rounded-[10px] border border-bdr bg-sur-2 p-3">
      <div className="mb-2 flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div className="font-mono text-[10px] font-bold text-text-3">#{action.index}</div>
          <div
            className="mt-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-bdr bg-white"
            style={action.imageUrl ? {backgroundImage: `url(${action.imageUrl})`, backgroundSize: 'cover'} : undefined}
          >
            {!action.imageUrl && (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-text-3 hover:text-blue">
                <Upload size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => onUpdate({imageUrl: String(r.result || '')});
                    r.readAsDataURL(f);
                  }}
                />
              </label>
            )}
          </div>
        </div>
        <textarea
          value={action.description}
          onChange={(e) => onUpdate({description: e.target.value})}
          placeholder="მოქმედების აღწერა…"
          rows={3}
          className="flex-1 resize-none rounded-md border border-bdr bg-white px-2.5 py-1.5 text-[11.5px] leading-relaxed focus:border-blue focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <select
          value={action.status}
          onChange={(e) => onUpdate({status: e.target.value as RecordStatus})}
          className="rounded-md border px-2 py-1 text-[11px] font-semibold focus:outline-none"
          style={{color: st.color, background: st.bg, borderColor: st.border}}
        >
          {(Object.keys(STATUS_META) as RecordStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <span className="font-mono text-[10px] text-text-3">{shortDate(action.createdAt)}</span>
        <span className="text-text-3">|</span>
        <span className="text-text-2">{action.attendantName}</span>
        <button
          onClick={onRemove}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-red bg-red px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red/90"
        >
          <Trash2 size={11} /> ამოღებ. შედეგ
        </button>
      </div>

      <div className="mt-3 border-t border-bdr pt-2">
        <button
          onClick={() => onUpdate({commentsOpen: !action.commentsOpen})}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-text-2 hover:text-navy"
        >
          {action.commentsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          კომენტარები ({action.comments.length})
        </button>
        {action.commentsOpen && (
          <div className="mt-2 space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-blue/40 bg-blue-lt/30 p-2">
              <label className="flex h-[88px] w-[88px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-slate-300 text-white hover:bg-slate-400">
                <Upload size={16} />
                <span className="font-mono text-[9px]">120×120</span>
                <span className="text-[9px]">Upload Image</span>
                <input type="file" accept="image/*" className="hidden" />
              </label>
              <div className="flex-1 space-y-1.5">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="კომენტარის დამატება"
                  rows={3}
                  className="w-full resize-none rounded-md border border-red/40 bg-white px-2.5 py-1.5 text-[11.5px] focus:border-blue focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {setCommentText(''); onUpdate({commentsOpen: false});}}
                    className="rounded-md border border-bdr bg-sur px-2.5 py-1 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
                  >
                    cancel
                  </button>
                  <button
                    onClick={() => {onAddComment(commentText); setCommentText('');}}
                    disabled={!commentText.trim()}
                    className="rounded-md border border-blue bg-blue px-2.5 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-navy-2"
                  >
                    კომენტარი
                  </button>
                </div>
              </div>
            </div>
            {action.comments.length === 0 ? (
              <div className="py-1 text-[11px] text-text-3">No Comments</div>
            ) : (
              <ul className="space-y-1.5">
                {action.comments.map((c) => (
                  <li key={c.id} className="rounded-md border border-bdr bg-white p-2 text-[11.5px] text-text">
                    <div className="mb-0.5 flex items-center gap-2 font-mono text-[10px] text-text-3">
                      <MessageSquare size={10} /> {c.authorName} · {shortDate(c.createdAt)}
                    </div>
                    {c.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsView({rows}: {rows: ServiceRecord[]}) {
  const byStatus = useMemo(() => {
    const acc: Record<RecordStatus, number> = {
      'new': 0, 'in-process': 0, 'finished': 0, 'tem-stopped': 0, 'canceled': 0
    };
    for (const r of rows) if (!r.archived) acc[r.status]++;
    return acc;
  }, [rows]);
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[10px] border border-bdr bg-sur p-4">
        <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">სტატუსის მიხედვით</div>
        <div className="space-y-2">
          {(Object.keys(STATUS_META) as RecordStatus[]).map((s) => {
            const n = byStatus[s];
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            const meta = STATUS_META[s];
            return (
              <div key={s} className="text-[11.5px]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-text-2">{meta.label}</span>
                  <span className="font-mono text-text-3">{n} · {pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sur-2">
                  <div className="h-full rounded-full" style={{width: pct + '%', background: meta.color}} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[10px] border border-bdr bg-sur p-4">
        <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">სულ აქტიური</div>
        <div className="font-mono text-[36px] font-bold text-navy">{total}</div>
        <div className="mt-2 text-[12px] text-text-2">
          არქივში <span className="font-semibold text-navy">{rows.filter((r) => r.archived).length}</span> · მთლიანი ისტორია: {rows.length}
        </div>
        <div className="mt-4 rounded-md border border-dashed border-bdr p-3 text-[11.5px] text-text-3">
          დამატებითი ანალიტიკა (trend, heatmap, SLA) — მალე.
        </div>
      </div>
    </div>
  );
}

function AutotasksView() {
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-6">
      <div className="mb-2 flex items-center gap-2 text-navy">
        <Clock size={18} />
        <div className="font-semibold text-[14px]">ავტოტასკები</div>
      </div>
      <p className="text-[12px] text-text-2">
        რეკურენტული ჩანაწერების შაბლონი (გეგმ. შემოვლა ყოველ კვარტალში, სერვისი ყოველ 6 თვეში და ა.შ.). კონფიგურაცია — მალე.
      </p>
    </div>
  );
}

function ThreatsView() {
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-6">
      <div className="mb-2 flex items-center gap-2 text-red">
        <ShieldAlert size={18} />
        <div className="font-semibold text-[14px]">საფრთხეები და საფრთხოებები</div>
      </div>
      <p className="text-[12px] text-text-2">
        მოიხსნება ჩანაწერებიდან, რომელთა სტატუსი ღიაა 30+ დღე ან დროული ვადა ამოწურულია. მალე.
      </p>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  right,
  children
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur-2">
      <div className="flex items-center justify-between gap-2 border-b border-bdr bg-sur px-3 py-2">
        <button onClick={onToggle} className="flex flex-1 items-center gap-1.5 text-left text-[12.5px] font-semibold text-navy">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {title}
        </button>
        {right}
      </div>
      {open && <div className="space-y-2 p-3">{children}</div>}
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadonlyField({label, value, children}: {label: string; value?: string; children?: React.ReactNode}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </label>
      <div className="rounded-md border border-bdr bg-white px-2.5 py-1 text-[12px] text-text-2">
        {children ?? value ?? '—'}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  label
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-bdr bg-sur-2">
      {label && <span className="border-r border-bdr px-2 font-mono text-[10px] font-bold uppercase text-text-3">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full bg-transparent pr-2 pl-2 text-[12px] text-text-2 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
