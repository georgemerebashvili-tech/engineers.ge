'use client';

import {Fragment, useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {ConstructionSession} from '@/lib/construction/auth';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  return new Intl.NumberFormat('ka-GE', {minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(n);
}
function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleString('ka-GE', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'});
}
function isoToday() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '.');
}
function isoMinus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, '.');
}
function toInput(s: string) { return s.replace(/\./g, '-'); }

// ── types ─────────────────────────────────────────────────────────────────────
type Balance = { AvailableBalance: number; CurrentBalance: number };
type TxRecord = {
  EntryDate: string;
  EntryDocumentNumber: string;
  EntryAccountNumber: string;
  EntryAmountDebit: number;
  EntryAmountCredit: number;
  EntryAmount: number;
  EntryComment: string;
  DocumentNomination: string;
  DocumentProductGroup: string;
  DocumentValueDate: string;
  DocumentRate: number;
  DocumentSourceAmount: number;
  DocumentSourceCurrency: string;
  DocumentDestinationAmount: number;
  DocumentDestinationCurrency: string;
  EntryId: number;
  SenderDetails?: { Name: string; Inn: string; AccountNumber: string; BankCode: string; BankName: string };
  BeneficiaryDetails?: { Name: string; Inn: string; AccountNumber: string; BankCode: string; BankName: string };
};
type StatementResp = { Id: number; Count: number; Records: TxRecord[] };

type TodayTx = {
  Id: number;
  DocNo: string;
  PostDate: string;
  ValueDate: string;
  EntryType: string;
  Credit: number;
  Debit: number;
  Amount: number;
  AmountBase: number;
  Comment: string;
  SenderDetails?: { Name: string; Inn: string; AccountNumber: string; BankCode: string; BankName: string };
  BeneficiaryDetails?: { Name: string; Inn: string; AccountNumber: string; BankCode: string; BankName: string };
};

type Tab = 'balance' | 'statement' | 'today' | 'config' | 'rsge';
type DirectionFilter = 'all' | 'credit' | 'debit';
type StatementView = 'transactions' | 'top-credit' | 'top-debit' | 'daily';

type ConfigData = {
  configured: boolean;
  client_id?: string;
  client_secret_masked?: string;
  account_iban?: string;
  account_currency?: string;
  updated_at?: string;
  updated_by?: string;
};

