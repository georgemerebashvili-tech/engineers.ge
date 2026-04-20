'use client';

import {useState} from 'react';
import {AlertTriangle, Bug} from 'lucide-react';
import {ReportIssueModal} from './report-issue-modal';

export function TestModeBannerClient({
  pathname,
  featureKey
}: {
  pathname: string;
  featureKey: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="alert"
        className="sticky top-14 md:top-16 z-30 border-y border-amber-300 bg-amber-100 text-amber-900"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2.5 px-4 py-1.5 md:px-6">
          <AlertTriangle size={14} className="shrink-0" strokeWidth={2.2} />
          <p className="flex-1 text-[12px] font-semibold leading-tight">
            ეს გვერდი <span className="uppercase tracking-wider">სატესტო რეჟიმშია</span> — შეიძლება შეიცავდეს ხარვეზებს.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-amber-400 bg-amber-50 px-2 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-200"
            aria-label="ხარვეზის შეტყობინება"
          >
            <Bug size={12} strokeWidth={2.2} />
            <span className="hidden sm:inline">შეატყობინე ხარვეზი</span>
            <span className="sm:hidden">🐞</span>
          </button>
        </div>
      </div>
      <ReportIssueModal
        open={open}
        onClose={() => setOpen(false)}
        pathname={pathname}
        featureKey={featureKey}
      />
    </>
  );
}
