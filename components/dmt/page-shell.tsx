'use client';

import {useState, type ReactNode} from 'react';
import {Search, Plus, Filter, Download} from 'lucide-react';

type Props = {
  kicker: string;
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onQueryChange?: (q: string) => void;
  initialQuery?: string;
  children: ReactNode;
};

export function DmtPageShell({
  kicker,
  title,
  subtitle,
  searchPlaceholder = 'ძიება…',
  onQueryChange,
  initialQuery = '',
  children
}: Props) {
  const [q, setQ] = useState(initialQuery);
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-bdr bg-sur px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
              {kicker}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-navy md:text-2xl">
              {title}
            </h1>
            {subtitle && <p className="mt-0.5 text-[12px] text-text-2">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue">
              <Download size={14} /> Export
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2">
              <Plus size={14} /> ახალი
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                onQueryChange?.(e.target.value);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-bdr bg-sur-2 py-1.5 pl-9 pr-3 text-[12.5px] text-text placeholder:text-text-3 focus:border-blue focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue">
            <Filter size={14} /> ფილტრი
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
