'use client';

import {useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {FileText} from 'lucide-react';

type Status = 'paid' | 'pending' | 'overdue' | 'draft';

type Invoice = {
  id: string;
  client: string;
  issued: string;
  due: string;
  amount: number;
  status: Status;
};

const INVOICES: Invoice[] = [];

export default function InvoicesPage() {
  const [, setQ] = useState('');

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ინვოისები"
      subtitle="ყველა გამოცემული ინვოისი — გადახდილი, მოლოდინში, ვადაგადაცილებული"
      searchPlaceholder="ძიება ID / კლიენტი / სტატუსი…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="ნაჩვენები" value={String(INVOICES.length)} />
          <StatCard label="მთლიანი თანხა" value="₾ 0" />
          <StatCard label="გადასახდელი" value="₾ 0" accent="red" />
          <StatCard label="გადახდის მაჩვენებელი" value="—" accent="grn" />
        </div>

        <EmptyState />
      </div>
    </DmtPageShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sur-2 text-text-3">
        <FileText size={22} strokeWidth={1.6} />
      </div>
      <div className="mt-3 text-[14px] font-semibold text-navy">
        ინვოისი ჯერ არ არსებობს
      </div>
      <div className="mt-1 max-w-sm text-[12px] text-text-3">
        შექმენი პირველი ინვოისი „+ ახალი" ღილაკით. აქ გამოჩნდება ყველა გამოცემული ინვოისი — სტატუსით, ვადით და გადახდის მდგომარეობით.
      </div>
    </div>
  );
}

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'red' | 'grn'}) {
  const color = accent === 'red' ? 'var(--red)' : accent === 'grn' ? 'var(--grn)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>
        {value}
      </div>
    </div>
  );
}
