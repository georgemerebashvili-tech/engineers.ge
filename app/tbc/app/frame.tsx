'use client';

import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {TbcSession} from '@/lib/tbc/auth';

export function TbcAppFrame({session}: {session: TbcSession}) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/tbc/logout', {method: 'POST'});
    router.replace('/tbc');
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="rounded border-2 border-[#0071CE] px-2 py-0.5 text-xs font-extrabold tracking-tight text-[#0071CE]">
            TBC
          </div>
          <span className="text-slate-300">×</span>
          <span className="flex items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-[#00AA8D] to-[#008A73] font-mono text-xs font-extrabold text-white">
              D
            </span>
            <span className="text-sm font-bold text-slate-900">DMT</span>
          </span>
          <span className="ml-3 hidden text-xs text-slate-500 sm:inline">
            ფილიალების ინვენტარიზაცია
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="hidden text-slate-500 sm:inline">
            {session.displayName || session.username}
          </span>
          {session.role === 'admin' && (
            <Link
              href="/tbc/admin"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              ადმინი
            </Link>
          )}
          <Link
            href="/tbc/mobile"
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
        src={`/tbc/inventory.html?u=${encodeURIComponent(session.username)}&r=${session.role}`}
        className="flex-1 w-full border-0"
        title="TBC Inventory"
      />
    </div>
  );
}
