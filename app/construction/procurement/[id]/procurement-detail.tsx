'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {ConstructionSession} from '@/lib/construction/auth';

const P = '#1565C0';
const SUP_COLORS = ['#1565C0', '#e67e22', '#27ae60', '#8e44ad', '#c0392b', '#16a085', '#d35400', '#2980b9'];

type Project = {
  id: string; project_no: string; name: string; notes: string | null;
  status: string; drive_url: string | null; created_by: string; winner_contact_id: string | null;
};
type Item = {id: string; sort_order: number; name: string; unit: string; qty: number; labor_note: string | null};
type Contact = {id: string; name: string; company: string | null; email: string | null; phone: string | null; category: string | null};
type Participant = {project_id: string; contact_id: string; sort_order: number; contact: Contact};
type Bid = {item_id: string; contact_id: string; product_price: number | null; install_price: number | null};
type Selection = {item_id: string; contact_id: string; price_type: 'product' | 'install'};
type AnnounceResult = {contactId: string; name: string; email: string | null; status: 'sent' | 'no_email' | 'failed'};

const STATUS_LABEL: Record<string, string> = {draft: 'მოლოდინში', open: 'ღია', closed: 'დახურული', awarded: 'დასრულებული'};
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  open: 'bg-blue-50 text-blue-700',
  closed: 'bg-amber-50 text-amber-700',
  awarded: 'bg-green-50 text-green-700'
};

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function bestVal(bids: Bid[], itemId: string, field: 'product_price' | 'install_price', participants: Participant[]) {
  const visIds = new Set(participants.map((p) => p.contact_id));
  const vals = bids
    .filter((b) => b.item_id === itemId && visIds.has(b.contact_id))
    .map((b) => b[field])
    .filter((v): v is number => v != null && v > 0);
  return vals.length ? Math.min(...vals) : null;
}

function bestContactId(bids: Bid[], itemId: string, field: 'product_price' | 'install_price', participants: Participant[]) {
  const visIds = new Set(participants.map((p) => p.contact_id));
  let min = Infinity; let cid: string | null = null;
  for (const b of bids) {
    if (b.item_id !== itemId || !visIds.has(b.contact_id)) continue;
    const v = b[field];
    if (v != null && v > 0 && v < min) { min = v; cid = b.contact_id; }
  }
  return cid;
}

function getBid(bids: Bid[], itemId: string, contactId: string) {
  return bids.find((b) => b.item_id === itemId && b.contact_id === contactId) ?? null;
}

function getSelection(selections: Selection[], itemId: string, type: 'product' | 'install') {
  return selections.find((s) => s.item_id === itemId && s.price_type === type)?.contact_id ?? null;
}

