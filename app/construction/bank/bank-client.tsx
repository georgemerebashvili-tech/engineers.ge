'use client';

import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
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
function fromInput(s: string) { return s.replace(/-/g, '.'); }

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

            {!stmt && !stmtLoad && !stmtErr && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="text-3xl">📋</div>
                <div className="mt-3 text-[14px] font-semibold text-slate-700">ამონაწერი</div>
                <div className="mt-1 text-[12px] text-slate-400">აირჩიე პერიოდი და დააჭირე "ამონაწერი"</div>
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
              <>
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
                  <tr key={`exp-${i}`} className="border-b border-slate-100 bg-slate-50">
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
              </>
            ))}
          </tbody>
        </table>
      </div>
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

function RsRow({label, value, bold, mono}: {label: string; value?: string | null; bold?: boolean; mono?: boolean}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 px-5 py-3 text-[12.5px]">
      <span className="w-44 shrink-0 text-slate-400">{label}</span>
      <span className={`text-slate-800 ${bold ? 'font-semibold' : ''} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
