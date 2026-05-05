'use client';

import Link from 'next/link';
import {CheckCircle2, XCircle} from 'lucide-react';
import type {ManualOfferStatus} from '@/lib/dmt/contacts-store';

const STATUS_COLORS: Record<ManualOfferStatus, string> = {
  offer_in_progress: 'var(--blue)',
  offer_accepted: 'var(--grn)',
  offer_rejected: 'var(--red)',
};

export function ContactConversionToggle({
  hasCompany,
  leadId,
  leadStatus,
  onConvertClick,
}: {
  hasCompany: boolean;
  leadId: string | null;
  leadStatus: ManualOfferStatus | null;
  onConvertClick: () => void;
}) {
  const color = leadStatus ? STATUS_COLORS[leadStatus] : 'var(--text-3)';

  if (leadId) {
    return (
      <Link
        href={`/dmt/leads/manual?highlight=${encodeURIComponent(leadId)}`}
        aria-label={`Open converted manual lead ${leadId}`}
        className="inline-flex min-h-6 max-w-full items-center gap-2 rounded-full px-1 py-0.5 hover:bg-sur-2"
        style={{color}}
      >
        <SwitchKnob on color={color} />
        <span className="min-w-0 truncate font-mono text-[11px] font-bold">{leadId}</span>
        {leadStatus === 'offer_accepted' && <CheckCircle2 size={12} className="shrink-0" />}
        {leadStatus === 'offer_rejected' && <XCircle size={12} className="shrink-0" />}
      </Link>
    );
  }

  if (!hasCompany) {
    return (
      <span
        className="inline-flex min-h-6 items-center gap-2 rounded-full px-1 py-0.5 opacity-45"
        title="ჯერ მიუთითე კომპანია"
      >
        <SwitchKnob on={false} disabled />
        <span className="text-[11px] font-semibold text-text-3">—</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onConvertClick}
      aria-label="Convert contact to manual lead"
      className="group inline-flex min-h-6 items-center gap-2 rounded-full px-1 py-0.5 transition-colors hover:bg-blue-lt"
    >
      <SwitchKnob on={false} />
      <span className="text-[11px] font-semibold text-text-3 group-hover:text-blue">ON</span>
    </button>
  );
}

function SwitchKnob({on, color, disabled}: {on: boolean; color?: string; disabled?: boolean}) {
  return (
    <span
      className={`relative inline-block h-[16px] w-[30px] rounded-full transition-colors duration-200 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{background: on ? color : 'var(--bdr-2)'}}
    >
      <span
        className="absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white shadow transition-all duration-200"
        style={{left: on ? '16px' : '2px'}}
      />
    </span>
  );
}
