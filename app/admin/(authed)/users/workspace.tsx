'use client';

import {useMemo, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  UserPlus,
  Coins,
  Trash2,
  RotateCcw,
  Trash,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  Languages,
  Briefcase,
  Tag as TagIcon,
  CheckCircle2,
  Clock,
  Share2,
  Database,
  ShieldCheck,
  ShieldOff
} from 'lucide-react';
import type {Country, UserWithCountry, UserSource, ReferrerSummary} from '@/lib/users';

const LANGS: Record<string, {label: string; flag: string}> = {
  ka: {label: 'ქართული', flag: '🇬🇪'},
  en: {label: 'English', flag: '🇬🇧'},
  ru: {label: 'Русский', flag: '🇷🇺'},
  tr: {label: 'Türkçe', flag: '🇹🇷'},
  az: {label: 'Azərbaycanca', flag: '🇦🇿'},
  hy: {label: 'Հայերեն', flag: '🇦🇲'}
};

const INTEREST_OPTIONS = [
  'hvac',
  'ventilation',
  'electrical',
  'low-voltage',
  'fire-safety',
  'plumbing',
  'bim',
  'cad',
  'energy',
  'heat-load'
];

const SOURCE_LABELS: Record<UserSource, string> = {
  self: 'თვითრეგისტრაცია',
  referred: 'მოწვეული'
};

type Props = {
  users: UserWithCountry[];
  trashedUsers: UserWithCountry[];
  countries: Country[];
  topReferrers: ReferrerSummary[];
  regByDay: {date: string; self: number; referred: number}[];
  selectedCountry: number | null;
  selectedLang: string | null;
  selectedSource: UserSource | null;
  selectedInterest: string | null;
  query: string;
  initialView: 'active' | 'trash';
  error: string | null;
};

export function UsersWorkspace(props: Props) {
  const [view, setView] = useState<'active' | 'trash'>(props.initialView);

  if (props.error) {
    return <EmptyState error={props.error} />;
  }

  return (
    <div className="space-y-5">
      <KpiRow users={props.users} topReferrers={props.topReferrers} trashedCount={props.trashedUsers.length} />
      <ChartsRow regByDay={props.regByDay} topReferrers={props.topReferrers} />

      <div className="flex items-center gap-1 border-b border-bdr">
        <TabButton active={view === 'active'} onClick={() => setView('active')}>
          <Users size={13} /> აქტიური · {props.users.length}
        </TabButton>
        <TabButton active={view === 'trash'} onClick={() => setView('trash')}>
          <Trash size={13} /> ნაგვის ყუთი · {props.trashedUsers.length}
        </TabButton>
      </div>

      {view === 'active' ? (
        <>
          <FilterBar {...props} />
          <UsersTable users={props.users} variant="active" />
        </>
      ) : (
        <UsersTable users={props.trashedUsers} variant="trash" />
      )}
    </div>
  );
}

