'use client';

import {useEffect, useMemo, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {Check, History, Plus, Trash2, X} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {
  SOURCE_META,
  SOURCE_ORDER,
  convertContactToLead,
  createContact,
  deleteContact,
  emptyContact,
  fmtDate,
  loadContacts,
  loadContactsAudit,
  updateContact,
  type Contact,
  type ContactAuditEntry,
  type ContactSource,
  type ConvertContactBody,
} from '@/lib/dmt/contacts-store';
import {getActor, SOURCE_ORDER as LEAD_SOURCE_ORDER, STAGE_ORDER, type Source, type Stage} from '@/lib/dmt/leads-store';

type EditableKey = 'name' | 'company' | 'position' | 'phone' | 'email' | 'source' | 'tags' | 'notes';

const COLS: Array<{key: string; label: string; width: number}> = [
  {key: 'id', label: 'ID', width: 84},
  {key: 'name', label: 'სახელი', width: 160},
  {key: 'company', label: 'კომპანია', width: 180},
  {key: 'position', label: 'თანამდებობა', width: 140},
  {key: 'phone', label: 'ტელეფონი', width: 150},
  {key: 'email', label: 'Email', width: 200},
  {key: 'source', label: 'წყარო', width: 120},
  {key: 'tags', label: 'თეგები', width: 180},
  {key: 'convertedTo', label: 'ლიდი', width: 145},
  {key: 'notes', label: 'შენიშვნა', width: 220},
  {key: 'updatedBy', label: 'ბოლო რედ.', width: 140},
  {key: 'updatedAt', label: 'ბოლო დრო', width: 150},
];

const INPUT_CLASS = 'w-full rounded-md border border-bdr bg-sur-2 px-2 py-1.5 text-[12px] text-text focus:border-blue focus:outline-none';

export default function DmtContactsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState<Contact[]>([]);
  const [audit, setAudit] = useState<ContactAuditEntry[]>([]);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | ContactSource>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Contact | null>(null);
  const [toast, setToast] = useState('');
  const actor = getActor();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [contacts, history] = await Promise.all([loadContacts(), loadContactsAudit()]);
        if (cancelled) return;
        setRows(contacts);
        setAudit(history);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
      if (!q) return true;
      return [
        row.id,
        row.name,
        row.company,
        row.position,
        row.phone,
        row.email,
        row.source,
        row.notes,
        row.tags.join(' '),
        row.convertedToLeadId ?? '',
      ].some((value) => value.toLowerCase().includes(q));
    });
  }, [query, rows, sourceFilter]);

  const addContact = async () => {
    const contact = emptyContact(rows, actor);
    setRows((prev) => [contact, ...prev]);
    try {
      const saved = await createContact(contact);
      setRows((prev) => prev.map((row) => row.id === contact.id ? saved.contact : row));
      if (saved.auditEntry) setAudit((prev) => [saved.auditEntry!, ...prev]);
    } catch (error) {
      console.error(error);
      setRows((prev) => prev.filter((row) => row.id !== contact.id));
      alert('კონტაქტი ვერ შეინახა.');
    }
  };

  const patchContact = async (id: string, patch: Partial<Contact>) => {
    const before = rows.find((row) => row.id === id);
    if (!before) return;
    const optimistic = {...before, ...patch, updatedAt: new Date().toISOString(), updatedBy: actor};
    setRows((prev) => prev.map((row) => row.id === id ? optimistic : row));
    try {
      const saved = await updateContact(id, patch);
      setRows((prev) => prev.map((row) => row.id === id ? saved.contact : row));
      if (saved.auditEntries.length) setAudit((prev) => [...saved.auditEntries, ...prev]);
    } catch (error) {
      console.error(error);
      setRows((prev) => prev.map((row) => row.id === id ? before : row));
      alert('ცვლილება ვერ შეინახა.');
    }
  };

  const removeContact = async (id: string) => {
    const target = rows.find((row) => row.id === id);
    if (!target) return;
    if (!confirm(`წავშალო კონტაქტი ${target.id}?`)) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
    try {
      const deleted = await deleteContact(id);
      if (deleted.auditEntry) setAudit((prev) => [deleted.auditEntry!, ...prev]);
    } catch (error) {
      console.error(error);
      setRows((prev) => [target, ...prev]);
      alert('კონტაქტი ვერ წაიშალა.');
    }
  };

  const convert = async (contact: Contact, body: ConvertContactBody) => {
    const converted = await convertContactToLead(contact.id, body);
    setRows((prev) => prev.map((row) => row.id === contact.id ? converted.contact : row));
    if (converted.contactAuditEntry) setAudit((prev) => [converted.contactAuditEntry!, ...prev]);
    setConvertTarget(null);
    setToast(`კონტაქტი გადავიდა → ${converted.lead.id}`);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <DmtPageShell
      kicker="DMT · CRM"
      title="კონტაქტები"
      subtitle="საკონტაქტო რეესტრი pipeline-ის გარეთ, manual lead conversion-ით."
      searchPlaceholder="ძებნა კონტაქტებში..."
      onQueryChange={setQuery}
      actions={
        <>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          >
            <History size={14} /> Audit
          </button>
          <button
            onClick={addContact}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={14} /> ახალი კონტაქტი
          </button>
        </>
      }
      filterSlot={
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as 'all' | ContactSource)}
          className="rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 focus:border-blue focus:outline-none"
        >
          <option value="all">ყველა წყარო</option>
          {SOURCE_ORDER.map((source) => (
            <option key={source} value={source}>{SOURCE_META[source].label}</option>
          ))}
        </select>
      }
    >
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-md border border-grn-bd bg-grn-lt px-3 py-2 text-[12px] font-semibold text-grn shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-auto bg-sur-2/40 p-4">
          <div className="min-w-max overflow-hidden rounded-lg border border-bdr bg-sur shadow-sm">
            <div
              className="grid border-b border-bdr bg-sur-2 text-[11px] font-bold uppercase tracking-[0.04em] text-text-3"
              style={{gridTemplateColumns: `${COLS.map((c) => `${c.width}px`).join(' ')} 48px`}}
            >
              {COLS.map((col) => (
                <div key={col.key} className="border-r border-bdr px-3 py-2">{col.label}</div>
              ))}
              <div />
            </div>

            {!hydrated ? (
              <div className="px-4 py-10 text-center text-[13px] text-text-3">იტვირთება...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-text-3">
                კონტაქტი არ მოიძებნა.
              </div>
            ) : (
              filtered.map((row) => (
                <div
                  key={row.id}
                  className="grid border-b border-bdr text-[12px] text-text last:border-b-0 hover:bg-blue-lt/20"
                  style={{gridTemplateColumns: `${COLS.map((c) => `${c.width}px`).join(' ')} 48px`}}
                >
                  {COLS.map((col) => (
                    <Cell
                      key={col.key}
                      col={col.key}
                      row={row}
                      onPatch={(patch) => void patchContact(row.id, patch)}
                      onConvert={() => setConvertTarget(row)}
                    />
                  ))}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => void removeContact(row.id)}
                      className="rounded p-1 text-text-3 hover:bg-red-lt hover:text-red"
                      title="წაშლა"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showHistory && (
          <aside className="w-[360px] shrink-0 overflow-auto border-l border-bdr bg-sur p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] font-bold text-navy">Contacts audit</div>
              <button onClick={() => setShowHistory(false)} className="rounded p-1 text-text-3 hover:bg-sur-2">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {audit.length === 0 ? (
                <div className="text-[12px] text-text-3">Audit ცარიელია.</div>
              ) : audit.map((entry) => (
                <div key={entry.id} className="rounded-md border border-bdr bg-sur-2 p-2 text-[11.5px]">
                  <div className="font-semibold text-navy">{entry.action} · {entry.contactLabel}</div>
                  <div className="mt-0.5 text-text-3">{fmtDate(entry.at)} · {entry.by}</div>
                  {entry.column && (
                    <div className="mt-1 text-text-2">
                      {entry.columnLabel ?? entry.column}: {entry.before ?? ''} → {entry.after ?? ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {convertTarget && (
        <ConvertToLeadModal
          contact={convertTarget}
          actor={actor}
          onClose={() => setConvertTarget(null)}
          onSubmit={convert}
        />
      )}
    </DmtPageShell>
  );
}

function Cell({
  col,
  row,
  onPatch,
  onConvert,
}: {
  col: string;
  row: Contact;
  onPatch: (patch: Partial<Contact>) => void;
  onConvert: () => void;
}) {
  if (col === 'id') return <div className="border-r border-bdr px-3 py-2 font-mono text-[11px] text-text-3">{row.id}</div>;
  if (col === 'convertedTo') return (
    <div className="border-r border-bdr px-2 py-1.5">
      {row.convertedToLeadId ? (
        <Link
          href={`/dmt/leads?highlight=${encodeURIComponent(row.convertedToLeadId)}`}
          className="inline-flex items-center rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 font-mono text-[11px] font-semibold text-grn"
        >
          → {row.convertedToLeadId}
        </Link>
      ) : (
        <button
          disabled={!row.company.trim()}
          title={!row.company.trim() ? 'კონტაქტს კომპანია არ აქვს — ჯერ მიუთითე' : 'ლიდად გადაყვანა'}
          onClick={onConvert}
          className="inline-flex items-center rounded-md border border-blue-bd bg-blue-lt px-2 py-1 text-[11px] font-semibold text-blue hover:border-blue disabled:cursor-not-allowed disabled:border-bdr disabled:bg-sur-2 disabled:text-text-3"
        >
          → ლიდად
        </button>
      )}
    </div>
  );
  if (col === 'source') return (
    <div className="border-r border-bdr px-2 py-1.5">
      <select
        value={row.source}
        onChange={(e) => onPatch({source: e.target.value as ContactSource})}
        className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11.5px] text-text focus:border-blue focus:outline-none"
      >
        {SOURCE_ORDER.map((source) => <option key={source} value={source}>{SOURCE_META[source].label}</option>)}
      </select>
    </div>
  );
  if (col === 'tags') return (
    <EditableText
      value={row.tags.join(', ')}
      placeholder="tag, tag..."
      onCommit={(value) => onPatch({tags: value.split(',').map((tag) => tag.trim()).filter(Boolean)})}
    />
  );
  if (col === 'updatedBy') return <div className="border-r border-bdr px-3 py-2 text-text-2">{row.updatedBy}</div>;
  if (col === 'updatedAt') return <div className="border-r border-bdr px-3 py-2 font-mono text-[11px] text-text-3">{fmtDate(row.updatedAt)}</div>;

  return (
    <EditableText
      value={String(row[col as EditableKey] ?? '')}
      placeholder="—"
      onCommit={(value) => onPatch({[col]: value} as Partial<Contact>)}
      multiline={col === 'notes'}
    />
  );
}

function EditableText({
  value,
  onCommit,
  placeholder,
  multiline,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  const commit = () => {
    if (local !== value) onCommit(local);
  };

  if (multiline) {
    return (
      <div className="border-r border-bdr px-2 py-1.5">
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          rows={1}
          placeholder={placeholder}
          className="h-7 w-full resize-none border-0 bg-transparent text-[12px] text-text outline-none placeholder:text-text-3 focus:bg-sur"
        />
      </div>
    );
  }

  return (
    <div className="border-r border-bdr px-2 py-1.5">
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
        className="h-7 w-full border-0 bg-transparent text-[12px] text-text outline-none placeholder:text-text-3 focus:bg-sur"
      />
    </div>
  );
}

function ConvertToLeadModal({
  contact,
  actor,
  onClose,
  onSubmit,
}: {
  contact: Contact;
  actor: string;
  onClose: () => void;
  onSubmit: (contact: Contact, body: ConvertContactBody) => Promise<void>;
}) {
  const [stage, setStage] = useState<Stage>('new');
  const [source, setSource] = useState<Source | ContactSource>(contact.source);
  const [value, setValue] = useState('0');
  const [owner, setOwner] = useState(actor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await onSubmit(contact, {stage, source, value: Number(value) || 0, owner});
    } catch (err) {
      const anyErr = err as Error & {status?: number; body?: {leadId?: string; error?: string}};
      if (anyErr.status === 409) setError(`უკვე გადაყვანილია → ${anyErr.body?.leadId ?? ''}`);
      else if (anyErr.status === 400) setError('კომპანია აუცილებელია.');
      else setError(anyErr.message || 'გადაყვანა ვერ დასრულდა.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4">
      <div className="w-full max-w-[520px] rounded-lg border border-bdr bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-bdr px-4 py-3">
          <div>
            <h2 className="text-[15px] font-bold text-navy">კონტაქტის გადაყვანა ლიდად</h2>
            <p className="text-[11.5px] text-text-3">{contact.name || contact.id} · {contact.company}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-text-3 hover:bg-sur-2">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-3 gap-2 rounded-md border border-bdr bg-sur-2 p-2 text-[11.5px] text-text-2">
            <div><b>სახელი:</b> {contact.name || '—'}</div>
            <div><b>კომპანია:</b> {contact.company}</div>
            <div><b>ტელ:</b> {contact.phone || '—'}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className={INPUT_CLASS}>
                {STAGE_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select value={source} onChange={(e) => setSource(e.target.value as Source)} className={INPUT_CLASS}>
                {[...new Set([...LEAD_SOURCE_ORDER, ...SOURCE_ORDER])].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="ღირებულება ₾">
              <input value={value} onChange={(e) => setValue(e.target.value)} type="number" min={0} className={INPUT_CLASS} />
            </Field>
            <Field label="Owner">
              <input value={owner} onChange={(e) => setOwner(e.target.value)} className={INPUT_CLASS} />
            </Field>
          </div>
          {error && <div className="rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] font-semibold text-red">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-bdr px-4 py-3">
          <button onClick={onClose} className="rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2">
            გაუქმება
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            <Check size={14} /> გადაყვანა
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-text-3">{label}</span>
      {children}
    </label>
  );
}
