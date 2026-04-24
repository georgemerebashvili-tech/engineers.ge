'use client';

import {useEffect, useState} from 'react';
import {TBC_CHANGELOG, TBC_CURRENT_VERSION, TBC_LAST_UPDATE} from '@/lib/tbc/changelog';

const STORAGE_KEY = 'tbc_whatsnew_seen';

type Props = {
  size?: 'sm' | 'md';
  className?: string;
};

export function WhatsNewButton({size = 'sm', className = ''}: Props) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(STORAGE_KEY));
    } catch {}
  }, []);

  const hasUnseen = seen !== TBC_CURRENT_VERSION;

  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, TBC_CURRENT_VERSION);
    } catch {}
    setSeen(TBC_CURRENT_VERSION);
  }

  function openModal() {
    setOpen(true);
    markSeen();
  }

  const btnClass =
    size === 'md'
      ? 'px-3 py-1.5 text-sm'
      : 'px-2.5 py-1 text-xs';

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title={`ბოლო განახლება: ${TBC_LAST_UPDATE}`}
        className={`relative inline-flex items-center gap-1 rounded-md bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200 active:scale-95 ${btnClass} ${className}`}
      >
        🎁 <span>სიახლე</span>
        {hasUnseen && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">🎁 რა გაკეთდა</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="დახურვა"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {TBC_CHANGELOG.map((e) => (
                <div key={e.version} className="border-l-2 border-emerald-400 pl-3">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-900">{e.title}</span>
                    <span className="font-mono text-[10px] text-slate-400">{e.date}</span>
                  </div>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-slate-600">
                    {e.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-center font-mono text-[10px] text-slate-400">
              ბოლო განახლება: {TBC_LAST_UPDATE}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
