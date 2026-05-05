'use client';

import {useEffect, useState} from 'react';
import {FileText, Info, Package, Phone, User, X} from 'lucide-react';
import {OfferList} from '@/components/dmt/offer-list';
import {PhotoGrid} from '@/components/dmt/photo-grid';
import {QrCodeLink} from '@/components/dmt/qr-code-link';

export type ManualLeadDrawerLead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  contract: number | null;
  status: string;
  role: string;
  owner: string;
  period: string;
  editedBy: string;
  editedAt: string;
  createdBy: string;
};

type Tab = 'info' | 'offers' | 'inventory';

type Props = {
  lead: ManualLeadDrawerLead | null;
  initialTab?: Tab;
  onClose: () => void;
};

const TABS: Array<{id: Tab; label: string; icon: typeof Info}> = [
  {id: 'info', label: 'Info', icon: Info},
  {id: 'offers', label: 'Offers', icon: FileText},
  {id: 'inventory', label: 'Inventory', icon: Package}
];

function Field({label, value}: {label: string; value: string | number | null}) {
  return (
    <div className="rounded-md border border-bdr bg-sur-2 p-3">
      <div className="mb-1 font-mono text-[10px] font-bold uppercase text-text-3">{label}</div>
      <div className="min-h-5 break-words text-[13px] font-semibold text-text">{value || '—'}</div>
    </div>
  );
}

export function LeadDetailDrawer({lead, initialTab = 'info', onClose}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (!lead) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lead, onClose]);

  if (!lead) return null;

  const mobileHref = `/dmt/m/leads/${encodeURIComponent(lead.id)}/photos`;

  return (
    <div className="fixed inset-0 z-[70] bg-black/25" onMouseDown={onClose}>
      <aside
        className="ml-auto flex h-full w-full max-w-[720px] flex-col border-l border-bdr bg-bg shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-bdr bg-sur px-4 py-4">
          <div className="min-w-0">
            <div className="font-mono text-[11px] font-bold uppercase text-blue">{lead.id}</div>
            <h2 className="truncate text-xl font-bold text-navy">{lead.company || lead.contact || 'Manual lead'}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-text-2">
              <span className="inline-flex items-center gap-1"><User size={13} /> {lead.contact || '—'}</span>
              <span className="inline-flex items-center gap-1"><Phone size={13} /> {lead.phone || '—'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-bdr bg-sur-2 p-2 text-text-2 hover:border-red hover:text-red"
            title="Close"
          >
            <X size={16} />
          </button>
        </header>

        <nav className="flex border-b border-bdr bg-sur px-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-[12px] font-semibold ${
                  active
                    ? 'border-blue text-blue'
                    : 'border-transparent text-text-2 hover:text-blue'
                }`}
              >
                <Icon size={14} /> {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-auto p-4">
          {tab === 'info' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company" value={lead.company} />
              <Field label="Contact" value={lead.contact} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Contract" value={lead.contract === null ? null : `₾ ${lead.contract}`} />
              <Field label="Status" value={lead.status} />
              <Field label="Role" value={lead.role} />
              <Field label="Owner" value={lead.owner} />
              <Field label="Period" value={lead.period} />
              <Field label="Edited by" value={lead.editedBy} />
              <Field label="Edited at" value={lead.editedAt} />
              <Field label="Created by" value={lead.createdBy} />
            </div>
          )}

          {tab === 'offers' && (
            <OfferList
              lead={{
                id: lead.id,
                company: lead.company,
                contact: lead.contact,
                phone: lead.phone
              }}
            />
          )}

          {tab === 'inventory' && (
            <div className="space-y-4">
              <QrCodeLink href={mobileHref} label="Scan for mobile photo capture" />
              <PhotoGrid leadId={lead.id} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
