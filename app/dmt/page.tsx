import Link from 'next/link';
import {FileText, Package, TrendingUp} from 'lucide-react';

const STATS = [
  {
    label: 'ინვოისები · ღია',
    value: '12',
    sub: '₾ 48,320 გადასახდელი',
    href: '/dmt/invoices',
    icon: FileText,
    trend: '+3 ამ კვირას'
  },
  {
    label: 'ინვენტარი · SKU',
    value: '284',
    sub: '6 SKU ≤ minimum',
    href: '/dmt/inventory',
    icon: Package,
    trend: '2 შეკვეთა pending'
  }
];

export default function DmtHomePage() {
  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <header className="mb-6">
        <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          DASHBOARD
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          მიმოხილვა
        </h1>
        <p className="mt-1 text-sm text-text-2">
          ინვოისები, ინვენტარიზაცია — ერთ ადგილას.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-[12px] border border-bdr bg-sur p-5 transition-all hover:-translate-y-0.5 hover:border-blue hover:shadow-[0_4px_16px_rgba(0,0,0,.08)]"
            >
              <div className="flex items-start justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-blue-lt text-blue">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 font-mono text-[10px] font-semibold text-grn">
                  <TrendingUp size={11} />
                  {s.trend}
                </span>
              </div>
              <div className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-3">
                {s.label}
              </div>
              <div className="mt-1 text-3xl font-bold tracking-tight text-navy group-hover:text-blue">
                {s.value}
              </div>
              <div className="mt-1 text-[12px] text-text-2">{s.sub}</div>
            </Link>
          );
        })}
      </div>

      <section className="mt-8 rounded-[12px] border border-bdr bg-sur p-5">
        <h2 className="mb-3 text-sm font-bold text-navy">სწრაფი მოქმედებები</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dmt/invoices"
            className="rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          >
            + ახალი ინვოისი
          </Link>
          <Link
            href="/dmt/inventory"
            className="rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          >
            + SKU-ს რეგისტრაცია
          </Link>
        </div>
      </section>
    </div>
  );
}
