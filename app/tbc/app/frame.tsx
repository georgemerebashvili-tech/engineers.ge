'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {TbcSession} from '@/lib/tbc/auth';
import {TbcHelpModal, TbcHelpButton} from '@/components/tbc-help-modal';

export function TbcAppFrame({session}: {session: TbcSession}) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  async function logout() {
    await fetch('/api/tbc/logout', {method: 'POST'});
    router.replace('/tbc');
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <img
            src="/tbc/logos/tbc.svg"
            alt="TBC"
            className="h-7 w-auto"
          />
          <span className="text-slate-300">×</span>
          <img
            src="/tbc/logos/dmt.png"
            alt="DMT"
            className="h-6 w-auto"
          />
          <span className="ml-3 hidden text-xs text-slate-500 sm:inline">
            ფილიალების ინვენტარიზაცია
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <TbcHelpButton onClick={() => setHelpOpen(true)} />
          <span className="hidden text-slate-500 sm:inline">
            {session.displayName || session.username}
          </span>
          {session.role === 'admin' && (
            <Link
              href="/tbc/admin"
              className="rounded-md border border-red-500 bg-red-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-red-700"
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
      {helpOpen && (
        <TbcHelpModal
          role={session.role}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  );
}
