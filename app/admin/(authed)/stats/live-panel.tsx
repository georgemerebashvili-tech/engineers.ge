'use client';

import {useEffect, useRef, useState} from 'react';

type LiveData = {
  total: number;
  pages: {path: string; count: number}[];
  updated_at: string;
};

export function LivePanel() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = () => {
    fetch('/api/admin/live-visitors')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LiveData | null) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, 15_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="rounded-2xl border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          ახლა ხაზზე
        </div>
        {data && (
          <span className="text-2xl font-semibold tabular-nums">{data.total}</span>
        )}
      </div>

      {loading && (
        <div className="py-4 text-center text-xs text-fg-muted">იტვირთება...</div>
      )}

      {!loading && data && data.total === 0 && (
        <div className="py-4 text-center text-xs text-fg-muted">ახლა არავინ არ არის</div>
      )}

      {!loading && data && data.pages.length > 0 && (
        <ul className="space-y-1">
          {data.pages.map((p) => (
            <li key={p.path} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-mono text-xs text-fg-muted">{p.path}</span>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {p.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data?.updated_at && (
        <div className="mt-2 text-right text-[10px] text-fg-muted">
          განახლება: {new Date(data.updated_at).toLocaleTimeString('ka-GE', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
        </div>
      )}
    </div>
  );
}