// ── component ─────────────────────────────────────────────────────────────────
export function BankClient({session}: {session: ConstructionSession}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('balance');

  // balance
  const [balance, setBalance]     = useState<Balance | null>(null);
  const [balLoad, setBalLoad]     = useState(false);
  const [balErr, setBalErr]       = useState<string | null>(null);

  // statement
  const [fromDate, setFromDate]   = useState(toInput(isoMinus(30)));
  const [toDate, setToDate]       = useState(toInput(isoToday()));
  const [stmt, setStmt]           = useState<StatementResp | null>(null);
  const [stmtLoad, setStmtLoad]   = useState(false);
  const [stmtErr, setStmtErr]     = useState<string | null>(null);
  const [stmtQ, setStmtQ]        = useState('');
  const [stmtDir, setStmtDir]     = useState<DirectionFilter>('all');
  const [stmtView, setStmtView]   = useState<StatementView>('transactions');
  const [selectedOrg, setSelectedOrg] = useState<{direction: 'credit' | 'debit'; key: string} | null>(null);

  // today
  const [today, setToday]         = useState<TodayTx[] | null>(null);
  const [todayLoad, setTodayLoad] = useState(false);
  const [todayErr, setTodayErr]   = useState<string | null>(null);
  const [todayQ, setTodayQ]       = useState('');
  const [todayDir, setTodayDir]   = useState<DirectionFilter>('all');

  // rs.ge
  const [rsCode, setRsCode]       = useState('');

  // config
  const [cfg, setCfg]             = useState<ConfigData | null>(null);
  const [cfgLoad, setCfgLoad]     = useState(false);
  const [cfgErr, setCfgErr]       = useState<string | null>(null);
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgOk, setCfgOk]         = useState(false);
  const [fClientId, setFClientId]         = useState('');
  const [fClientSecret, setFClientSecret] = useState('');
  const [fIban, setFIban]                 = useState('');
  const [fCurrency, setFCurrency]         = useState('GEL');

  // ── loaders ──────────────────────────────────────────────────────────────
  const loadBalance = useCallback(async () => {
    setBalLoad(true); setBalErr(null);
    try {
      const r = await fetch('/api/construction/bank/balance');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      // API returns {balance: {...}, iban, currency}
      setBalance(d.balance ?? d);
    } catch (e) { setBalErr((e as Error).message); }
    finally { setBalLoad(false); }
  }, []);

  const loadStatement = useCallback(async () => {
    setStmtLoad(true); setStmtErr(null);
    try {
      // pass as YYYY-MM-DD; bog.ts handles path encoding
      const r = await fetch(`/api/construction/bank/statement?from=${fromDate}&to=${toDate}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      // API returns {statement: {Id, Count, Records:[...]}, ...}
      setStmt(d.statement ?? d);
    } catch (e) { setStmtErr((e as Error).message); }
    finally { setStmtLoad(false); }
  }, [fromDate, toDate]);

  const loadToday = useCallback(async () => {
    setTodayLoad(true); setTodayErr(null);
    try {
      const r = await fetch('/api/construction/bank/today');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      // API returns {transactions: [...] or {Records:[...]}, ...}
      const raw = d.transactions ?? d;
      setToday(Array.isArray(raw) ? raw : raw.Records ?? []);
    } catch (e) { setTodayErr((e as Error).message); }
    finally { setTodayLoad(false); }
  }, []);

  const loadConfig = useCallback(async () => {
    setCfgLoad(true); setCfgErr(null); setCfgOk(false);
    try {
      const r = await fetch('/api/construction/bank/config');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      setCfg(d);
      if (d.client_id) setFClientId(d.client_id);
      if (d.account_iban) setFIban(d.account_iban);
      if (d.account_currency) setFCurrency(d.account_currency);
    } catch (e) { setCfgErr((e as Error).message); }
    finally { setCfgLoad(false); }
  }, []);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!fClientId.trim() || !fClientSecret.trim() || !fIban.trim()) return;
    setCfgSaving(true); setCfgErr(null); setCfgOk(false);
    try {
      const r = await fetch('/api/construction/bank/config', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({client_id: fClientId.trim(), client_secret: fClientSecret.trim(), account_iban: fIban.trim(), account_currency: fCurrency.trim() || 'GEL'}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      setCfgOk(true);
      setFClientSecret('');
      await loadConfig();
    } catch (e) { setCfgErr((e as Error).message); }
    finally { setCfgSaving(false); }
  }

  useEffect(() => { if (tab === 'balance') loadBalance(); }, [tab, loadBalance]);
  useEffect(() => { if (tab === 'today') loadToday(); }, [tab, loadToday]);
  useEffect(() => { if (tab === 'config') loadConfig(); }, [tab, loadConfig]);

  // ── filtered rows ─────────────────────────────────────────────────────────
  const filteredStmt = (stmt?.Records ?? []).filter(r => {
    const q = stmtQ.toLowerCase();
    const matchDir = stmtDir === 'all' || (stmtDir === 'credit' ? r.EntryAmountCredit > 0 : r.EntryAmountDebit > 0);
    const matchQ = !q || [
      r.SenderDetails?.Name, r.SenderDetails?.Inn,
      r.BeneficiaryDetails?.Name, r.BeneficiaryDetails?.Inn,
      r.EntryComment, r.DocumentNomination, r.EntryDocumentNumber,
    ].some(v => v?.toLowerCase().includes(q));
    return matchDir && matchQ;
  });

  const filteredToday = (today ?? []).filter(r => {
    const q = todayQ.toLowerCase();
    const matchDir = todayDir === 'all' || (todayDir === 'credit' ? r.Credit > 0 : r.Debit > 0);
    const matchQ = !q || [
      r.SenderDetails?.Name, r.SenderDetails?.Inn,
      r.BeneficiaryDetails?.Name, r.BeneficiaryDetails?.Inn,
      r.Comment, r.DocNo,
    ].some(v => v?.toLowerCase().includes(q));
    return matchDir && matchQ;
  });

  const stmtTotalCredit = filteredStmt.reduce((s, r) => s + (r.EntryAmountCredit || 0), 0);
  const stmtTotalDebit  = filteredStmt.reduce((s, r) => s + (r.EntryAmountDebit  || 0), 0);
  const todayTotalCredit = filteredToday.reduce((s, r) => s + (r.Credit || 0), 0);
  const todayTotalDebit  = filteredToday.reduce((s, r) => s + (r.Debit  || 0), 0);
  const statementAnalytics = useMemo(() => buildStatementAnalytics(filteredStmt), [filteredStmt]);
  const selectedOrgRows = useMemo(() => {
    if (!selectedOrg) return [];
    const source = selectedOrg.direction === 'credit' ? statementAnalytics.topCredits : statementAnalytics.topDebits;
    return source.find(item => item.key === selectedOrg.key)?.rows ?? [];
  }, [selectedOrg, statementAnalytics]);
  const selectedOrgTitle = useMemo(() => {
    if (!selectedOrg) return '';
    const source = selectedOrg.direction === 'credit' ? statementAnalytics.topCredits : statementAnalytics.topDebits;
    return source.find(item => item.key === selectedOrg.key)?.name ?? '';
  }, [selectedOrg, statementAnalytics]);

  async function logout() {
    await fetch('/api/construction/logout', {method: 'POST'});
    router.replace('/construction');
    router.refresh();
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-[#F8FAFC]">
      {/* ── top bar ── */}
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1565C0] text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 12 2l10 20H2z"/>
              <path d="M10 14h4v8h-4z"/>
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-extrabold tracking-tight text-slate-900">KAYA Construction</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">× DMT</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="hidden text-slate-500 sm:inline">{session.displayName || session.username}</span>
          {session.role === 'admin' && (
            <Link href="/construction/admin" className="rounded-md border border-slate-600 bg-[#1565C0] px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-[#0D47A1]">ადმინი</Link>
          )}
          <Link href="/construction/app" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">🏗️ ობიექტები</Link>
          <Link href="/construction/procurement" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">📋 შესყიდვები</Link>
          <Link href="/construction/bank" className="rounded-md border border-[#1565C0] bg-[#EEF4FD] px-3 py-1.5 font-semibold text-[#1565C0] transition hover:bg-[#DBEAFE]">🏦 ბანკი</Link>
          <button onClick={logout} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600">გასვლა</button>
        </div>
      </header>

      {/* ── page header ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">FINANCE</div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">ბანკი · BOG</h1>
            <p className="mt-0.5 text-[12px] text-slate-500">Bank of Georgia Business Online — ანგარიში, ამონაწერი, ტრანზაქციები</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'statement' && (
              <button onClick={loadStatement} disabled={stmtLoad}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#1565C0] bg-[#1565C0] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0D47A1] disabled:opacity-60">
                {stmtLoad ? '⟳ იტვირთება…' : '↻ განახლება'}
              </button>
            )}
            {tab === 'balance' && (
              <button onClick={loadBalance} disabled={balLoad}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#1565C0] bg-[#1565C0] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0D47A1] disabled:opacity-60">
                {balLoad ? '⟳ იტვირთება…' : '↻ განახლება'}
              </button>
            )}
            {tab === 'today' && (
              <button onClick={loadToday} disabled={todayLoad}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#1565C0] bg-[#1565C0] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0D47A1] disabled:opacity-60">
                {todayLoad ? '⟳ იტვირთება…' : '↻ განახლება'}
              </button>
            )}
          </div>
        </div>

        {/* tabs */}
        <div className="mt-4 flex gap-0 border-b border-slate-200">
          {([
            {id: 'balance',   label: '💰 ბალანსი'},
            {id: 'today',     label: '📅 დღეს'},
            {id: 'statement', label: '📋 ამონაწერი'},
            {id: 'config',    label: '⚙️ კონფიგურაცია'},
            {id: 'rsge',      label: '🏛️ RS.ge'},
          ] as {id: Tab; label: string}[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`-mb-px px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                tab === t.id ? 'border-[#1565C0] text-[#1565C0]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── content ── */}
      <div className="flex-1 overflow-auto p-6">

        {/* ═══ BALANCE TAB ═══ */}
        {tab === 'balance' && (
          <div className="max-w-2xl">
            {balLoad && <LoadingState label="ბალანსი იტვირთება…" />}
            {balErr && <ErrorState msg={balErr} onRetry={loadBalance} />}
            {balance && !balLoad && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">ხელმისაწვდომი ნაშთი</div>
                    <div className="mt-2 font-mono text-[32px] font-extrabold tracking-tight text-slate-900">
                      {fmt(balance.AvailableBalance)}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-400">GEL</div>
                    <div className="mt-3 text-[11.5px] text-slate-500">ბლოკირებული ოპერაციების გათვალისწინებით</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">მიმდინარე ნაშთი</div>
                    <div className="mt-2 font-mono text-[32px] font-extrabold tracking-tight text-slate-900">
                      {fmt(balance.CurrentBalance)}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-400">GEL</div>
                    <div className="mt-3 text-[11.5px] text-slate-500">ბლოკირებული ოპერაციების გარეშე</div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
                    <span className="font-mono font-bold uppercase tracking-wider text-slate-400">სხვაობა</span>
                    <span className="font-mono font-semibold text-slate-700">{fmt(balance.CurrentBalance - balance.AvailableBalance)}</span>
                    <span className="text-slate-400">GEL — ბლოკირებული</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TODAY TAB ═══ */}
        {tab === 'today' && (
          <div className="space-y-4">
            {/* summary + filters */}
            <div className="flex flex-wrap items-center gap-3">
              <input value={todayQ} onChange={e => setTodayQ(e.target.value)}
                placeholder="ძიება სახელი, საიდ. კოდი, №…"
                className="w-64 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#1565C0] focus:outline-none" />
              <DirFilter value={todayDir} onChange={setTodayDir} />
              <div className="ml-auto flex items-center gap-4 text-[12px]">
                <SummaryPill label="შემოსული" amount={todayTotalCredit} color="green" />
                <SummaryPill label="გასული" amount={todayTotalDebit} color="red" />
                <span className="font-mono text-[11px] text-slate-400">{filteredToday.length} ჩანაწერი</span>
              </div>
            </div>

            {todayLoad && <LoadingState label="დღევანდელი ტრანზაქციები იტვირთება…" />}
            {todayErr && <ErrorState msg={todayErr} onRetry={loadToday} />}
            {today && !todayLoad && (
              filteredToday.length === 0 ? (
                <EmptyState label="ტრანზაქცია არ მოიძებნა" />
              ) : (
                <TxTable rows={filteredToday.map(r => ({
                  date: r.PostDate,
                  docNo: r.DocNo,
                  credit: r.Credit,
                  debit: r.Debit,
                  currency: '',
                  comment: r.Comment,
                  nomination: '',
                  sender: r.SenderDetails,
                  beneficiary: r.BeneficiaryDetails,
                  type: r.EntryType,
                }))} />
              )
            )}
          </div>
        )}

        {/* ═══ STATEMENT TAB ═══ */}
        {tab === 'statement' && (
          <div className="space-y-4">
            {/* date range + filters */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">დან</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-[12.5px] text-slate-800 focus:border-[#1565C0] focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">მდე</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-[12.5px] text-slate-800 focus:border-[#1565C0] focus:outline-none" />
              </div>
              {/* quick ranges */}
              <div className="flex gap-1.5">
                {[
                  {label: '7 დ', days: 7},
                  {label: '30 დ', days: 30},
                  {label: '90 დ', days: 90},
                ].map(r => (
                  <button key={r.days} onClick={() => { setFromDate(toInput(isoMinus(r.days))); setToDate(toInput(isoToday())); }}
                    className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-[#1565C0] hover:text-[#1565C0]">
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={loadStatement} disabled={stmtLoad}
                className="rounded-md bg-[#1565C0] px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0D47A1] disabled:opacity-60">
                {stmtLoad ? 'იტვირთება…' : '🔍 ამონაწერი'}
              </button>
            </div>

            {/* search + dir filter */}
            {stmt && (
              <div className="flex flex-wrap items-center gap-3">
                <input value={stmtQ} onChange={e => setStmtQ(e.target.value)}
                  placeholder="ძიება სახელი, საიდ. კოდი, №, დანიშნულება…"
                  className="w-72 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#1565C0] focus:outline-none" />
                <DirFilter value={stmtDir} onChange={setStmtDir} />
                <select value={stmtView} onChange={e => { setStmtView(e.target.value as StatementView); setSelectedOrg(null); }}
                  className="min-w-[210px] rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 focus:border-[#1565C0] focus:outline-none">
                  <option value="transactions">ამონაწერი · ტრანზაქციები</option>
                  <option value="top-credit">ჩარტი · ტოპ 20 შემომრიცხავი</option>
                  <option value="top-debit">ჩარტი · ტოპ 10 მიმღები</option>
                  <option value="daily">დღეები · შემოსული / გასული</option>
                </select>
                <div className="ml-auto flex items-center gap-4 text-[12px]">
                  <SummaryPill label="შემოსული" amount={stmtTotalCredit} color="green" />
                  <SummaryPill label="გასული" amount={stmtTotalDebit} color="red" />
                  <span className="font-mono text-[11px] text-slate-400">{filteredStmt.length} / {stmt.Count} ჩანაწერი</span>
                </div>
              </div>
            )}

            {stmtLoad && <LoadingState label="ამონაწერი იტვირთება…" />}
            {stmtErr && <ErrorState msg={stmtErr} onRetry={loadStatement} />}

            {stmt && !stmtLoad && (
              filteredStmt.length === 0 ? (
                <EmptyState label="ტრანზაქცია ამ პერიოდში არ მოიძებნა" />
              ) : stmtView === 'top-credit' ? (
                <StatementTopOrganizations
                  title="ტოპ 20 კომპანია · ვინ ჩარიცხა მეტი"
                  subtitle="დაჯგუფებულია გამგზავნის მიხედვით. დაჭერაზე გამოჩნდება ჩარიცხვების ისტორია."
                  rows={statementAnalytics.topCredits.slice(0, 20)}
                  direction="credit"
                  selectedKey={selectedOrg?.direction === 'credit' ? selectedOrg.key : null}
                  onSelect={item => setSelectedOrg({direction: 'credit', key: item.key})}
                />
              ) : stmtView === 'top-debit' ? (
                <StatementTopOrganizations
                  title="ტოპ 10 კომპანია · ვის გადავურიცხეთ"
                  subtitle="დაჯგუფებულია მიმღების მიხედვით. დაჭერაზე გამოჩნდება გადარიცხვების ისტორია."
                  rows={statementAnalytics.topDebits.slice(0, 10)}
                  direction="debit"
                  selectedKey={selectedOrg?.direction === 'debit' ? selectedOrg.key : null}
                  onSelect={item => setSelectedOrg({direction: 'debit', key: item.key})}
                />
              ) : stmtView === 'daily' ? (
                <StatementDailyFlow rows={statementAnalytics.daily} />
              ) : (
                <TxTable rows={filteredStmt.map(r => ({
                  date: r.EntryDate,
                  docNo: r.EntryDocumentNumber,
                  credit: r.EntryAmountCredit,
                  debit: r.EntryAmountDebit,
                  currency: r.DocumentSourceCurrency && r.DocumentSourceCurrency !== 'GEL'
                    ? `${fmt(r.DocumentSourceAmount)} ${r.DocumentSourceCurrency} @ ${r.DocumentRate}`
                    : '',
                  comment: r.EntryComment,
                  nomination: r.DocumentNomination,
                  sender: r.SenderDetails,
                  beneficiary: r.BeneficiaryDetails,
                  type: r.DocumentProductGroup,
                }))} />
              )
            )}

            {stmt && !stmtLoad && selectedOrg && selectedOrgRows.length > 0 && stmtView !== 'transactions' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-[13px] font-bold text-slate-900">{selectedOrgTitle}</div>
                    <div className="font-mono text-[10.5px] text-slate-400">
                      {selectedOrg.direction === 'credit' ? 'ჩარიცხვების ისტორია' : 'გადარიცხვების ისტორია'} · {selectedOrgRows.length} ჩანაწერი
                    </div>
                  </div>
                  <button onClick={() => setSelectedOrg(null)}
                    className="ml-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 transition hover:border-[#1565C0] hover:text-[#1565C0]">
                    დახურვა
                  </button>
                </div>
                <TxTable rows={selectedOrgRows.map(r => ({
                  date: r.EntryDate,
                  docNo: r.EntryDocumentNumber,
                  credit: r.EntryAmountCredit,
                  debit: r.EntryAmountDebit,
                  currency: r.DocumentSourceCurrency && r.DocumentSourceCurrency !== 'GEL'
                    ? `${fmt(r.DocumentSourceAmount)} ${r.DocumentSourceCurrency} @ ${r.DocumentRate}`
                    : '',
                  comment: r.EntryComment,
                  nomination: r.DocumentNomination,
                  sender: r.SenderDetails,
                  beneficiary: r.BeneficiaryDetails,
                  type: r.DocumentProductGroup,
                }))} />
              </div>
            )}

            {!stmt && !stmtLoad && !stmtErr && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="text-3xl">📋</div>
                <div className="mt-3 text-[14px] font-semibold text-slate-700">ამონაწერი</div>
                <div className="mt-1 text-[12px] text-slate-400">აირჩიე პერიოდი და დააჭირე ამონაწერის ღილაკს</div>
              </div>
            )}
          </div>
        )}

        {/* ═══ RS.GE TAB ═══ */}
        {tab === 'rsge' && (
          <div className="max-w-xl space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-3">გადასახადის გადამხდელის ძიება</div>
              <div className="flex gap-2">
                <input
                  value={rsCode}
                  onChange={e => setRsCode(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="საიდენტიფიკაციო კოდი (9–11 ციფრი)"
                  className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800 focus:border-[#1565C0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
                />
              </div>
            </div>

            {rsCode.trim().length >= 9 && (
              <div className="space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  კოდი: {rsCode.trim()} — გახსენი ერთ-ერთ სერვისში
                </div>

                {/* RS.ge */}
                <a
                  href={`https://eservices.rs.ge/TaxpayerSearch/ka#tin=${rsCode.trim()}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1565C0] hover:shadow-md"
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-[13px]">🏛️ RS.ge — შემოსავლების სამსახური</div>
                    <div className="mt-0.5 text-[11.5px] text-slate-500">გადასახადის გადამხდელის სტატუსი, დღგ, ვალდებულებები</div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>

                {/* NAPR */}
                <a
                  href={`https://www.napr.gov.ge/ka/search?q=${rsCode.trim()}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1565C0] hover:shadow-md"
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-[13px]">📋 NAPR — საჯარო რეესტრი</div>
                    <div className="mt-0.5 text-[11.5px] text-slate-500">ბიზნეს ამონაწერი, დირექტორი, პარტნიორები, რეგისტრაცია</div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>

                {/* Reportal */}
                <a
                  href={`https://reportal.ge/ka/Base/Search?str=${rsCode.trim()}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1565C0] hover:shadow-md"
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-[13px]">📊 Reportal.ge — ანგარიშგება</div>
                    <div className="mt-0.5 text-[11.5px] text-slate-500">ფინანსური ანგარიშგება, აუდიტი, ბალანსი</div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            )}

            {rsCode.trim().length > 0 && rsCode.trim().length < 9 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
                ⚠️ საიდენტიფიკაციო კოდი 9–11 ციფრია · შეიყვანე სრული კოდი
              </div>
            )}

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11.5px] text-slate-500">
              <div className="font-semibold text-slate-600 mb-1">სად ვნახო საიდენტ. კოდი?</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>კომპანიის რეგისტრაციის ამონაწერი (NAPR)</li>
                <li>საბანკო გადახდის დავალება — სვეტი «INN»</li>
                <li>ხელშეკრულება, ინვოისი, სხვა ოფიციალური დოკ.</li>
                <li>პირად. მოწმობა (11 ციფრი) ან კომპ. სერტ. (9 ციფრი)</li>
              </ul>
            </div>
          </div>
        )}

        {/* ═══ CONFIG TAB ═══ */}
        {tab === 'config' && (
          <div className="max-w-xl">
            {cfgLoad && <LoadingState label="კონფიგურაცია იტვირთება…" />}

            {/* current status */}
            {cfg && !cfgLoad && (
              <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-[12.5px] font-semibold ${
                cfg.configured
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}>
                <span className="text-xl">{cfg.configured ? '✅' : '⚠️'}</span>
                <div>
                  {cfg.configured ? (
                    <>
                      <div>კონფიგურირებულია · IBAN: <span className="font-mono">{cfg.account_iban}</span> · {cfg.account_currency}</div>
                      <div className="font-mono text-[10.5px] font-normal text-emerald-600">client_id: {cfg.client_id} · secret: {cfg.client_secret_masked}</div>
                      {cfg.updated_by && <div className="mt-0.5 font-mono text-[10px] font-normal text-emerald-500">შეინახა: {cfg.updated_by} · {cfg.updated_at ? new Date(cfg.updated_at).toLocaleString('ka-GE') : ''}</div>}
                    </>
                  ) : 'კრედენშელები არ არის დაყენებული — შეავსე ქვემოთ'}
                </div>
              </div>
            )}

            {/* form */}
            <form onSubmit={saveConfig} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">BOG Business Online API</div>

              <CfgField label="Client ID *" hint="bonline.bog.ge/admin/api">
                <input required value={fClientId} onChange={e => setFClientId(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxx"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-slate-800 focus:border-[#1565C0] focus:bg-white focus:outline-none" />
              </CfgField>

              <CfgField label="Client Secret *" hint="secret — ინახება დაშიფრულად">
                <input required value={fClientSecret} onChange={e => setFClientSecret(e.target.value)}
                  type="password"
                  placeholder={cfg?.configured ? '••••••••  (ახალი შეიყვანე შესაცვლელად)' : 'client_secret…'}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-slate-800 focus:border-[#1565C0] focus:bg-white focus:outline-none" />
              </CfgField>

              <CfgField label="IBAN *" hint="ანგარიშის ნომერი (GE…)">
                <input required value={fIban} onChange={e => setFIban(e.target.value)}
                  placeholder="GE00BG0000000000000000"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-slate-800 focus:border-[#1565C0] focus:bg-white focus:outline-none" />
              </CfgField>

              <CfgField label="ვალუტა" hint="ISO 4217">
                <select value={fCurrency} onChange={e => setFCurrency(e.target.value)}
                  className="w-32 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-slate-800 focus:border-[#1565C0] focus:bg-white focus:outline-none">
                  <option value="GEL">GEL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </CfgField>

              {cfgErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">⚠️ {cfgErr}</div>}
              {cfgOk  && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">✅ შენახულია! ბალანსის ტაბზე გადი.</div>}

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={cfgSaving}
                  className="rounded-md bg-[#1565C0] px-5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#0D47A1] disabled:opacity-60">
                  {cfgSaving ? 'ინახება…' : '💾 შენახვა'}
                </button>
                <span className="text-[11px] text-slate-400">მხოლოდ admin-ს შეუძლია ცვლილება</span>
              </div>
            </form>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11.5px] text-slate-500">
              <div className="font-semibold text-slate-600 mb-1">სად ვიპოვო credentials?</div>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>გახსენი <span className="font-mono text-[11px]">bonline.bog.ge/admin/api</span></li>
                <li>შექმენი ან დაარედაქტირე app</li>
                <li>დააკოპირე <strong>Client ID</strong> და <strong>Client Secret</strong></li>
                <li>IBAN — BOG Business Online-ში ანგარიშის ნომერი (GE…)</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

type TxRow = {
  date: string;
  docNo: string;
  credit: number;
  debit: number;
  currency: string;
  comment: string;
  nomination: string;
  sender?: {Name: string; Inn: string; AccountNumber: string; BankCode: string; BankName: string};
  beneficiary?: {Name: string; Inn: string; AccountNumber: string; BankCode: string; BankName: string};
  type: string;
};

type OrgAmountRow = {
  key: string;
  name: string;
  inn: string;
  amount: number;
  count: number;
  rows: TxRecord[];
};

type DailyFlowRow = {
  date: string;
  credit: number;
  debit: number;
  balance: number;
  count: number;
};

function orgKey(details?: {Name: string; Inn: string}) {
  const inn = details?.Inn?.trim();
  const name = details?.Name?.trim();
  return inn || name || 'unknown';
}

function orgName(details?: {Name: string; Inn: string}) {
  return details?.Name?.trim() || details?.Inn?.trim() || 'უცნობი ორგანიზაცია';
}

function dayKey(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date?.slice(0, 10) || '—';
  return d.toISOString().slice(0, 10);
}

function dayLabel(date: string) {
  if (date === '—') return date;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('ka-GE', {day: '2-digit', month: '2-digit'});
}

function buildStatementAnalytics(records: TxRecord[]) {
  const creditMap = new Map<string, OrgAmountRow>();
  const debitMap = new Map<string, OrgAmountRow>();
  const dayMap = new Map<string, DailyFlowRow>();

  for (const r of records) {
    const credit = r.EntryAmountCredit || 0;
    const debit = r.EntryAmountDebit || 0;
    if (credit > 0) {
      const key = orgKey(r.SenderDetails);
      const existing = creditMap.get(key) ?? {
        key,
        name: orgName(r.SenderDetails),
        inn: r.SenderDetails?.Inn?.trim() || '',
        amount: 0,
        count: 0,
        rows: [],
      };
      existing.amount += credit;
      existing.count += 1;
      existing.rows.push(r);
      creditMap.set(key, existing);
    }
    if (debit > 0) {
      const key = orgKey(r.BeneficiaryDetails);
      const existing = debitMap.get(key) ?? {
        key,
        name: orgName(r.BeneficiaryDetails),
        inn: r.BeneficiaryDetails?.Inn?.trim() || '',
        amount: 0,
        count: 0,
        rows: [],
      };
      existing.amount += debit;
      existing.count += 1;
      existing.rows.push(r);
      debitMap.set(key, existing);
    }

    const date = dayKey(r.EntryDate);
    const daily = dayMap.get(date) ?? {date, credit: 0, debit: 0, balance: 0, count: 0};
    daily.credit += credit;
    daily.debit += debit;
    daily.balance += credit - debit;
    daily.count += 1;
    dayMap.set(date, daily);
  }

  const sortDesc = (a: OrgAmountRow, b: OrgAmountRow) => b.amount - a.amount;
  return {
    topCredits: Array.from(creditMap.values()).sort(sortDesc),
    topDebits: Array.from(debitMap.values()).sort(sortDesc),
    daily: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function TxTable({rows}: {rows: TxRow[]}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  function toggle(i: number) { setExpanded(p => ({...p, [i]: !p[i]})); }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[9.5px] uppercase tracking-[0.06em] text-slate-400">
              <th className="w-7 px-3 py-2.5 text-center font-bold">N</th>
              <th className="min-w-[120px] px-3 py-2.5 text-left font-bold">თარიღი</th>
              <th className="min-w-[100px] px-3 py-2.5 text-left font-bold">საბუთი №</th>
              <th className="min-w-[160px] px-3 py-2.5 text-left font-bold">გამგზავნი</th>
              <th className="min-w-[160px] px-3 py-2.5 text-left font-bold">მიმღები</th>
              <th className="min-w-[180px] px-3 py-2.5 text-left font-bold">დანიშნულება</th>
              <th className="w-32 px-3 py-2.5 text-right font-bold">შემოსული ₾</th>
              <th className="w-32 px-3 py-2.5 text-right font-bold">გასული ₾</th>
              <th className="w-8 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Fragment key={`${r.docNo || 'row'}-${r.date || 'date'}-${i}`}>
                <tr key={i}
                  onClick={() => toggle(i)}
                  className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-mono text-[10px] text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2 font-mono text-[10.5px] text-slate-500">{r.docNo || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800 line-clamp-1">{r.sender?.Name || '—'}</div>
                    {r.sender?.Inn && <div className="font-mono text-[10px] text-slate-400">{r.sender.Inn}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800 line-clamp-1">{r.beneficiary?.Name || '—'}</div>
                    {r.beneficiary?.Inn && <div className="font-mono text-[10px] text-slate-400">{r.beneficiary.Inn}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="line-clamp-1 text-[11.5px] text-slate-600">{r.nomination || r.comment || '—'}</div>
                    {r.type && <div className="font-mono text-[9.5px] text-slate-400">{r.type}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.credit > 0 ? (
                      <span className="font-mono font-semibold text-emerald-600">{fmt(r.credit)}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.debit > 0 ? (
                      <span className="font-mono font-semibold text-red-500">{fmt(r.debit)}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-2 py-2 text-center text-slate-400 text-[11px]">
                    {expanded[i] ? '▲' : '▼'}
                  </td>
                </tr>
                {expanded[i] && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={9} className="px-6 pb-3 pt-2">
                      <div className="grid grid-cols-3 gap-4 text-[11.5px]">
                        <div>
                          <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">გამგზავნი</div>
                          <Field label="სახელი"     value={r.sender?.Name} />
                          <Field label="საიდ. კოდი" value={r.sender?.Inn} />
                          <Field label="ანგარიში"    value={r.sender?.AccountNumber} />
                          <Field label="ბანკი"       value={r.sender?.BankName} />
                        </div>
                        <div>
                          <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">მიმღები</div>
                          <Field label="სახელი"     value={r.beneficiary?.Name} />
                          <Field label="საიდ. კოდი" value={r.beneficiary?.Inn} />
                          <Field label="ანგარიში"    value={r.beneficiary?.AccountNumber} />
                          <Field label="ბანკი"       value={r.beneficiary?.BankName} />
                        </div>
                        <div>
                          <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">დეტალები</div>
                          <Field label="კომენტარი"  value={r.comment} />
                          <Field label="დანიშნულება" value={r.nomination} />
                          <Field label="ვალუტა"      value={r.currency} />
                          <Field label="ტიპი"        value={r.type} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementTopOrganizations({
  title,
  subtitle,
  rows,
  direction,
  selectedKey,
  onSelect,
}: {
  title: string;
  subtitle: string;
  rows: OrgAmountRow[];
  direction: 'credit' | 'debit';
  selectedKey: string | null;
  onSelect: (item: OrgAmountRow) => void;
}) {
  const max = Math.max(...rows.map(r => r.amount), 1);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const chartRows = rows.map(row => ({
    ...row,
    shortName: row.name.length > 22 ? `${row.name.slice(0, 22)}...` : row.name,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-bold text-slate-900">{title}</div>
            <div className="mt-0.5 text-[11.5px] text-slate-500">{subtitle}</div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-right">
            <div className="font-mono text-[12px] font-bold text-slate-900">{fmt(total)}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">GEL</div>
          </div>
        </div>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} layout="vertical" margin={{top: 4, right: 26, left: 8, bottom: 4}}>
              <CartesianGrid stroke="var(--bdr)" horizontal={false} />
              <XAxis type="number" tick={{fontSize: 10, fill: 'var(--text-3)'}} tickFormatter={v => fmt(Number(v), 0)} />
              <YAxis type="category" dataKey="shortName" width={150} tick={{fontSize: 10, fill: 'var(--text-2)'}} />
              <Tooltip content={<MoneyChartTooltip />} />
              <Bar
                dataKey="amount"
                fill={direction === 'credit' ? 'var(--grn)' : 'var(--red)'}
                radius={[0, 5, 5, 0]}
                onClick={row => {
                  const payload = (row as {payload?: OrgAmountRow}).payload;
                  if (payload) onSelect(payload);
                }}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">ორგანიზაციები</div>
        </div>
        <div className="max-h-[418px] overflow-auto">
          {rows.map((row, index) => (
            <button key={row.key} onClick={() => onSelect(row)}
              className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 ${
                selectedKey === row.key ? 'bg-blue-50' : ''
              }`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-6 shrink-0 font-mono text-[10px] font-bold text-slate-400">#{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-slate-900">{row.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-2 font-mono text-[10px] text-slate-400">
                    {row.inn && <span>{row.inn}</span>}
                    <span>{row.count} ოპერაცია</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={direction === 'credit' ? 'h-full rounded-full bg-emerald-600' : 'h-full rounded-full bg-red-500'}
                      style={{width: `${Math.max(4, (row.amount / max) * 100)}%`}}
                    />
                  </div>
                </div>
                <div className={direction === 'credit' ? 'font-mono text-[12px] font-bold text-emerald-600' : 'font-mono text-[12px] font-bold text-red-500'}>
                  {fmt(row.amount)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatementDailyFlow({rows}: {rows: DailyFlowRow[]}) {
  const totals = rows.reduce((acc, row) => ({
    credit: acc.credit + row.credit,
    debit: acc.debit + row.debit,
    count: acc.count + row.count,
  }), {credit: 0, debit: 0, count: 0});
  const chartRows = rows.map(row => ({...row, label: dayLabel(row.date)}));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start gap-3">
          <div>
            <div className="text-[14px] font-bold text-slate-900">დღეების ჭრილი · შემოსული / გასული</div>
            <div className="mt-0.5 text-[11.5px] text-slate-500">ყოველ დღეზე ჩანს რამდენი ჩაირიცხა, რამდენი გადაირიცხა და წმინდა სხვაობა.</div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <SummaryPill label="შემოსული" amount={totals.credit} color="green" />
            <SummaryPill label="გასული" amount={totals.debit} color="red" />
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} margin={{top: 8, right: 12, left: 0, bottom: 8}}>
              <CartesianGrid stroke="var(--bdr)" vertical={false} />
              <XAxis dataKey="label" tick={{fontSize: 10, fill: 'var(--text-3)'}} />
              <YAxis tick={{fontSize: 10, fill: 'var(--text-3)'}} tickFormatter={v => fmt(Number(v), 0)} />
              <Tooltip content={<DailyChartTooltip />} />
              <Bar dataKey="credit" name="შემოსული" fill="var(--grn)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="debit" name="გასული" fill="var(--red)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[9.5px] uppercase tracking-[0.06em] text-slate-400">
              <th className="px-3 py-2.5 text-left font-bold">დღე</th>
              <th className="px-3 py-2.5 text-right font-bold">შემოსული ₾</th>
              <th className="px-3 py-2.5 text-right font-bold">გასული ₾</th>
              <th className="px-3 py-2.5 text-right font-bold">სხვაობა ₾</th>
              <th className="px-3 py-2.5 text-right font-bold">ჩანაწერი</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.date} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-700">{row.date}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600">{fmt(row.credit)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-red-500">{fmt(row.debit)}</td>
                <td className={`px-3 py-2 text-right font-mono font-semibold ${row.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(row.balance)}</td>
                <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-400">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoneyChartTooltip({active, payload}: {active?: boolean; payload?: {payload?: OrgAmountRow; value?: number}[]}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm">
      <div className="max-w-64 font-semibold text-slate-900">{row.name}</div>
      {row.inn && <div className="font-mono text-[10px] text-slate-400">{row.inn}</div>}
      <div className="mt-1 font-mono font-bold text-slate-800">{fmt(Number(payload[0].value || 0))} ₾</div>
      <div className="font-mono text-[10px] text-slate-400">{row.count} ოპერაცია</div>
    </div>
  );
}

function DailyChartTooltip({active, payload, label}: {active?: boolean; payload?: {name?: string; value?: number; color?: string}[]; label?: string}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm">
      <div className="mb-1 font-mono font-bold text-slate-800">{label}</div>
      {payload.map(item => (
        <div key={item.name} className="flex min-w-36 justify-between gap-4">
          <span className="text-slate-500">{item.name}</span>
          <span className="font-mono font-semibold" style={{color: item.color}}>{fmt(Number(item.value || 0))} ₾</span>
        </div>
      ))}
    </div>
  );
}

function CfgField({label, hint, children}: {label: string; hint?: string; children: React.ReactNode}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({label, value}: {label: string; value?: string}) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5 py-0.5">
      <span className="w-24 shrink-0 text-slate-400">{label}:</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function DirFilter({value, onChange}: {value: DirectionFilter; onChange: (v: DirectionFilter) => void}) {
  return (
    <div className="flex rounded-md border border-slate-200 bg-white text-[11.5px] font-semibold overflow-hidden">
      {([['all','ყველა'],['credit','შემოსული'],['debit','გასული']] as [DirectionFilter, string][]).map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-3 py-1.5 transition-colors border-r border-slate-200 last:border-0 ${value === v ? 'bg-[#1565C0] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function SummaryPill({label, amount, color}: {label: string; amount: number; color: 'green' | 'red'}) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
      color === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'
    }`}>
      <span>{label}:</span>
      <span className="font-mono">{fmt(amount)} ₾</span>
    </div>
  );
}

function LoadingState({label}: {label: string}) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-12 text-[12px] text-slate-400">
      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#1565C0]" />
      {label}
    </div>
  );
}

function ErrorState({msg, onRetry}: {msg: string; onRetry?: () => void}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600">
      <span>⚠️ {msg}</span>
      {onRetry && <button onClick={onRetry} className="ml-4 font-semibold underline hover:no-underline">retry</button>}
    </div>
  );
}

function EmptyState({label}: {label: string}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
      <div className="text-3xl">🔍</div>
      <div className="mt-2 text-[13px] font-semibold text-slate-600">{label}</div>
    </div>
  );
}
