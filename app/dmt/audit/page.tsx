'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {ChevronDown, ChevronRight, Filter, RefreshCw, ShieldCheck} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';

type Row = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

const ACTION_META: Record<string, {label: string; color: string; bg: string; border: string}> = {
  'login.success':         {label: 'login · ok',    color: 'var(--grn)',  bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  'login.fail':            {label: 'login · fail',  color: 'var(--red)',  bg: 'var(--red-lt)',  border: '#f0b8b4'},
  'logout':                {label: 'logout',        color: 'var(--text-2)', bg: 'var(--sur-2)', border: 'var(--bdr)'},
  'register.bootstrap':    {label: 'bootstrap',     color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd'},
  'register.invite':       {label: 'invite',        color: 'var(--blue)', bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  'user.update':           {label: 'user · update', color: 'var(--ora)',  bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  'user.delete':           {label: 'user · delete', color: 'var(--red)',  bg: 'var(--red-lt)',  border: '#f0b8b4'},
  'user.delete.denied':    {label: 'delete · denied', color: 'var(--red)', bg: '#fff7ed',       border: '#f0b8b4'},
  'password.reset.request':{label: 'pwd · request', color: 'var(--ora)',  bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  'password.reset.complete':{label: 'pwd · complete', color: 'var(--grn)', bg: 'var(--grn-lt)', border: 'var(--grn-bd)'}
};

function actionStyle(a: string) {
  return ACTION_META[a] || {
    label: a,
    color: 'var(--text-2)',
    bg: 'var(--sur-2)',
    border: 'var(--bdr)'
  };
}

const ACTION_FILTERS = [
  'login.success',
  'login.fail',
  'logout',
  'register.bootstrap',
  'register.invite',
  'user.update',
  'user.delete',
  'user.delete.denied'
];

export default function DmtAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({limit: '200'});
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`/api/dmt/audit?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'load_failed');
        return;
      }
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(t) ||
        r.actor_email?.toLowerCase().includes(t) ||
        r.entity_type.toLowerCase().includes(t) ||
        r.entity_id?.toLowerCase().includes(t) ||
        r.ip?.toLowerCase().includes(t) ||
        JSON.stringify(r.payload).toLowerCase().includes(t)
    );
  }, [rows, q]);

  return (
    <DmtPageShell
      kicker="TRAIL · APPEND-ONLY"
      title="audit log"
      subtitle="ვინ / სად / რა / როდის — ყოველი mutation /dmt/*-ში. Trigger-enforced: no UPDATE, no DELETE."
      searchPlaceholder="ძიება email / action / ip / payload…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-3">
              <Filter size={12} /> action:
            </div>
            <button
              onClick={() => setActionFilter('')}
              className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-colors ${
                !actionFilter
                  ? 'border-blue bg-blue text-white'
                  : 'border-bdr bg-sur text-text-2 hover:border-blue'
              }`}
            >
              ყველა
            </button>
            {ACTION_FILTERS.map((a) => {
              const m = actionStyle(a);
              const active = actionFilter === a;
              return (
                <button
                  key={a}
                  onClick={() => setActionFilter(a)}
                  className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-colors ${
                    active ? 'ring-2 ring-offset-1 ring-blue' : ''
                  }`}
                  style={{color: m.color, background: m.bg, borderColor: m.border}}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          >
            <RefreshCw size={12} /> refresh
          </button>
        </div>

        <div className="mb-3 font-mono text-[11px] text-text-3">
          {loading
            ? 'იტვირთება…'
            : `${filtered.length} / ${total} ჩანაწერი${actionFilter ? ` · filter: ${actionFilter}` : ''}`}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
            {error === 'forbidden'
              ? 'მხოლოდ owner / admin-ს შეუძლია audit log-ის ნახვა.'
              : error}
          </div>
        )}

        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                <th className="w-6 px-2 py-2.5"></th>
                <th className="px-3 py-2.5 whitespace-nowrap">დრო</th>
                <th className="px-3 py-2.5">ვინ</th>
                <th className="px-3 py-2.5">action</th>
                <th className="px-3 py-2.5">entity</th>
                <th className="px-3 py-2.5">ip</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const m = actionStyle(r.action);
                const isOpen = !!expanded[r.id];
                const hasPayload = Object.keys(r.payload || {}).length > 0;
                return (
                  <>
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b border-bdr last:border-b-0 hover:bg-sur-2"
                      onClick={() =>
                        setExpanded((p) => ({...p, [r.id]: !p[r.id]}))
                      }
                    >
                      <td className="px-2 py-2 text-text-3">
                        {hasPayload ? (
                          isOpen ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-text-3 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate">
                          <span className="font-semibold text-navy">
                            {r.actor_email || '—'}
                          </span>
                          {r.actor_role && (
                            <span className="ml-1.5 rounded-full bg-sur-2 px-1.5 py-[1px] font-mono text-[9px] text-text-3">
                              {r.actor_role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                          style={{color: m.color, background: m.bg, borderColor: m.border}}
                        >
                          {m.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-text-2">
                        {r.entity_type}
                        {r.entity_id && (
                          <span className="ml-1 text-text-3">
                            · {r.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-text-3">
                        {r.ip || '—'}
                      </td>
                    </tr>
                    {isOpen && hasPayload && (
                      <tr key={`${r.id}-details`} className="border-b border-bdr bg-sur-2">
                        <td></td>
                        <td colSpan={5} className="px-3 py-2">
                          <pre className="overflow-x-auto rounded-md border border-bdr bg-sur p-2 font-mono text-[10.5px] leading-relaxed text-text-2">
{JSON.stringify(r.payload, null, 2)}
                          </pre>
                          {r.user_agent && (
                            <div className="mt-1 font-mono text-[10px] text-text-3">
                              UA: {r.user_agent}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-3">
                    ჩანაწერი არ არის
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-[10px] border border-bdr bg-sur-2 p-3 text-[11.5px] leading-relaxed text-text-2">
          <span className="inline-flex items-center gap-1 font-semibold text-navy">
            <ShieldCheck size={13} /> Append-only
          </span>
          : ცხრილზე დადებულია DB trigger — UPDATE / DELETE იძლევა exception-ს.
          service role-იც ვერ შეცვლის არსებულ ჩანაწერს.
        </div>
      </div>
    </DmtPageShell>
  );
}
