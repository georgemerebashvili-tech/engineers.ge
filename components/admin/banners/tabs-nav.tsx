'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const TABS = [
  {href: '/admin/banners', label: 'მიმოხილვა'},
  {href: '/admin/banners/manage', label: 'მართვა'},
  {href: '/admin/banners/table', label: 'ცხრილი'},
  {href: '/admin/banners/stats', label: 'სტატისტიკა'},
  {href: '/admin/banners/preview', label: 'Preview'}
];

export function BannerTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-bdr">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? 'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-blue border-b-2 border-blue -mb-px'
                : 'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-text-2 hover:text-blue border-b-2 border-transparent -mb-px transition-colors'
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