function EmptyState({error}: {error: string}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-bdr bg-sur p-8">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-ora-bd bg-ora-lt text-ora">
          <Database size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-navy">
            ბაზა ჯერ არ არის დაკავშირებული
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-text-2">
            მომხმარებლების სია ცარიელია — Supabase-ის migration{' '}
            <code className="rounded bg-sur-2 px-1 font-mono text-[11px]">
              0010_users_referrals_trash.sql
            </code>{' '}
            ჯერ არ გაშვებულა. როცა Supabase მზად იქნება, ეს გვერდი ავტომატურად ამოიწვევს:
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 md:grid-cols-2 text-[12.5px] text-text-2">
            <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-1 text-grn" /> თვითრეგისტრირებულები + ლინკით მოწვეულები</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-1 text-grn" /> მომწვევის ვინაობა (cross-joined)</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-1 text-grn" /> რეგისტრაციის თარიღი · პროექტების რაოდ.</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-1 text-grn" /> მიმართულებების (interests) ფილტრი</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-1 text-grn" /> ტოპ-მომწვევების ჩარტი</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-1 text-grn" /> ნაგვის ყუთი (soft-delete, 10 დღიანი auto-purge)</li>
          </ul>
          <p className="mt-3 font-mono text-[11px] text-text-3">
            <strong className="text-red">query failed:</strong> {error}
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiRow({
  users,
  topReferrers,
  trashedCount
}: {
  users: UserWithCountry[];
  topReferrers: ReferrerSummary[];
  trashedCount: number;
}) {
  const total = users.length;
  const selfCount = users.filter((u) => u.source === 'self').length;
  const referredCount = users.filter((u) => u.source === 'referred').length;
  const verified = users.filter((u) => u.email_verified).length;
  // Computed once per render — "new this week" is a display-only metric; slight
  // jitter across re-renders is acceptable (no downstream logic depends on it).
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = Date.now() - 7 * 86400 * 1000;
  const newThisWeek = users.filter(
    (u) => new Date(u.registered_at).getTime() > sevenDaysAgo
  ).length;
  const topReferrer = topReferrers[0];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Kpi label="სულ" value={total} icon={<Users size={13} />} />
      <Kpi label="ახალი 7 დღე" value={newThisWeek} icon={<UserPlus size={13} />} accent="grn" />
      <Kpi label="თვით რეგისტრ." value={selfCount} />
      <Kpi label="მოწვეული" value={referredCount} accent="blue" />
      <Kpi label="Verified" value={verified} />
      <Kpi
        label="ტოპ მომწვევი"
        value={topReferrer ? topReferrer.name.split(' ')[0] : '—'}
        hint={topReferrer ? `${topReferrer.total_invited} მოწვევა` : trashedCount ? `${trashedCount} ნაგავში` : '—'}
        accent="ora"
      />
    </div>
  );
}

