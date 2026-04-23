'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {ConstructionSession} from '@/lib/construction/auth';

export function ConstructionAppFrame({session}: {session: ConstructionSession}) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/construction/logout', {method: 'POST'});
    router.replace('/construction');
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1565C0] text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 12 2l10 20H2z" />
              <path d="M10 14h4v8h-4z" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-extrabold tracking-tight text-slate-900">KAYA Construction</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">× DMT</span>
          </div>
          <span className="ml-2 hidden text-xs text-slate-400 sm:inline">
            ობიექტების ინვენტარიზაცია
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="hidden text-slate-500 sm:inline">
            {session.displayName || session.username}
          </span>
          {session.role === 'admin' && (
            <Link
              href="/construction/admin"
              className="rounded-md border border-slate-600 bg-[#1565C0] px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-[#0D47A1]"
            >
              ადმინი
            </Link>
          )}
          <Link
            href="/construction/procurement"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            🏗️ შესყიდვები
          </Link>
          <Link
            href="/construction/bank"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            🏦 ბანკი
          </Link>
          <Link
            href="/construction/mobile"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
          >
            📱 მობ.
          </Link>
          <button
            onClick={logout}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            გასვლა
          </button>
        </div>
      </header>
      <iframe
        src={`/construction/inventory.html?u=${encodeURIComponent(session.username)}&r=${session.role}`}
        className="flex-1 w-full border-0"
        title="KAYA Construction Inventory"
      />
    </div>
  );
}
