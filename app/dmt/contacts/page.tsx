'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {createPortal} from 'react-dom';
import {ArrowRight, Check, CheckCircle2, History, Lock, Plus, Trash2, X} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {
  convertContactToLead,
  createContact,
  deleteContact,
  emptyContact,
  unlinkLeadFromContact,
  fmtDate,
  loadContacts,
  loadContactsAudit,
  updateContact,
  type Contact,
  type ContactAuditEntry,
} from '@/lib/dmt/contacts-store';
import {getActor} from '@/lib/dmt/leads-store';

type EditableKey = 'name' | 'company' | 'position' | 'phone' | 'email' | 'tags' | 'notes';

const COLS: Array<{key: string; label: string; width: number}> = [
  {key: 'id', label: 'ID', width: 84},
  {key: 'name', label: 'სახელი', width: 160},
  {key: 'company', label: 'კომპანია', width: 180},
  {key: 'position', label: 'თანამდებობა', width: 140},
  {key: 'phone', label: 'ტელეფონი', width: 150},
  {key: 'email', label: 'Email', width: 200},
  {key: 'tags', label: 'თეგები', width: 280},
  {key: 'convertedTo', label: 'ლიდი', width: 145},
  {key: 'notes', label: 'შენიშვნა', width: 220},
  {key: 'updatedBy', label: 'ბოლო რედ.', width: 140},
  {key: 'updatedAt', label: 'ბოლო დრო', width: 150},
];

