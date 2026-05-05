'use client';

import Link from 'next/link';
import {CheckCircle2, XCircle} from 'lucide-react';
import type {ManualOfferStatus} from '@/lib/dmt/contacts-store';

export function ContactConvertedBadge({
  leadId,
  status,
  inventoryChecked,
  invoiceIssued,
}: {
  leadId: string;
  status: ManualOfferStatus | null;
  inventoryChecked: boolean;
  invoiceIssued: boolean;
}) {
  const href = `/dmt/leads/manual?highlight=${encodeURIComponent(leadId)}`;
  if (status === 'offer_accepted') {
    return (
      <Link href={href} className="inline-flex items-center gap-1 rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 font-mono text-[11px] font-semibold text-grn">
        <CheckCircle2 size={12} /> {leadId} · დასტური
      </Link>
    );
  }
  if (status === 'offer_rejected') {
    return (
      <Link href={href} className="inline-flex items-center gap-1 rounded-full border border-red bg-red-lt px-2 py-0.5 font-mono text-[11px] font-semibold text-red">
        <XCircle size={12} /> {leadId} · უარყოფილი
      </Link>
    );
  }
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[11px] font-semibold text-ora">
      <span className="dmt-offer-pulse-dot" /> {leadId} · შეთავაზება
      <span className="ml-1 inline-flex items-center gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{background: inventoryChecked ? 'var(--grn)' : 'var(--text-3)'}} />
        <span className="h-1.5 w-1.5 rounded-full" style={{background: invoiceIssued ? 'var(--grn)' : 'var(--text-3)'}} />
      </span>
    </Link>
  );
}