export function ProcurementDetail({projectId, session}: {projectId: string; session: ConstructionSession}) {
  const router = useRouter();
  const isAdmin = session.role === 'admin';

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'product' | 'install' | 'combined' | 'summary' | 'participants'>('product');
  const [toast, setToast] = useState<string | null>(null);

  // edit project header
  const [editingHeader, setEditingHeader] = useState(false);
  const [hNo, setHNo] = useState('');
  const [hName, setHName] = useState('');
  const [hNotes, setHNotes] = useState('');
  const [hDrive, setHDrive] = useState('');
  const [hStatus, setHStatus] = useState('draft');

  // summary params
  const [profitPct, setProfitPct] = useState(20);
  const [overheadPct, setOverheadPct] = useState(5);
  const [discountPct, setDiscountPct] = useState(0);
  const [vatPct, setVatPct] = useState(18);

  // participants tab
  const [addContactId, setAddContactId] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);

  // announce modal
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceSelected, setAnnounceSelected] = useState<string[]>([]);
  const [announcing, setAnnouncing] = useState(false);
  const [announceResults, setAnnounceResults] = useState<AnnounceResult[] | null>(null);

  // inline item editing
  const bidSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [pRes, iRes, partRes, bRes, sRes, cRes] = await Promise.all([
      fetch(`/api/construction/procurement/projects/${projectId}`),
      fetch(`/api/construction/procurement/projects/${projectId}/items`),
      fetch(`/api/construction/procurement/projects/${projectId}/participants`),
      fetch(`/api/construction/procurement/projects/${projectId}/bids`),
      fetch(`/api/construction/procurement/projects/${projectId}/selections`),
      fetch('/api/construction/procurement/contacts')
    ]);
    if (pRes.ok) {
      const d = await pRes.json();
      setProject(d.project);
      setHNo(d.project.project_no ?? '');
      setHName(d.project.name ?? '');
      setHNotes(d.project.notes ?? '');
      setHDrive(d.project.drive_url ?? '');
      setHStatus(d.project.status ?? 'draft');
    }
    if (iRes.ok) setItems((await iRes.json()).items ?? []);
    if (partRes.ok) setParticipants((await partRes.json()).participants ?? []);
    if (bRes.ok) setBids((await bRes.json()).bids ?? []);
    if (sRes.ok) setSelections((await sRes.json()).selections ?? []);
    if (cRes.ok) setAllContacts((await cRes.json()).contacts ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Project header save ──
  async function saveHeader() {
    if (!project) return;
    const res = await fetch(`/api/construction/procurement/projects/${projectId}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({project_no: hNo, name: hName, notes: hNotes, drive_url: hDrive, status: hStatus})
    });
    if (res.ok) {
      const d = await res.json();
      setProject((prev) => prev ? {...prev, ...d.project} : prev);
      setEditingHeader(false);
      flash('შენახულია ✓');
    }
  }

  // ── Item CRUD ──
  async function addItem() {
    const res = await fetch(`/api/construction/procurement/projects/${projectId}/items`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({name: 'ახალი სტრიქონი', unit: 'pcs', qty: 1})
    });
    if (res.ok) { const d = await res.json(); setItems((prev) => [...prev, d.item]); }
  }

  async function updateItem(id: string, field: string, value: string | number) {
    setItems((prev) => prev.map((i) => i.id === id ? {...i, [field]: value} : i));
    clearTimeout(bidSaveTimers.current[`item-${id}-${field}`]);
    bidSaveTimers.current[`item-${id}-${field}`] = setTimeout(async () => {
      await fetch(`/api/construction/procurement/projects/${projectId}/items`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({id, [field]: value})
      });
    }, 600);
  }

  async function deleteItem(id: string) {
    if (!confirm('სტრიქონი წაიშლება. გაგრძელება?')) return;
    await fetch(`/api/construction/procurement/projects/${projectId}/items?item_id=${id}`, {method: 'DELETE'});
    setItems((prev) => prev.filter((i) => i.id !== id));
    setBids((prev) => prev.filter((b) => b.item_id !== id));
    setSelections((prev) => prev.filter((s) => s.item_id !== id));
  }

  // ── Bid save (debounced) ──
  function onBidChange(itemId: string, contactId: string, field: 'product_price' | 'install_price', raw: string) {
    const val = raw === '' ? null : parseFloat(raw) || null;
    setBids((prev) => {
      const existing = prev.find((b) => b.item_id === itemId && b.contact_id === contactId);
      if (existing) return prev.map((b) => b.item_id === itemId && b.contact_id === contactId ? {...b, [field]: val} : b);
      return [...prev, {item_id: itemId, contact_id: contactId, product_price: null, install_price: null, [field]: val}];
    });
    const key = `bid-${itemId}-${contactId}-${field}`;
    clearTimeout(bidSaveTimers.current[key]);
    bidSaveTimers.current[key] = setTimeout(async () => {
      await fetch(`/api/construction/procurement/projects/${projectId}/bids`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({item_id: itemId, contact_id: contactId, [field === 'product_price' ? 'product_price' : 'install_price']: val})
      });
    }, 700);
  }

  // ── Selection toggle ──
  async function toggleSelection(itemId: string, contactId: string, type: 'product' | 'install') {
    const current = getSelection(selections, itemId, type);
    const next = current === contactId ? null : contactId;
    setSelections((prev) => {
      const without = prev.filter((s) => !(s.item_id === itemId && s.price_type === type));
      return next ? [...without, {item_id: itemId, contact_id: next, price_type: type}] : without;
    });
    await fetch(`/api/construction/procurement/projects/${projectId}/selections`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({item_id: itemId, contact_id: next, price_type: type})
    });
  }

  // ── Auto-select best ──
  async function autoBest(type: 'product' | 'install') {
    const field = type === 'product' ? 'product_price' : 'install_price';
    const newSels: Selection[] = [];
    for (const item of items) {
      const cid = bestContactId(bids, item.id, field, participants);
      if (cid) newSels.push({item_id: item.id, contact_id: cid, price_type: type});
    }
    setSelections((prev) => {
      const without = prev.filter((s) => s.price_type !== type);
      return [...without, ...newSels];
    });
    for (const s of newSels) {
      await fetch(`/api/construction/procurement/projects/${projectId}/selections`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({item_id: s.item_id, contact_id: s.contact_id, price_type: type})
      });
    }
    flash('ავტო-შერჩევა შესრულდა ✓');
  }

  // ── Participants ──
  async function addParticipant() {
    if (!addContactId || addingParticipant) return;
    setAddingParticipant(true);
    const res = await fetch(`/api/construction/procurement/projects/${projectId}/participants`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({contact_id: addContactId})
    });
    if (res.ok) {
      setAddContactId('');
      const partRes = await fetch(`/api/construction/procurement/projects/${projectId}/participants`);
      if (partRes.ok) setParticipants((await partRes.json()).participants ?? []);
    }
    setAddingParticipant(false);
  }

  async function removeParticipant(contactId: string) {
    if (!confirm('ამოიღოს მომწოდებელი?')) return;
    await fetch(`/api/construction/procurement/projects/${projectId}/participants?contact_id=${contactId}`, {method: 'DELETE'});
    setParticipants((prev) => prev.filter((p) => p.contact_id !== contactId));
  }

  // ── Announce ──
  async function sendAnnouncements() {
    if (announcing || announceSelected.length === 0) return;
    setAnnouncing(true);
    const res = await fetch(`/api/construction/procurement/projects/${projectId}/announce`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({contact_ids: announceSelected})
    });
    if (res.ok) {
      const d = await res.json();
      setAnnounceResults(d.results);
      if (project?.status === 'draft') setProject((prev) => prev ? {...prev, status: 'open'} : prev);
    }
    setAnnouncing(false);
  }

  // ── Computed totals ──
  function totals() {
    let bestProd = 0, selProd = 0, bestInst = 0, selInst = 0;
    for (const item of items) {
      const bv = bestVal(bids, item.id, 'product_price', participants);
      if (bv != null) bestProd += bv * item.qty;
      const sv = getSelection(selections, item.id, 'product');
      if (sv) { const b = getBid(bids, item.id, sv); if (b?.product_price) selProd += b.product_price * item.qty; }
      const bi = bestVal(bids, item.id, 'install_price', participants);
      if (bi != null) bestInst += bi * item.qty;
      const si = getSelection(selections, item.id, 'install');
      if (si) { const b = getBid(bids, item.id, si); if (b?.install_price) selInst += b.install_price * item.qty; }
    }
    const selCombined = selProd + selInst;
    const profit = selCombined * profitPct / 100;
    const overhead = selCombined * overheadPct / 100;
    const revenue = (selCombined + profit + overhead) * (1 - discountPct / 100);
    const finalPrice = revenue * (1 + vatPct / 100);
    return {bestProd, selProd, bestInst, selInst, selCombined, profit, overhead, revenue, finalPrice};
  }

  const T = totals();

  function supColor(idx: number) { return SUP_COLORS[idx % SUP_COLORS.length]; }

  // ── Pricing grid (product or install) ──
  function PricingGrid({type}: {type: 'product' | 'install'}) {
    const field = type === 'product' ? 'product_price' : 'install_price';
    const selType = type as 'product' | 'install';

    return (
      <div className="flex-1 overflow-auto">
        {isAdmin && (
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
            <button onClick={addItem} className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white" style={{background: P}}>
              + სტრიქონი
            </button>
            <button onClick={() => autoBest(type)} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
              ⚡ ავტო-შერჩევა (საუკეთესო)
            </button>
          </div>
        )}
        {items.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">სტრიქონი არ არის. დაამატე პირველი!</div>
        ) : (
          <table className="w-full border-collapse text-[12px]" style={{minWidth: 200 + participants.length * 110}}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-[#1565C0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white" style={{minWidth: 28}}>#</th>
                <th className="sticky left-7 z-10 border-b border-r border-slate-200 bg-[#1565C0] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white" style={{minWidth: 160}}>დასახელება</th>
                <th className="border-b border-r border-slate-200 bg-[#1565C0] px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white" style={{width: 44}}>ერთ.</th>
                <th className="border-b border-r border-slate-200 bg-[#1565C0] px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white" style={{width: 52}}>რაოდ.</th>
                <th className="border-b border-r border-slate-200 bg-[#1565C0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white" style={{minWidth: 80}}>სამუშაო</th>
                <th className="border-b border-r border-slate-200 bg-green-700 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-white" style={{minWidth: 76}}>საუკ. ფასი</th>
                <th className="border-b border-r border-slate-200 bg-amber-700 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-white" style={{minWidth: 76}}>ჩემი არჩ.</th>
                {participants.map((p, idx) => (
                  <th key={p.contact_id} className="border-b border-r border-slate-200 px-2 py-2 text-center text-[10px] font-bold text-white whitespace-nowrap" style={{minWidth: 100, background: supColor(idx)}}>
                    {p.contact.name}
                  </th>
                ))}
                {isAdmin && <th className="border-b border-slate-200 bg-[#1565C0] px-2 py-2" style={{width: 28}}></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const bv = bestVal(bids, item.id, field, participants);
                const bestCid = bestContactId(bids, item.id, field, participants);
                const selCid = getSelection(selections, item.id, selType);
                const selBid = selCid ? getBid(bids, item.id, selCid) : null;
                const selPrice = selBid ? selBid[field] : null;

                return (
                  <tr key={item.id} className="group border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-2 py-1.5 text-center text-slate-400 group-hover:bg-slate-50/70">{idx + 1}</td>
                    <td className="sticky left-7 z-10 border-r border-slate-100 bg-white px-2 py-1.5 group-hover:bg-slate-50/70">
                      {isAdmin ? (
                        <input
                          className="w-full border-0 bg-transparent text-[12px] font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-b focus:border-[#1565C0]"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        />
                      ) : (
                        <span className="font-medium text-slate-900">{item.name}</span>
                      )}
                    </td>
                    <td className="border-r border-slate-100 px-1 py-1.5 text-center">
                      {isAdmin ? (
                        <input className="w-10 rounded border border-transparent text-center text-[11px] hover:border-slate-200 focus:border-[#1565C0] focus:outline-none" value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} />
                      ) : item.unit}
                    </td>
                    <td className="border-r border-slate-100 px-1 py-1.5 text-right">
                      {isAdmin ? (
                        <input type="number" className="w-12 rounded border border-transparent text-right text-[11px] hover:border-slate-200 focus:border-[#1565C0] focus:outline-none" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 1)} />
                      ) : item.qty}
                    </td>
                    <td className="border-r border-slate-100 px-2 py-1.5 text-slate-500">
                      {isAdmin ? (
                        <input className="w-full border-0 bg-transparent text-[11px] text-slate-500 focus:outline-none" value={item.labor_note ?? ''} placeholder="სამუშაო სახეობა" onChange={(e) => updateItem(item.id, 'labor_note', e.target.value)} />
                      ) : (item.labor_note ?? '—')}
                    </td>
                    {/* Best price */}
                    <td className="border-r border-slate-100 bg-green-50 px-2 py-1.5 text-right font-bold text-green-700">{fmt(bv)}</td>
                    {/* My selection */}
                    <td className="border-r border-slate-100 bg-amber-50 px-2 py-1.5 text-right font-bold text-amber-700">{selPrice != null ? fmt(selPrice) : '—'}</td>
                    {/* Per-supplier cells */}
                    {participants.map((p, pidx) => {
                      const bid = getBid(bids, item.id, p.contact_id);
                      const price = bid ? bid[field] : null;
                      const isBest = p.contact_id === bestCid && price != null && price > 0;
                      const isSel = p.contact_id === selCid;
                      return (
                        <td key={p.contact_id}
                          className={`border-r border-slate-100 px-1 py-1.5 text-right transition ${isBest ? 'bg-green-50' : isSel ? 'bg-amber-50' : ''}`}
                        >
                          {isAdmin ? (
                            <div className="flex items-center gap-0.5 justify-end">
                              <input
                                type="number" step="0.01" min="0"
                                className={`w-20 rounded border text-right text-[11px] px-1 py-0.5 focus:outline-none focus:border-[#1565C0] ${isBest ? 'border-green-200 bg-green-50 text-green-700 font-bold' : isSel ? 'border-amber-200 bg-amber-50 font-semibold' : 'border-transparent hover:border-slate-200'}`}
                                value={price ?? ''}
                                placeholder="—"
                                onChange={(e) => onBidChange(item.id, p.contact_id, field, e.target.value)}
                              />
                              <button
                                onClick={() => toggleSelection(item.id, p.contact_id, selType)}
                                title={isSel ? 'გაუქმება' : 'არჩევა'}
                                className={`ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] transition ${isSel ? 'text-amber-700' : 'text-slate-300 hover:text-amber-500'}`}
                                style={{color: isSel ? supColor(pidx) : undefined}}
                              >
                                {isSel ? '★' : '☆'}
                              </button>
                            </div>
                          ) : (
                            <span className={isBest ? 'font-bold text-green-700' : isSel ? 'font-semibold text-amber-700' : 'text-slate-600'}>
                              {price != null && price > 0 ? fmt(price) : '—'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {isAdmin && (
                      <td className="px-1 py-1.5 text-center">
                        <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 text-[13px]">✕</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#1565C0] bg-blue-50 font-bold">
                <td colSpan={5} className="px-3 py-2 text-right text-xs text-slate-500">სულ</td>
                <td className="border-r border-slate-200 px-2 py-2 text-right text-green-700">
                  {fmt(items.reduce((a, item) => { const bv = bestVal(bids, item.id, field, participants); return a + (bv ?? 0) * item.qty; }, 0))}
                </td>
                <td className="border-r border-slate-200 px-2 py-2 text-right text-amber-700">
                  {fmt(items.reduce((a, item) => { const sc = getSelection(selections, item.id, selType); const b = sc ? getBid(bids, item.id, sc) : null; const p2 = b ? b[field] : null; return a + (p2 ?? 0) * item.qty; }, 0))}
                </td>
                {participants.map((p) => (
                  <td key={p.contact_id} className="border-r border-slate-200 px-2 py-2 text-right text-slate-700">
                    {fmt(items.reduce((a, item) => { const b = getBid(bids, item.id, p.contact_id); const v = b ? b[field] : null; return a + (v ?? 0) * item.qty; }, 0))}
                  </td>
                ))}
                {isAdmin && <td></td>}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    );
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-sm text-slate-400">იტვირთება…</div>
    </div>
  );

  if (!project) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-sm text-red-500">პროექტი ვერ მოიძებნა</div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-white" style={{background: P}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M2 22 12 2l10 20H2z"/><path d="M10 14h4v8h-4z"/>
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {editingHeader ? (
            <div className="flex flex-wrap gap-2 items-center">
              <input className="rounded border border-slate-200 px-2 py-1 text-xs w-28 focus:border-[#1565C0] focus:outline-none" value={hNo} onChange={(e) => setHNo(e.target.value)} placeholder="PRJ-NO" />
              <input className="rounded border border-slate-200 px-2 py-1 text-xs flex-1 min-w-32 focus:border-[#1565C0] focus:outline-none" value={hName} onChange={(e) => setHName(e.target.value)} placeholder="სახელი" />
              <select className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-[#1565C0] focus:outline-none" value={hStatus} onChange={(e) => setHStatus(e.target.value)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="rounded border border-slate-200 px-2 py-1 text-xs w-40 focus:border-[#1565C0] focus:outline-none" value={hDrive} onChange={(e) => setHDrive(e.target.value)} placeholder="Drive URL" />
              <button onClick={saveHeader} className="rounded px-3 py-1 text-xs font-semibold text-white" style={{background: P}}>შენახვა</button>
              <button onClick={() => setEditingHeader(false)} className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600">გაუქმება</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              {project.project_no && <span className="font-mono text-xs text-slate-400">{project.project_no}</span>}
              <span className="font-bold text-slate-900 truncate">{project.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${STATUS_COLOR[project.status] ?? STATUS_COLOR.draft}`}>{STATUS_LABEL[project.status] ?? project.status}</span>
              {project.drive_url && (
                <a href={project.drive_url} target="_blank" rel="noopener noreferrer" className="text-[#1565C0] hover:underline text-xs flex-shrink-0">📁 Drive</a>
              )}
              {isAdmin && (
                <button onClick={() => setEditingHeader(true)} className="rounded px-2 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100">✏️ რედ.</button>
              )}
            </div>
          )}
        </div>
        <div className="ml-auto flex flex-shrink-0 items-center gap-2 text-xs">
          <Link href="/construction/procurement" className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">← სია</Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-shrink-0 items-center gap-0 border-b border-slate-200 bg-white px-3 overflow-x-auto">
        {([['product', '📦 პროდუქცია'], ['install', '🔧 მონტაჟი'], ['combined', '📊 კომბინ.'], ['summary', '📋 შეჯამება'], ['participants', '👥 მომწოდ.']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-[12px] font-semibold transition-colors ${tab === key ? 'border-[#1565C0] text-[#1565C0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {tab === 'product' && <PricingGrid type="product" />}
        {tab === 'install' && <PricingGrid type="install" />}

        {tab === 'combined' && (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="border-b border-r border-slate-200 bg-[#1565C0] px-2 py-2 text-left text-[10px] font-bold text-white" style={{width: 28}}>#</th>
                  <th className="border-b border-r border-slate-200 bg-[#1565C0] px-3 py-2 text-left text-[10px] font-bold text-white" style={{minWidth: 160}}>დასახელება</th>
                  <th className="border-b border-r border-slate-200 bg-[#1565C0] px-2 py-2 text-center text-[10px] font-bold text-white" style={{width: 44}}>ერთ.</th>
                  <th className="border-b border-r border-slate-200 bg-[#1565C0] px-2 py-2 text-center text-[10px] font-bold text-white" style={{width: 52}}>რაოდ.</th>
                  <th className="border-b border-r border-slate-200 bg-green-700 px-2 py-2 text-center text-[10px] font-bold text-white">პ. მომწ.</th>
                  <th className="border-b border-r border-slate-200 bg-green-700 px-2 py-2 text-right text-[10px] font-bold text-white">პ. ფასი</th>
                  <th className="border-b border-r border-slate-200 bg-amber-600 px-2 py-2 text-center text-[10px] font-bold text-white">მ. მომწ.</th>
                  <th className="border-b border-r border-slate-200 bg-amber-600 px-2 py-2 text-right text-[10px] font-bold text-white">მ. ფასი</th>
                  <th className="border-b border-r border-slate-200 bg-slate-700 px-2 py-2 text-right text-[10px] font-bold text-white">კომბ.</th>
                  <th className="border-b border-slate-200 bg-slate-900 px-2 py-2 text-right text-[10px] font-bold text-white">სულ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const pSelCid = getSelection(selections, item.id, 'product');
                  const iSelCid = getSelection(selections, item.id, 'install');
                  const pBid = pSelCid ? getBid(bids, item.id, pSelCid) : null;
                  const iBid = iSelCid ? getBid(bids, item.id, iSelCid) : null;
                  const pp = pBid?.product_price ?? null;
                  const ip = iBid?.install_price ?? null;
                  const combined = (pp ?? 0) + (ip ?? 0);
                  const total = combined * item.qty;
                  const pPart = participants.find((p) => p.contact_id === pSelCid);
                  const iPart = participants.find((p) => p.contact_id === iSelCid);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="border-r border-slate-100 px-2 py-1.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="border-r border-slate-100 px-3 py-1.5 font-medium text-slate-900">{item.name}</td>
                      <td className="border-r border-slate-100 px-2 py-1.5 text-center text-slate-500">{item.unit}</td>
                      <td className="border-r border-slate-100 px-2 py-1.5 text-right font-semibold">{item.qty}</td>
                      <td className="border-r border-slate-100 bg-green-50 px-2 py-1.5 text-center text-[11px] text-green-700">{pPart ? pPart.contact.name : '—'}</td>
                      <td className="border-r border-slate-100 bg-green-50 px-2 py-1.5 text-right font-bold text-green-700">{pp != null ? fmt(pp) : '—'}</td>
                      <td className="border-r border-slate-100 bg-amber-50 px-2 py-1.5 text-center text-[11px] text-amber-700">{iPart ? iPart.contact.name : '—'}</td>
                      <td className="border-r border-slate-100 bg-amber-50 px-2 py-1.5 text-right font-bold text-amber-700">{ip != null ? fmt(ip) : '—'}</td>
                      <td className="border-r border-slate-100 px-2 py-1.5 text-right font-semibold text-slate-700">{combined > 0 ? fmt(combined) : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-[#1565C0]">{total > 0 ? fmt(total) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1565C0] bg-blue-50 font-bold">
                  <td colSpan={9} className="px-3 py-2 text-right text-xs text-slate-500">სულ ჯამი</td>
                  <td className="px-2 py-2 text-right text-[14px] text-[#1565C0]">{fmt(T.selCombined)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {tab === 'summary' && (
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {/* Main total card */}
            <div className="rounded-xl p-5 text-white flex justify-between items-center" style={{background: P}}>
              <div>
                <div className="text-xs opacity-70 mb-1">არჩეული კომბინ. ჯამი</div>
                <div className="text-3xl font-bold">{fmt(T.selCombined)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-70 mb-1">საბოლოო ფასი (+დღგ)</div>
                <div className="text-2xl font-bold">{fmt(T.finalPrice)}</div>
              </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                {l: 'საუკ. პროდ.', v: T.bestProd, c: ''},
                {l: 'არჩ. პროდ.', v: T.selProd, c: 'bg-amber-50 border-amber-200'},
                {l: 'საუკ. მონტ.', v: T.bestInst, c: ''},
                {l: 'არჩ. მონტ.', v: T.selInst, c: 'bg-amber-50 border-amber-200'},
                {l: 'კომბინ.', v: T.selCombined, c: 'bg-blue-50 border-blue-200 text-[#1565C0]'},
                {l: 'მოგება', v: T.profit, c: 'bg-green-50 border-green-200 text-green-700'},
                {l: 'ადმინ. ხარჯ.', v: T.overhead, c: ''},
                {l: 'შემოსავ.', v: T.revenue, c: 'bg-blue-50 border-blue-200 text-[#1565C0]'},
                {l: '+დღგ', v: T.finalPrice, c: 'bg-blue-50 border-blue-200 text-[#1565C0]'},
              ].map((card, i) => (
                <div key={i} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${card.c}`}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.l}</div>
                  <div className={`text-lg font-bold ${card.c.includes('text-') ? '' : 'text-slate-900'}`}>{fmt(card.v)}</div>
                </div>
              ))}
            </div>

            {/* Params */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider" style={{color: P}}>პარამეტრები</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  {l: 'მოგება %', v: profitPct, set: setProfitPct},
                  {l: 'ადმინ. ხარჯ. %', v: overheadPct, set: setOverheadPct},
                  {l: 'ფასდაკლ. %', v: discountPct, set: setDiscountPct},
                  {l: 'დღგ %', v: vatPct, set: setVatPct}
                ].map((f) => (
                  <div key={f.l}>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">{f.l}</label>
                    <input
                      type="number" min="0" step="0.5"
                      value={f.v}
                      onChange={(e) => f.set(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'participants' && (
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {isAdmin && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-slate-900">მომწოდებლის დამატება</h3>
                <div className="flex gap-3">
                  <select
                    value={addContactId}
                    onChange={(e) => setAddContactId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none"
                  >
                    <option value="">— კონტაქტი —</option>
                    {allContacts
                      .filter((c) => !participants.find((p) => p.contact_id === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                      ))}
                  </select>
                  <button
                    onClick={addParticipant}
                    disabled={!addContactId || addingParticipant}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{background: P}}
                  >
                    + დამატება
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-sm font-bold text-slate-900">მონაწილეები</span>
                <span className="text-xs text-slate-400">{participants.length}</span>
              </div>
              {participants.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">ჯერ მომწოდებელი არ დაემატა</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {participants.map((p, idx) => (
                    <div key={p.contact_id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{background: supColor(idx)}}>
                        {p.contact.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900">{p.contact.name}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {p.contact.company && <span>{p.contact.company} · </span>}
                          {p.contact.email && <span>{p.contact.email}</span>}
                          {p.contact.phone && <span> · {p.contact.phone}</span>}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => removeParticipant(p.contact_id)}
                          className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50"
                        >
                          ✕ ამოღება
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && participants.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-slate-900">📨 ტენდერის გამოცხადება</h3>
                <p className="mb-4 text-xs text-slate-500">
                  არჩეულ მომწოდებლებს გაეგზავნებათ ელფოსტა უნიკალური ბმულით, სადაც შეავსებენ თავიანთ ფასებს.
                </p>
                <div className="mb-3 space-y-2">
                  {participants.map((p, idx) => (
                    <label key={p.contact_id} className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#1565C0]"
                        checked={announceSelected.includes(p.contact_id)}
                        onChange={(e) => setAnnounceSelected((prev) =>
                          e.target.checked ? [...prev, p.contact_id] : prev.filter((id) => id !== p.contact_id)
                        )}
                      />
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{background: supColor(idx)}}>
                        {p.contact.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 text-sm font-medium text-slate-900">{p.contact.name}</div>
                      {p.contact.email ? (
                        <span className="text-xs text-slate-400">{p.contact.email}</span>
                      ) : (
                        <span className="text-xs text-red-400">ელ-ფოსტა არ არის</span>
                      )}
                    </label>
                  ))}
                </div>
                {announceResults && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                    {announceResults.map((r) => (
                      <div key={r.contactId} className="flex items-center gap-2 text-xs">
                        <span className={`font-bold ${r.status === 'sent' ? 'text-green-600' : r.status === 'no_email' ? 'text-amber-600' : 'text-red-500'}`}>
                          {r.status === 'sent' ? '✓' : r.status === 'no_email' ? '!' : '✕'}
                        </span>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-slate-400">{r.status === 'sent' ? 'გაიგზავნა' : r.status === 'no_email' ? 'ელ-ფოსტა არ არის' : 'შეცდომა'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={sendAnnouncements}
                  disabled={announcing || announceSelected.length === 0}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{background: P}}
                >
                  {announcing ? 'იგზავნება…' : `📨 ტენდერი გამოვაცხადო (${announceSelected.length})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg" style={{background: P}}>
          {toast}
        </div>
      )}
    </div>
  );
}
