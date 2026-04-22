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