function ChartsRow({
  regByDay,
  topReferrers
}: {
  regByDay: {date: string; self: number; referred: number}[];
  topReferrers: ReferrerSummary[];
}) {
  const hasReg = regByDay.some((d) => d.self + d.referred > 0);
  const hasRef = topReferrers.length > 0;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard
        title="რეგისტრაციები (30 დღე)"
        icon={<UserPlus size={13} />}
        empty={!hasReg}
      >
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={regByDay} margin={{top: 5, right: 10, left: -20, bottom: 0}}>
            <defs>
              <linearGradient id="grad-self" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f6fd4" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#1f6fd4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-ref" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c05010" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#c05010" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#dde6f2" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{fontSize: 10, fill: '#7a96b8'}} />
            <YAxis allowDecimals={false} tick={{fontSize: 10, fill: '#7a96b8'}} />
            <Tooltip contentStyle={{fontSize: 11, borderRadius: 6}} />
            <Area type="monotone" dataKey="self" name="თვით" stroke="#1f6fd4" fill="url(#grad-self)" strokeWidth={2} />
            <Area type="monotone" dataKey="referred" name="მოწვეული" stroke="#c05010" fill="url(#grad-ref)" strokeWidth={2} />
            <Legend wrapperStyle={{fontSize: 10, paddingTop: 4}} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="ტოპ მომწვევები"
        icon={<Share2 size={13} />}
        empty={!hasRef}
      >
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={topReferrers.map((r) => ({
              name: r.name.split(' ')[0],
              invited: r.total_invited,
              registered: r.total_registered
            }))}
            margin={{top: 5, right: 10, left: -20, bottom: 0}}
          >
            <CartesianGrid stroke="#dde6f2" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#7a96b8'}} />
            <YAxis allowDecimals={false} tick={{fontSize: 10, fill: '#7a96b8'}} />
            <Tooltip contentStyle={{fontSize: 11, borderRadius: 6}} />
            <Bar dataKey="invited" name="მოწვეული" fill="#1a3a6b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="registered" name="რეგ." fill="#0f6e3a" radius={[3, 3, 0, 0]} />
            <Legend wrapperStyle={{fontSize: 10, paddingTop: 4}} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  icon,
  empty,
  children
}: {
  title: string;
  icon: React.ReactNode;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        <span className="text-blue">{icon}</span>
        {title}
      </div>
      {empty ? (
        <div className="flex h-[180px] items-center justify-center text-[11px] text-text-3">
          მონაცემი არ არის
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function FilterBar({
  countries,
  selectedCountry,
  selectedLang,
  selectedSource,
  selectedInterest,
  query
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(query);
  const [pending, start] = useTransition();

  function applyFilter(
    next: Partial<{country: string; lang: string; source: string; interest: string; q: string; view: string}>
  ) {
    const params = new URLSearchParams();
    const merged = {
      country: next.country ?? (selectedCountry ? String(selectedCountry) : undefined),
      lang: next.lang ?? selectedLang ?? undefined,
      source: next.source ?? selectedSource ?? undefined,
      interest: next.interest ?? selectedInterest ?? undefined,
      q: next.q ?? query ?? undefined,
      view: next.view
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, String(v));
    }
    start(() => {
      router.push(`/admin/users${params.toString() ? `?${params}` : ''}`);
    });
  }

  const hasFilters = !!(selectedCountry || selectedLang || selectedSource || selectedInterest || query);

  return (
    <div className="rounded-[var(--radius-card)] border border-bdr bg-sur p-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilter({q: q.trim()});
          }}
          className="flex h-9 min-w-[220px] flex-1 items-center gap-1.5 rounded-md border border-bdr bg-sur px-2.5"
        >
          <Search size={14} className="text-text-3" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ძიება სახელი / ელფოსტა / პროფესია"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
        </form>

        <select
          value={selectedSource ?? ''}
          onChange={(e) => applyFilter({source: e.target.value})}
          className="h-9 rounded-md border border-bdr bg-sur px-2.5 text-[12.5px]"
        >
          <option value="">ყველა წყარო</option>
          <option value="self">თვით რეგისტრაცია</option>
          <option value="referred">მოწვეული ლინკით</option>
        </select>

        <select
          value={selectedInterest ?? ''}
          onChange={(e) => applyFilter({interest: e.target.value})}
          className="h-9 rounded-md border border-bdr bg-sur px-2.5 text-[12.5px]"
        >
          <option value="">ყველა მიმართულება</option>
          {INTEREST_OPTIONS.map((i) => (
            <option key={i} value={i}>
              #{i}
            </option>
          ))}
        </select>

        <select
          value={selectedCountry ?? ''}
          onChange={(e) => applyFilter({country: e.target.value})}
          className="h-9 rounded-md border border-bdr bg-sur px-2.5 text-[12.5px]"
        >
          <option value="">ყველა ქვეყანა</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.flag_emoji ?? ''} {c.name_ka}
            </option>
          ))}
        </select>

        <select
          value={selectedLang ?? ''}
          onChange={(e) => applyFilter({lang: e.target.value})}
          className="h-9 rounded-md border border-bdr bg-sur px-2.5 text-[12.5px]"
        >
          <option value="">ყველა ენა</option>
          {Object.entries(LANGS).map(([code, info]) => (
            <option key={code} value={code}>
              {info.flag} {info.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              start(() => router.push('/admin/users'));
            }}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-bdr bg-sur-2 px-3 text-[12px] text-text-2 hover:bg-sur"
          >
            <X size={13} /> გასუფთავება
          </button>
        )}

        {pending && (
          <span className="inline-flex h-9 items-center px-2 text-[11px] text-text-3">იტვირთება…</span>
        )}
      </div>
    </div>
  );
}

