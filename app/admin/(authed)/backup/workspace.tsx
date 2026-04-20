'use client';

import {useMemo, useState} from 'react';
import {Download, CheckSquare, Square, Database, AlertTriangle} from 'lucide-react';
import type {BackupTable} from '@/lib/db-backup';

const LARGE_TABLE_THRESHOLD = 5000;

export function BackupWorkspace({
  tables,
  counts
}: {
  tables: BackupTable[];
  counts: Record<string, number | null>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        tables
          .filter((t) => counts[t.key] !== null && (counts[t.key] ?? 0) > 0 && !isLargeTable(t.key))
          .map((t) => t.key)
      )
  );
  const [busy, setBusy] = useState(false);

  const totalSelectedRows = useMemo(
    () =>
      Array.from(selected).reduce((sum, key) => sum + (counts[key] ?? 0), 0),
    [selected, counts]
  );

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(tables.filter((t) => counts[t.key] !== null).map((t) => t.key)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function download() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const url = `/api/admin/backup?tables=${Array.from(selected).join(',')}`;
      // Trigger browser download via anchor click (avoids memory for large payloads).
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setBusy(false), 800);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary + actions */}
      <div className="flex flex-col gap-3 rounded-card border border-bdr bg-sur p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-text-3">
            <Database size={12} />
            მონიშნული
          </div>
          <p className="mt-0.5 text-[20px] font-bold text-navy">
            {selected.size} table · {totalSelectedRows.toLocaleString()} row
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="h-8 rounded-md border border-bdr bg-sur px-3 text-[11px] font-semibold text-text-2 hover:bg-sur-2"
          >
            ყველა
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="h-8 rounded-md border border-bdr bg-sur px-3 text-[11px] font-semibold text-text-2 hover:bg-sur-2"
          >
            არცერთი
          </button>
          <button
            type="button"
            onClick={download}
            disabled={busy || selected.size === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue px-4 text-[12px] font-semibold text-white hover:bg-blue/90 disabled:opacity-60"
          >
            <Download size={14} />
            {busy ? 'იქმნება…' : 'Download JSON'}
          </button>
        </div>
      </div>

      {/* Safety note */}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
        <strong>⚠ Privacy:</strong> ჩამოტვირთული JSON შეიცავს user-ის PII-ს (email, IP_hash, visitor_id).
        არ გააზიარო უნაფოსოდ — შენახე encrypted drive-ზე ან წაშალე სარგებლობის მერე.
      </div>

      {/* Table list */}
      <section className="rounded-card border border-bdr bg-sur overflow-hidden">
        <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
            Exportable tables · {tables.length}
          </h2>
        </header>
        <ul className="divide-y divide-bdr">
          {tables.map((t) => {
            const count = counts[t.key];
            const unavailable = count === null;
            const isOn = selected.has(t.key);
            const large = !unavailable && (count ?? 0) > LARGE_TABLE_THRESHOLD;
            return (
              <li key={t.key}>
                <label
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    unavailable
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-sur-2 cursor-pointer'
                  }`}
                >
                  <span className="mt-0.5">
                    {isOn ? (
                      <CheckSquare size={16} className="text-blue" />
                    ) : (
                      <Square size={16} className="text-text-3" />
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => !unavailable && toggle(t.key)}
                    disabled={unavailable}
                    className="sr-only"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[13px] text-navy">{t.label}</span>
                      <code className="font-mono text-[10px] text-text-3">{t.table}</code>
                      {large && (
                        <span className="inline-flex h-4 items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 font-mono text-[9px] font-bold text-amber-800">
                          <AlertTriangle size={8} />
                          large
                        </span>
                      )}
                      {unavailable && (
                        <span className="rounded-full border border-bdr bg-sur-2 px-1.5 font-mono text-[9px] text-text-3">
                          unavailable
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-text-2">{t.description}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-text-3">
                    {unavailable ? '—' : (count ?? 0).toLocaleString()} row
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function isLargeTable(key: string): boolean {
  return ['page_views', 'calc_events', 'web_vitals'].includes(key);
}
