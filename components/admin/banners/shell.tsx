import {LayoutGrid} from 'lucide-react';
import {HERO_OWNER_NAME} from '@/lib/hero-ads';

export function BannersShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue text-white">
          <LayoutGrid size={20} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold text-navy">{title}</h2>
          <p className="mt-0.5 text-[12px] text-text-2">{description}</p>
        </div>
        <span className="rounded-full border border-blue-bd bg-blue-lt px-3 py-1 text-[11px] font-semibold text-blue">
          Owner: {HERO_OWNER_NAME}
        </span>
      </div>
      {children}
    </div>
  );
}
