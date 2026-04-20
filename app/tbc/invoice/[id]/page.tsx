import {notFound, redirect} from 'next/navigation';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {InvoicePrintButton} from './print-button';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'ხარჯთაღრიცხვა · TBC ინვენტარიზაცია',
  robots: {index: false, follow: false}
};

type Branch = {
  id: number;
  alias: string | null;
  name: string;
  city: string | null;
  address: string | null;
  tbc_manager: string | null;
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

export default async function InvoicePage({
  params
}: {
  params: Promise<{id: string}>;
}) {
  const session = await getTbcSession();
  if (!session) redirect('/tbc');

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId)) notFound();

  const db = supabaseAdmin();

  if (session.role !== 'admin') {
    const perms = await db
      .from('tbc_branch_permissions')
      .select('branch_id')
      .eq('user_id', session.uid);
    const rows = perms.data || [];
    const seeAll = rows.some((r) => r.branch_id == null);
    const has = rows.some((r) => r.branch_id === branchId);
    if (!seeAll && !has) redirect('/tbc/app');
  }

  const bRes = await db
    .from('tbc_branches')
    .select('id, alias, name, city, address, tbc_manager, dmt_manager')
    .eq('id', branchId)
    .maybeSingle<Branch>();
  if (!bRes.data) notFound();

  const iRes = await db
    .from('tbc_estimate_items')
    .select('id, sort_order, name, item_type, unit, qty, price, total, note')
    .eq('branch_id', branchId)
    .order('sort_order', {ascending: true})
    .returns<Item[]>();

  const items = iRes.data || [];
  const grandTotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const branch = bRes.data;

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const invoiceNo = `DMT-${branch.id}-${yyyy}${mm}${dd}`;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[800px] bg-white p-12 shadow-xl ring-1 ring-slate-200 print:p-10 print:shadow-none print:ring-0">
        {/* Print action bar */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm print:hidden">
          <a href={`/tbc/app`} className="text-slate-600 hover:text-[#0071CE]">
            ← ინვენტარიზაცია
          </a>
          <InvoicePrintButton />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between border-b-2 border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <img src="/tbc/logos/tbc.svg" alt="TBC" className="h-9 w-auto" />
              <span className="text-slate-400">×</span>
              <img src="/tbc/logos/dmt.png" alt="DMT" className="h-8 w-auto" />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              TBC ფილიალების ინვენტარიზაცია
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              ხარჯთაღრიცხვა
            </div>
            <div className="font-mono text-sm font-semibold text-slate-900">
              {invoiceNo}
            </div>
            <div className="mt-1 font-mono text-xs text-slate-500">
              {dd}.{mm}.{yyyy}
            </div>
          </div>
        </div>

        {/* Branch info */}
        <div className="mb-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              ობიექტი
            </div>
            <div className="mt-1 font-semibold text-slate-900">
              {branch.alias && (
                <span className="mr-2 font-mono text-[#0071CE]">
                  {branch.alias}
                </span>
              )}
              {branch.name}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {branch.city}
              {branch.address ? `, ${branch.address}` : ''}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              პასუხისმგებელი
            </div>
            <div className="mt-1 grid gap-0.5 text-xs">
              {branch.tbc_manager && (
                <div>
                  <span className="text-slate-500">TBC: </span>
                  <span className="font-medium text-slate-900">
                    {branch.tbc_manager}
                  </span>
                </div>
              )}
              {branch.dmt_manager && (
                <div>
                  <span className="text-slate-500">DMT: </span>
                  <span className="font-medium text-slate-900">
                    {branch.dmt_manager}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-2 pr-2 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                №
              </th>
              <th className="py-2 pr-2 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                დასახელება
              </th>
              <th className="py-2 pr-2 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                ტიპი
              </th>
              <th className="py-2 pr-2 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                განზ.
              </th>
              <th className="py-2 pr-2 text-right text-xs font-bold uppercase tracking-wider text-slate-700">
                რაოდ.
              </th>
              <th className="py-2 pr-2 text-right text-xs font-bold uppercase tracking-wider text-slate-700">
                ფასი
              </th>
              <th className="py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-700">
                ჯამი
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-sm italic text-slate-400"
                >
                  ცარიელია — დაამატე პოზიცია ინვენტარიზაციის გვერდიდან
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr key={it.id} className="border-b border-slate-200">
                  <td className="py-2 pr-2 font-mono text-xs text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2 pr-2 text-slate-900">
                    {it.name}
                    {it.note && (
                      <div className="mt-0.5 text-xs italic text-slate-500">
                        {it.note}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-xs text-slate-600">
                    {it.item_type || '—'}
                  </td>
                  <td className="py-2 pr-2 text-xs text-slate-600">
                    {it.unit || '—'}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {Number(it.qty).toLocaleString('ka-GE')}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {Number(it.price).toLocaleString('ka-GE', {
                      minimumFractionDigits: 2
                    })}
                  </td>
                  <td className="py-2 text-right font-mono text-xs font-semibold">
                    {Number(it.total).toLocaleString('ka-GE', {
                      minimumFractionDigits: 2
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-900">
                <td colSpan={6} className="py-3 text-right text-sm font-bold">
                  ჯამი ₾
                </td>
                <td className="py-3 text-right font-mono text-base font-bold">
                  {grandTotal.toLocaleString('ka-GE', {
                    minimumFractionDigits: 2
                  })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-2 gap-16 text-xs">
          <div>
            <div className="border-b border-slate-900 pb-1"></div>
            <div className="mt-2 text-slate-500">
              შემსრულებელი (DMT){branch.dmt_manager ? ` · ${branch.dmt_manager}` : ''}
            </div>
          </div>
          <div>
            <div className="border-b border-slate-900 pb-1"></div>
            <div className="mt-2 text-slate-500">
              დამკვეთი (TBC){branch.tbc_manager ? ` · ${branch.tbc_manager}` : ''}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
          engineers.ge/tbc · გენერირებულია {dd}.{mm}.{yyyy}
        </div>
      </div>
    </div>
  );
}