function UsersTable({users, variant}: {users: UserWithCountry[]; variant: 'active' | 'trash'}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function softDelete(id: string) {
    if (!confirm('კონტაქტი ნაგვის ყუთში გადადის. 10 დღეში ავტომატურად წაიშლება.')) return;
    setPendingId(id);
    try {
      await fetch(`/api/admin/users/${id}`, {method: 'DELETE'});
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function restore(id: string) {
    setPendingId(id);
    try {
      await fetch(`/api/admin/users/${id}/restore`, {method: 'POST'});
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function purge(id: string) {
    if (!confirm('საბოლოოდ წაშლა? ეს ქმედება შეუქცევადია.')) return;
    setPendingId(id);
    try {
      await fetch(`/api/admin/users/${id}?purge=1`, {method: 'DELETE'});
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-bdr bg-sur">
      <div className="border-b border-bdr px-4 py-2 text-[12px] text-text-2">
        ჩანაწერი: <span className="font-mono font-semibold">{users.length}</span>
        {variant === 'trash' && users.length > 0 && (
          <span className="ml-3 inline-flex items-center gap-1 text-text-3">
            <AlertTriangle size={11} className="text-ora" /> 10 დღეში ავტომატურად გაქრება
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-sur-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">
            <tr>
              <th className="w-8 px-2 py-2" />
              <Th>სახელი</Th>
              <Th>Email</Th>
              <Th>წყარო</Th>
              <Th>მომწვევი</Th>
              <Th>რეგ. თარიღი</Th>
              <Th>პროექტი</Th>
              <Th>ენა</Th>
              <Th className="text-right">მოქმედება</Th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-[12px] text-text-3">
                  {variant === 'trash' ? 'ნაგვის ყუთი ცარიელია' : 'ჩანაწერი ვერ მოიძებნა'}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isOpen = expanded.has(u.id);
                const daysLeft = u.deleted_at
                  ? Math.max(
                      0,
                      10 - Math.floor((Date.now() - new Date(u.deleted_at).getTime()) / 86400000)
                    )
                  : null;
                return (
                  <>
                    <tr
                      key={u.id}
                      className={`border-t border-bdr ${isOpen ? 'bg-sur-2' : 'hover:bg-sur-2/60'}`}
                    >
                      <td className="px-2 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => toggle(u.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-text-3 hover:bg-sur hover:text-blue"
                          aria-label={isOpen ? 'დახურე' : 'გახსენი'}
                        >
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => toggle(u.id)}
                          className="text-left font-semibold text-navy hover:text-blue"
                        >
                          {u.name}
                        </button>
                      </Td>
                      <Td>
                        <a href={`mailto:${u.email}`} className="font-mono text-[11.5px] text-blue hover:underline">
                          {u.email}
                        </a>
                      </Td>
                      <Td>
                        <SourcePill source={u.source} />
                      </Td>
                      <Td>
                        {u.referrer ? (
                          <span className="text-[11.5px] text-text-2">{u.referrer.name}</span>
                        ) : (
                          <span className="text-text-3">—</span>
                        )}
                      </Td>
                      <Td className="font-mono text-[11px] text-text-2">{formatDate(u.registered_at)}</Td>
                      <Td className="font-mono text-text-2">{u.project_count}</Td>
                      <Td>
                        {LANGS[u.language] ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            {LANGS[u.language].flag} {u.language.toUpperCase()}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px]">{u.language}</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        {variant === 'active' ? (
                          <button
                            type="button"
                            onClick={() => softDelete(u.id)}
                            disabled={pendingId === u.id}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-bdr bg-sur px-2 text-[11px] text-text-3 hover:border-red-bd hover:text-red disabled:opacity-50"
                            title="ნაგვის ყუთში გადატანა"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            {daysLeft != null && (
                              <span className="mr-1 inline-flex items-center gap-1 rounded-full border border-ora-bd bg-ora-lt px-1.5 py-[1px] font-mono text-[9px] text-ora">
                                <Clock size={9} /> {daysLeft}დ
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => restore(u.id)}
                              disabled={pendingId === u.id}
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-grn-bd bg-grn-lt px-2 text-[11px] font-semibold text-grn hover:bg-grn hover:text-white disabled:opacity-50"
                            >
                              <RotateCcw size={12} /> აღდგენა
                            </button>
                            <button
                              type="button"
                              onClick={() => purge(u.id)}
                              disabled={pendingId === u.id}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-bd bg-sur text-red hover:bg-red hover:text-white disabled:opacity-50"
                              title="საბოლოო წაშლა"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        )}
                      </Td>
                    </tr>
                    {isOpen && (
                      <tr key={`${u.id}-details`} className="border-t border-bdr bg-sur-2">
                        <td />
                        <td colSpan={8} className="px-3 py-3">
                          <UserDetail user={u} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserDetail({user}: {user: UserWithCountry}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <VerifyEngineerCard user={user} />
      <DetailCard title="კონტაქტი">
        <DetailRow icon={<Mail size={12} />} label="Email">
          <a href={`mailto:${user.email}`} className="text-blue hover:underline">
            {user.email}
          </a>{' '}
          {user.email_verified ? (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-grn-bd bg-grn-lt px-1.5 py-[1px] font-mono text-[9px] text-grn">
              <CheckCircle2 size={9} /> verified
            </span>
          ) : (
            <span className="ml-1 inline-flex rounded-full border border-bdr bg-sur px-1.5 py-[1px] font-mono text-[9px] text-text-3">
              pending
            </span>
          )}
        </DetailRow>
        <DetailRow icon={<Phone size={12} />} label="ტელ.">
          {user.profession || <span className="text-text-3">—</span>}
        </DetailRow>
        <DetailRow icon={<Globe size={12} />} label="ქვეყანა">
          {user.country ? `${user.country.flag_emoji ?? ''} ${user.country.name_ka}` : '—'}
        </DetailRow>
        <DetailRow icon={<Languages size={12} />} label="ენა">
          {LANGS[user.language] ? `${LANGS[user.language].flag} ${LANGS[user.language].label}` : user.language}
        </DetailRow>
      </DetailCard>

      <DetailCard title="პროფილი">
        <DetailRow icon={<Briefcase size={12} />} label="პროფესია">
          {user.profession || <span className="text-text-3">—</span>}
        </DetailRow>
        <DetailRow icon={<TagIcon size={12} />} label="მიმართულებები">
          {user.interests.length === 0 ? (
            <span className="text-text-3">—</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {user.interests.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-blue-bd bg-blue-lt px-1.5 py-[1px] font-mono text-[9px] text-blue"
                >
                  #{t}
                </span>
              ))}
            </span>
          )}
        </DetailRow>
        <DetailRow icon={<Clock size={12} />} label="რეგისტრ. თარიღი">
          <span className="font-mono text-[11px]">{formatDate(user.registered_at)}</span>
        </DetailRow>
        <DetailRow icon={<Clock size={12} />} label="ბოლო შესვლა">
          <span className="font-mono text-[11px]">
            {user.last_login_at ? formatDate(user.last_login_at) : '—'}
          </span>
        </DetailRow>
      </DetailCard>

      <DetailCard title="რეგისტრაციის წყარო">
        <DetailRow icon={<Share2 size={12} />} label="წყარო">
          <SourcePill source={user.source} />
        </DetailRow>
        {user.source === 'referred' && user.referrer && (
          <>
            <DetailRow icon={<UserPlus size={12} />} label="მომწვევი">
              {user.referrer.name}
            </DetailRow>
            <DetailRow icon={<Mail size={12} />} label="მომწვ. ელფოსტა">
              <a href={`mailto:${user.referrer.email}`} className="text-blue hover:underline">
                {user.referrer.email}
              </a>
            </DetailRow>
            {user.ref_code && (
              <DetailRow icon={<TagIcon size={12} />} label="Ref code">
                <code className="font-mono text-[10px]">{user.ref_code}</code>
              </DetailRow>
            )}
          </>
        )}
        <DetailRow icon={<Briefcase size={12} />} label="პროექტები">
          <span className="font-mono">{user.project_count}</span>
        </DetailRow>
      </DetailCard>

      {user.notes && (
        <DetailCard title="ნოტები" className="md:col-span-2 xl:col-span-3">
          <p className="text-[12px] leading-relaxed text-text-2 whitespace-pre-wrap">{user.notes}</p>
        </DetailCard>
      )}
    </div>
  );
}

function VerifyEngineerCard({user}: {user: UserWithCountry}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [verified, setVerified] = useState(user.verified_engineer);

  const toggle = () => {
    const next = !verified;
    setVerified(next);
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/verify-engineer`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({verified: next})
      });
      if (!res.ok) {
        setVerified(!next);
        alert('ცვლილება ვერ შეინახა');
        return;
      }
      router.refresh();
    });
  };

  const flags: Array<{label: string; ok: boolean}> = [
    {label: 'email დადასტურებული', ok: user.email_verified},
    {label: 'არ არის disposable', ok: !user.disposable_email},
    {label: 'fraud score ≤ 0', ok: (user.fraud_score ?? 0) <= 0}
  ];

  return (
    <div className="rounded-[6px] border border-bdr bg-sur p-3 md:col-span-2 xl:col-span-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-text-3">
          ვერიფიკაცია
        </p>
        {user.disposable_email && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-lt bg-red-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-red">
            <AlertTriangle size={10} /> disposable email
          </span>
        )}
        {user.fraud_score > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-ora">
            fraud score {user.fraud_score}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
            verified
              ? 'border-grn-bd bg-grn-lt text-grn hover:bg-grn hover:text-white'
              : 'border-bdr bg-sur-2 text-text-2 hover:border-grn hover:text-grn'
          }`}
        >
          {verified ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
          {verified ? 'verified engineer' : 'ინჟინერად დადასტურება'}
        </button>

        <div className="flex flex-wrap gap-1">
          {flags.map((f) => (
            <span
              key={f.label}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] ${
                f.ok
                  ? 'border-grn-bd bg-grn-lt text-grn'
                  : 'border-bdr bg-sur-2 text-text-3'
              }`}
            >
              {f.ok ? <CheckCircle2 size={10} /> : <Clock size={10} />}
              {f.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-text-3">
        ინჟინრად დადასტურება ხელით ხდება (LinkedIn / პორტფოლიო / დიპლომი). verified badge
        ხილული იქნება referral dashboard-ში.
      </p>
    </div>
  );
}

function DetailCard({
  title,
  children,
  className
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[6px] border border-bdr bg-sur p-3 ${className ?? ''}`}>
      <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-text-3">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5 text-[12px]">
      <span className="mt-0.5 text-text-3">{icon}</span>
      <span className="w-[110px] shrink-0 text-text-3">{label}</span>
      <span className="min-w-0 flex-1 text-text">{children}</span>
    </div>
  );
}

function SourcePill({source}: {source: UserSource}) {
  const cls =
    source === 'referred'
      ? 'border-ora-bd bg-ora-lt text-ora'
      : 'border-bdr bg-sur-2 text-text-2';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-[1px] font-mono text-[9px] font-semibold ${cls}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  accent
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: 'grn' | 'ora' | 'blue';
}) {
  const tint =
    accent === 'grn' ? 'text-grn' : accent === 'ora' ? 'text-ora' : accent === 'blue' ? 'text-blue' : 'text-navy';
  return (
    <div className="rounded-[var(--radius-card)] border border-bdr bg-sur p-3">
      <div className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        {icon && <span className="text-text-2">{icon}</span>}
        {label}
      </div>
      <div className={`mt-1 font-mono text-[18px] font-bold ${tint}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-text-3">{hint}</div>}
    </div>
  );
}

function TabButton({
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
      className={`inline-flex h-9 items-center gap-1.5 rounded-t-md px-3 text-[12.5px] font-semibold transition-colors ${
        active
          ? 'border border-b-0 border-bdr bg-sur text-blue -mb-[1px]'
          : 'text-text-3 hover:text-navy'
      }`}
    >
      {children}
    </button>
  );
}

function Th({children, className = ''}: {children: React.ReactNode; className?: string}) {
  return <th className={`whitespace-nowrap px-3 py-2 text-left ${className}`}>{children}</th>;
}

function Td({children, className = ''}: {children: React.ReactNode; className?: string}) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ka-GE', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}