function formatLeadId(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 4)}…${id.slice(-4)}`;
}

const SOURCE_TAG_BY_SOURCE: Record<Contact['source'], string> = {
  manual: 'Manual',
  import: 'Import',
  website: 'Website',
  referral: 'Referral',
  event: 'Event',
};

function hasTag(tags: string[], tag: string) {
  return tags.some((item) => item.toLowerCase() === tag.toLowerCase());
}

export default function DmtContactsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState<Contact[]>([]);
  const [audit, setAudit] = useState<ContactAuditEntry[]>([]);
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState('');
  const sourceMigrationStarted = useRef(false);
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
      if (!q) return true;
      return [
        row.id,
        row.name,
        row.company,
        row.position,
        row.phone,
        row.email,
        row.notes,
        row.tags.join(' '),
        row.convertedToLeadId ?? '',
      ].some((value) => value.toLowerCase().includes(q));
    });
  }, [query, rows]);

  useEffect(() => {
    if (!hydrated || sourceMigrationStarted.current || typeof window === 'undefined') return;
    if (window.localStorage.getItem('dmt_contacts_source_migrated') === '1') return;

    sourceMigrationStarted.current = true;
    const updates = rows
      .map((row) => ({row, tag: SOURCE_TAG_BY_SOURCE[row.source]}))
      .filter(({row, tag}) => tag && !hasTag(row.tags, tag));

    if (!updates.length) {
      window.localStorage.setItem('dmt_contacts_source_migrated', '1');
      return;
    }

    void (async () => {
      for (const {row, tag} of updates) {
        const nextTags = [...row.tags, tag];
        setRows((prev) => prev.map((item) => item.id === row.id ? {...item, tags: nextTags} : item));
        try {
          const saved = await updateContact(row.id, {tags: nextTags});
          setRows((prev) => prev.map((item) => item.id === row.id ? saved.contact : item));
          if (saved.auditEntries.length) setAudit((prev) => [...saved.auditEntries, ...prev]);
        } catch (error) {
          console.error('Contact source tag migration failed', row.id, error);
        }
      }
      window.localStorage.setItem('dmt_contacts_source_migrated', '1');
    })();
  }, [hydrated, rows]);

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

  const convert = async (contact: Contact) => {
    if (!contact.company.trim()) return;
    if (contact.convertedToLeadId) return;
    try {
      const converted = await convertContactToLead(contact.id, {});
      setRows((prev) => prev.map((row) => row.id === contact.id ? converted.contact : row));
      if (converted.contactAuditEntry) setAudit((prev) => [converted.contactAuditEntry!, ...prev]);
      setToast(`კონტაქტი გადავიდა → ${converted.lead.id}`);
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      const anyErr = err as Error & {status?: number};
      if (anyErr.status === 409) alert('უკვე გადაყვანილია.');
      else if (anyErr.status === 400) alert('კომპანია აუცილებელია.');
      else alert('გადაყვანა ვერ დასრულდა.');
    }
  };

  const unlinkLead = async (contact: Contact) => {
    if (!contact.convertedToLeadId) return;
    if (!confirm(`ლიდი ${contact.convertedToLeadId} წავშალო? კონტაქტი დარჩება.`)) return;
    try {
      const result = await unlinkLeadFromContact(contact.id);
      setRows((prev) => prev.map((row) => row.id === contact.id ? result.contact : row));
      if (result.contactAuditEntry) setAudit((prev) => [result.contactAuditEntry!, ...prev]);
      setToast(`ლიდი ${result.deletedLeadId} წაიშალა`);
      setTimeout(() => setToast(''), 2500);
    } catch (error) {
      console.error(error);
      alert('ლიდი ვერ წაიშალა.');
    }
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
                      onConvert={() => void convert(row)}
                      onUnlink={() => void unlinkLead(row)}
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

    </DmtPageShell>
  );
}

function Cell({
  col,
  row,
  onPatch,
  onConvert,
  onUnlink,
}: {
  col: string;
  row: Contact;
  onPatch: (patch: Partial<Contact>) => void;
  onConvert: () => void;
  onUnlink: () => void;
}) {
  if (col === 'id') return <div className="border-r border-bdr px-3 py-2 font-mono text-[11px] text-text-3">{row.id}</div>;
  if (col === 'convertedTo') return (
    <div className="border-r border-bdr px-2 py-1.5">
      {row.convertedToLeadId ? (
        <span className="group/badge inline-flex items-stretch overflow-hidden rounded-full border border-grn-bd bg-grn-lt shadow-sm transition-all hover:border-grn hover:shadow">
          <Link
            href={`/dmt/leads/manual?highlight=${encodeURIComponent(row.convertedToLeadId)}`}
            title={`ლიდი ${row.convertedToLeadId} — გადადი ლიდის გვერდზე`}
            className="flex min-w-0 items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-grn transition-colors hover:bg-grn hover:text-white"
          >
            <CheckCircle2 size={13} strokeWidth={2.5} />
            <span>ლიდი</span>
            <span className="max-w-[100px] truncate font-mono" title={row.convertedToLeadId}>
              {formatLeadId(row.convertedToLeadId)}
            </span>
          </Link>
          <button
            onClick={onUnlink}
            title="ლიდის წაშლა"
            className="flex items-center border-l border-grn-bd px-1.5 text-grn opacity-50 transition-all hover:bg-red hover:text-white hover:opacity-100"
          >
            <X size={12} strokeWidth={2.75} />
          </button>
        </span>
      ) : !row.company.trim() ? (
        <span
          title="კონტაქტს კომპანია არ აქვს — ჯერ მიუთითე"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-bdr bg-sur-2 px-2.5 py-1 text-[11px] font-semibold text-text-3 opacity-70"
        >
          <Lock size={11} strokeWidth={2.5} />
          ლიდად
        </span>
      ) : (
        <button
          title="ლიდად გადაყვანა (ყველა ლიდში დაემატება)"
          onClick={onConvert}
          className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-blue-bd bg-gradient-to-r from-blue-lt to-sur px-2.5 py-1 text-[11px] font-semibold text-blue shadow-sm transition-all hover:border-blue hover:from-blue hover:to-navy-2 hover:text-white hover:shadow-md hover:scale-[1.03] active:scale-[0.98]"
        >
          <ArrowRight size={12} strokeWidth={2.75} className="transition-transform group-hover:translate-x-0.5" />
          ლიდად
        </button>
      )}
    </div>
  );
  if (col === 'tags') return (
    <TagsCell
      tags={row.tags}
      onChange={(tags) => onPatch({tags})}
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

const PRESET_TAGS: Array<{label: string; color: string; bg: string; border: string}> = [
  {label: 'Manual',   color: 'var(--text-2)', bg: 'var(--sur-2)',    border: 'var(--bdr)'},
  {label: 'Import',   color: 'var(--ora)',    bg: 'var(--ora-lt)',   border: 'var(--ora-bd)'},
  {label: 'Website',  color: 'var(--blue)',   bg: 'var(--blue-lt)',  border: 'var(--blue-bd)'},
  {label: 'Referral', color: 'var(--grn)',    bg: 'var(--grn-lt)',   border: 'var(--grn-bd)'},
  {label: 'Event',    color: '#7c3aed',       bg: '#ede9fe',         border: '#c4b5fd'},
];

function getTagStyle(tag: string) {
  const preset = PRESET_TAGS.find((p) => p.label.toLowerCase() === tag.toLowerCase());
  return preset ?? {label: tag, color: 'var(--text-2)', bg: 'var(--sur-2)', border: 'var(--bdr)'};
}

function TagsCell({tags, onChange}: {tags: string[]; onChange: (next: string[]) => void}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top: Math.min(rect.bottom + 6, window.innerHeight - 16),
      left: Math.min(rect.left, window.innerWidth - 276),
    });
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      setPos(null);
      return;
    }
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as HTMLElement).closest('[data-tags-panel="true"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const togglePreset = (tag: string) => {
    if (tags.includes(tag)) onChange(tags.filter((t) => t !== tag));
    else onChange([...tags, tag]);
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setCustom('');
      return;
    }
    onChange([...tags, trimmed]);
    setCustom('');
  };

  return (
    <div ref={ref} className="relative border-r border-bdr px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => {
          const st = getTagStyle(tag);
          return (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold"
              style={{color: st.color, background: st.bg, borderColor: st.border}}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 opacity-60 transition-all hover:bg-red hover:text-white hover:opacity-100"
                title="წაშლა"
              >
                <X size={9} strokeWidth={3} />
              </button>
            </span>
          );
        })}
        <button
          onClick={toggleOpen}
          title="თეგის დამატება"
          className={`inline-flex items-center gap-1 rounded-full border border-dashed px-1.5 py-0.5 text-[10.5px] font-semibold transition-all ${
            open
              ? 'border-blue bg-blue-lt text-blue'
              : 'border-bdr-2 text-text-3 hover:border-blue hover:bg-blue-lt hover:text-blue'
          }`}
        >
          <Plus size={11} strokeWidth={2.5} />
          {tags.length === 0 ? 'თეგი' : ''}
        </button>
      </div>
      {open && pos && createPortal(
        <div
          data-tags-panel="true"
          className="fixed z-50 w-[260px] overflow-hidden rounded-lg border border-bdr bg-sur shadow-xl"
          style={{top: pos.top, left: Math.max(8, pos.left)}}
        >
          <div className="border-b border-bdr px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
            Preset თეგები
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {PRESET_TAGS.map((preset) => {
              const active = tags.includes(preset.label);
              return (
                <button
                  key={preset.label}
                  onClick={() => togglePreset(preset.label)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-sur-2"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{background: preset.color}}
                    />
                    <span style={{color: active ? preset.color : 'var(--text)'}} className={active ? 'font-semibold' : ''}>
                      {preset.label}
                    </span>
                  </span>
                  {active && <Check size={13} strokeWidth={2.5} style={{color: preset.color}} />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-bdr bg-sur-2/40 px-3 py-2">
            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              საკუთარი
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="ჩაწერე..."
                className="flex-1 rounded-md border border-bdr bg-sur px-2 py-1 text-[11.5px] text-text focus:border-blue focus:outline-none"
              />
              <button
                onClick={addCustom}
                disabled={!custom.trim()}
                className="rounded-md border border-blue bg-blue px-2 py-1 text-[10.5px] font-semibold text-white hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>
        , document.body)}
    </div>
  );
}
