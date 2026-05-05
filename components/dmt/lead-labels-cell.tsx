'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Plus, X} from 'lucide-react';
import {loadLabelSuggestions, setLeadLabels, type Lead, type LeadAuditEntry} from '@/lib/dmt/leads-store';

export function LeadLabelsCell({
  lead,
  onSaved,
}: {
  lead: Lead;
  onSaved: (lead: Lead, auditEntry?: LeadAuditEntry | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    void loadLabelSuggestions().then(setSuggestions).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
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

  const available = useMemo(() => {
    const q = input.trim().toLowerCase();
    return suggestions
      .filter((label) => !lead.labels.includes(label))
      .filter((label) => !q || label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [input, lead.labels, suggestions]);

  const save = async (labels: string[]) => {
    setBusy(true);
    try {
      const cleaned = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
      const saved = await setLeadLabels(lead.id, cleaned);
      onSaved(saved.lead, saved.auditEntry);
      setSuggestions((prev) => [...new Set([...cleaned, ...prev])]);
      setInput('');
    } catch (error) {
      console.error(error);
      alert('იარლიყები ვერ შეინახა.');
    } finally {
      setBusy(false);
    }
  };

  const add = (label: string) => {
    if (!label.trim()) return;
    void save([...lead.labels, label]);
  };

  return (
    <div ref={triggerRef} className="relative px-2 py-1.5">
      <div className="flex max-w-full items-center gap-1 overflow-hidden">
        {lead.labels.slice(0, 2).map((label) => (
          <span key={label} className="inline-flex max-w-[70px] items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-2 py-0.5 text-[10.5px] font-semibold text-blue">
            <span className="truncate">{label}</span>
          </span>
        ))}
        {lead.labels.length > 2 && <span className="text-[10px] text-text-3">+{lead.labels.length - 2}</span>}
        <button onClick={() => setOpen((v) => !v)} className="rounded-full border border-bdr bg-sur-2 p-0.5 text-text-3 hover:text-blue">
          <Plus size={12} />
        </button>
      </div>
      {open && mounted && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 w-[260px] rounded-lg border border-bdr bg-sur p-3 shadow-xl"
          style={{top: pos.top, left: pos.left}}
        >
          <div className="mb-2 flex flex-wrap gap-1">
            {lead.labels.length === 0 ? (
              <span className="text-[11px] text-text-3">იარლიყი არ აქვს</span>
            ) : lead.labels.map((label) => (
              <button
                key={label}
                disabled={busy}
                onClick={() => void save(lead.labels.filter((item) => item !== label))}
                className="inline-flex items-center gap-1 rounded-full border border-bdr bg-sur-2 px-2 py-0.5 text-[11px] text-text-2 hover:border-red hover:text-red"
              >
                {label} <X size={10} />
              </button>
            ))}
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add(input);
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="ძიება ან ახალი..."
            autoFocus
            className="mb-2 w-full rounded-md border border-bdr bg-sur-2 px-2 py-1.5 text-[12px] focus:border-blue focus:outline-none"
          />
          <div className="max-h-[240px] space-y-1 overflow-y-auto">
            {available.map((label) => (
              <button
                key={label}
                disabled={busy}
                onClick={() => add(label)}
                className="block w-full rounded-md px-2 py-1 text-left text-[12px] text-text-2 hover:bg-blue-lt hover:text-blue"
              >
                {label}
              </button>
            ))}
            {input.trim() && !available.includes(input.trim()) && (
              <button
                disabled={busy}
                onClick={() => add(input)}
                className="block w-full rounded-md border border-blue-bd bg-blue-lt px-2 py-1 text-left text-[12px] font-semibold text-blue"
              >
                + {input.trim()}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
