'use client';

import {useEffect, useState} from 'react';

const P = '#1565C0';

type Item = {id: string; sort_order: number; name: string; unit: string; qty: number; labor_note: string | null};
type InviteData = {
  invite: {
    id: string; token: string; status: string; sent_at: string; submitted_at: string | null;
    project: {id: string; project_no: string; name: string; notes: string | null; drive_url: string | null; items: Item[]};
    contact: {id: string; name: string; company: string | null};
  };
  bids: {item_id: string; product_price: number | null; install_price: number | null}[];
};

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export default function TenderTokenPage({params}: {params: {token: string}}) {
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [prices, setPrices] = useState<Record<string, {product: string; install: string}>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/construction/tender/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        const d: InviteData = await res.json();
        setData(d);
        // pre-fill existing bids
        const init: Record<string, {product: string; install: string}> = {};
        for (const b of d.bids) {
          init[b.item_id] = {
            product: b.product_price != null ? String(b.product_price) : '',
            install: b.install_price != null ? String(b.install_price) : ''
          };
        }
        setPrices(init);
        if (d.invite.status === 'submitted') setSubmitted(true);
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  async function submit() {
    if (submitting || !data) return;
    setSubmitting(true);
    const bids = (data.invite.project.items ?? []).map((item) => ({
      item_id: item.id,
      product_price: parseFloat(prices[item.id]?.product ?? '') || null,
      install_price: parseFloat(prices[item.id]?.install ?? '') || null
    }));
    const res = await fetch(`/api/construction/tender/${params.token}/submit`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({bids})
    });
    if (res.ok) setSubmitted(true);
    setSubmitting(false);
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-sm text-slate-400">იტვირთება…</div>
    </div>
  );

  if (notFound) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">ბმული ვერ მოიძებნა</h1>
        <p className="text-sm text-slate-500">ტენდერის ბმული არასწორია ან ვადა გავიდა.</p>
      </div>
    </div>
  );

  if (!data) return null;

  const {invite} = data;
  const project = invite.project;
  const contact = invite.contact;
  const items = (project.items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  if (submitted) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">ფასები წარმატებით გაიგზავნა!</h1>
        <p className="text-sm text-slate-500 mb-4">
          <strong>{contact.name}</strong>, თქვენი შეთავაზება ჩაიბარა. პასუხს მიიღებთ ტენდერის დასრულების შემდეგ.
        </p>
        <div className="bg-slate-50 rounded-lg p-4 text-left text-xs text-slate-500">
          <div className="font-semibold mb-1">პროექტი</div>
          <div>{project.project_no && `${project.project_no} — `}{project.name}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{background: P}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M2 22 12 2l10 20H2z"/><path d="M10 14h4v8h-4z"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">KAYA Construction</div>
              <div className="text-[11px] text-slate-400">ტენდერის მოწვევა</div>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{background: P}}>
            <div className="text-xs text-blue-200 mb-1 uppercase tracking-wider">პროექტი</div>
            <div className="text-white font-bold text-lg">{project.project_no && `${project.project_no} — `}{project.name}</div>
            <div className="text-blue-200 text-xs mt-1">
              მომწოდებელი: <strong className="text-white">{contact.name}</strong>
              {contact.company && <span> · {contact.company}</span>}
            </div>
          </div>
          {project.notes && <p className="mt-3 text-sm text-slate-600">{project.notes}</p>}
        </div>
      </div>

      {/* Price table */}
      <div className="mx-auto max-w-4xl px-4 py-5">
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          ⚠️ გთხოვთ შეავსოთ <strong>თქვენი ფასები</strong> (ყვითელი სვეტები). ველი ჩაივსება ლარებში, ერთეულზე.
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full border-collapse text-[12px]" style={{minWidth: 560}}>
            <thead>
              <tr>
                <th className="border-b border-r border-slate-200 px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-8" style={{background: P}}>#</th>
                <th className="border-b border-r border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white" style={{background: P, minWidth: 180}}>დასახელება</th>
                <th className="border-b border-r border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-14" style={{background: P}}>ერთ.</th>
                <th className="border-b border-r border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-16" style={{background: P}}>რაოდ.</th>
                <th className="border-b border-r border-slate-200 px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white" style={{background: P, minWidth: 80}}>სამ. სახ.</th>
                <th className="border-b border-r border-amber-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50" style={{minWidth: 120}}>📦 პროდ. ფასი (₾)</th>
                <th className="border-b border-amber-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50" style={{minWidth: 120}}>🔧 მონტ. ფასი (₾)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="border-r border-slate-100 px-2 py-2.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="border-r border-slate-100 px-3 py-2.5 font-medium text-slate-900">{item.name}</td>
                  <td className="border-r border-slate-100 px-2 py-2.5 text-center text-slate-500">{item.unit}</td>
                  <td className="border-r border-slate-100 px-2 py-2.5 text-right font-semibold">{item.qty}</td>
                  <td className="border-r border-slate-100 px-2 py-2.5 text-slate-400 text-[11px]">{item.labor_note ?? '—'}</td>
                  <td className="border-r border-amber-100 bg-amber-50 px-2 py-1.5">
                    <input
                      type="number" step="0.01" min="0"
                      placeholder="0.00"
                      value={prices[item.id]?.product ?? ''}
                      onChange={(e) => setPrices((prev) => ({...prev, [item.id]: {...(prev[item.id] ?? {install: ''}), product: e.target.value}}))}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-right text-[12px] font-semibold focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300"
                    />
                  </td>
                  <td className="bg-amber-50 px-2 py-1.5">
                    <input
                      type="number" step="0.01" min="0"
                      placeholder="0.00"
                      value={prices[item.id]?.install ?? ''}
                      onChange={(e) => setPrices((prev) => ({...prev, [item.id]: {...(prev[item.id] ?? {product: ''}), install: e.target.value}}))}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-right text-[12px] font-semibold focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td colSpan={5} className="px-3 py-2.5 text-right text-xs text-slate-500">ჩემი სულ:</td>
                <td className="border-r border-amber-100 bg-amber-50 px-2 py-2.5 text-right font-bold text-amber-700">
                  {fmt(items.reduce((a, item) => a + (parseFloat(prices[item.id]?.product ?? '') || 0) * item.qty, 0))}
                </td>
                <td className="bg-amber-50 px-2 py-2.5 text-right font-bold text-amber-700">
                  {fmt(items.reduce((a, item) => a + (parseFloat(prices[item.id]?.install ?? '') || 0) * item.qty, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl px-8 py-3 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
            style={{background: P}}
          >
            {submitting ? 'იგზავნება…' : '📤 ფასების გაგზავნა'}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          ეს ბმული პერსონალურია და მხოლოდ თქვენთვისაა განკუთვნილი. KAYA Construction · engineers.ge
        </p>
      </div>
    </div>
  );
}
