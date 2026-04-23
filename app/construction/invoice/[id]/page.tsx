import {notFound, redirect} from 'next/navigation';
import {canAccessConstructionSite, getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {InvoicePrintButton} from './print-button';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'ხარჯთაღრიცხვა · KAYA Construction',
  robots: {index: false, follow: false}
};

type Site = {
  id: number;
  alias: string | null;
  name: string;
  city: string | null;
  address: string | null;
  kaya_manager: string | null;
  dmt_manager: string | null;
};
type Item = {
  id: number;
  sort_order: number;
  name: string;
  item_type: string | null;
  unit: string | null;
  qty: number;
  price: number;
  total: number;
  note: string | null;
};

export default async function ConstructionInvoicePage({
  params
}: {
  params: Promise<{id: string}>;
}) {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');

  const {id} = await params;
  const siteId = Number(id);
  if (!Number.isFinite(siteId)) notFound();

  const db = supabaseAdmin();

  if (!(await canAccessConstructionSite(db, session, siteId))) {
    redirect('/construction/app');
  }

  const sRes = await db
    .from('construction_sites')
    .select('id, alias, name, city, address, kaya_manager, dmt_manager')
    .eq('id', siteId)
    .maybeSingle<Site>();
  if (!sRes.data) notFound();

  const iRes = await db
    .from('construction_estimate_items')
    .select('id, sort_order, name, item_type, unit, qty, price, total, note')
    .eq('site_id', siteId)
    .order('sort_order', {ascending: true})
    .returns<Item[]>();

  const items = iRes.data || [];
  const grandTotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const site = sRes.data;

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const invoiceNo = `KAYA-${site.id}-${yyyy}${mm}${dd}`;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[800px] bg-white p-12 shadow-xl ring-1 ring-slate-200 print:p-10 print:shadow-none print:ring-0">
        {/* Print action bar */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm print:hidden">
          <a href="/construction/app" className="text-slate-600 hover:text-[#1565C0]">
            ← ინვენტარიზაცია
          </a>
          <InvoicePrintButton />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between border-b-2 border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1565C0] text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 22 12 2l10 20H2z" /><path d="M10 14h4v8h-4z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-slate-900">KAYA Construction</div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">× DMT</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              KAYA Construction ობიექტების ინვენტარიზაცია
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-slate-500">ხარჯთაღრიცხვა</div>
            <div className="font-mono text-sm font-semibold text-slate-900">{invoiceNo}</div>
            <div className="mt-1 font-mono text-xs text-slate-500">{dd}.{mm}.{yyyy}</div>
          </div>
        </div>

        {/* Site info */}
        <div className="mb-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">ობიექტი</div>
            <div className="mt-1 font-semibold text-slate-900">
              {site.alias && <span className="mr-2 font-mono text-[#1565C0]">{site.alias}</span>}
              {site.name}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {site.city}{site.address ? `, ${site.address}` : ''}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">პასუხისმგებელი</div>
            <div className="mt-1 grid gap-0.5 text-xs">
              {site.kaya_manager && (
                <div>
                  <span className="text-slate-500">KAYA: </span>
                  <span className="font-medium text-slate-900">{site.kaya_manager}</span>
                </div>
              )}
              {site.dmt_manager && (
                <div>
                  <span className="text-slate-500">DMT: </span>
                  <span className="font-medium text-slate-900">{site.dmt_manager}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900">
              {['№','დასახელება','ტიპი','განზ.','რაოდ.','ფასი','ჯამი'].map((h, i) => (
                <th key={h} className={`py-2 pr-2 text-xs font-bold uppercase tracking-wider text-slate-700 ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm italic text-slate-400">
                  ცარიელია — დაამატე პოზიცია ინვენტარიზაციის გვერდიდან
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr key={it.id} className="border-b border-slate-200">
                  <td className="py-2 pr-2 font-mono text-xs text-slate-500">{idx + 1}</td>
                  <td className="py-2 pr-2 text-slate-900">
                    {it.name}
                    {it.note && <div className="mt-0.5 text-xs italic text-slate-500">{it.note}</div>}
                  </td>
                  <td className="py-2 pr-2 text-xs text-slate-600">{it.item_type || '—'}</td>
                  <td className="py-2 pr-2 text-xs text-slate-600">{it.unit || '—'}</td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">{Number(it.qty).toLocaleString('ka-GE')}</td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">{Number(it.price).toLocaleString('ka-GE', {minimumFractionDigits: 2})}</td>
                  <td className="py-2 text-right font-mono text-xs font-semibold">{Number(it.total).toLocaleString('ka-GE', {minimumFractionDigits: 2})}</td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-900">
                <td colSpan={6} className="py-3 text-right text-sm font-bold">ჯამი ₾</td>
                <td className="py-3 text-right font-mono text-base font-bold">
                  {grandTotal.toLocaleString('ka-GE', {minimumFractionDigits: 2})}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-2 gap-16 text-xs">
          <div>
            <div className="border-b border-slate-900 pb-1"></div>
            <div className="mt-2 text-slate-500">შემსრულებელი (DMT){site.dmt_manager ? ` · ${site.dmt_manager}` : ''}</div>
          </div>
          <div>
            <div className="border-b border-slate-900 pb-1"></div>
            <div className="mt-2 text-slate-500">დამკვეთი (KAYA){site.kaya_manager ? ` · ${site.kaya_manager}` : ''}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
          engineers.ge/construction · გენერირებულია {dd}.{mm}.{yyyy}
        </div>
      </div>
    </div>
  );
}
