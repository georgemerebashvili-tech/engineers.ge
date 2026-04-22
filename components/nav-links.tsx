'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {DonateModal} from './donate-modal';

export function NavLinks() {
  const pathname = usePathname();
  const [donateOpen, setDonateOpen] = useState(false);
  const isAdminArea = pathname?.startsWith('/admin') ?? false;

  return (
    <>
      <nav className="hidden items-center gap-4 md:flex">
        <Link
          href="/leads"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-navy bg-navy px-2.5 text-[11.5px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-navy-2"
          title="Leads CRM — ანგარიშის საჭიროა"
        >
          Leads
        </Link>
        <Link
          href="/admin"
          className="text-xs font-semibold text-text-2 transition-colors hover:text-blue"
        >
          ადმინი
        </Link>
        {!isAdminArea && (
          <>
            <button
              type="button"
              onClick={() => setDonateOpen(true)}
              className="text-xs font-semibold text-text-2 transition-colors hover:text-blue"
            >
              დონაცია
            </button>
            <Link
              href="/ads"
              className="text-xs font-semibold text-text-2 transition-colors hover:text-blue"
            >
              რეკლამა
            </Link>
          </>
        )}
      </nav>
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </>
  );
}
