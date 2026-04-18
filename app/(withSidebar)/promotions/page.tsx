import Link from 'next/link';
import {Tag, Sparkles, Clock} from 'lucide-react';

export const metadata = {title: 'აქციები · engineers.ge'};

export default function PromotionsPage() {
  return (
    <>
      <section className="border-b border-bdr bg-sur py-6">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <nav
            aria-label="breadcrumb"
            className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-3"
          >
            <Link href="/" className="hover:text-blue transition-colors">
              მთავარი
            </Link>
            <span>·</span>
            <Link href="/dashboard" className="hover:text-blue transition-colors">
              დეშბორდი
            </Link>
            <span>·</span>
            <span className="text-navy">აქციები</span>
          </nav>
          <h1 className="text-[20px] md:text-[24px] font-bold text-navy flex items-center gap-2">
            <Tag size={22} strokeWidth={2} className="text-blue" />
            აქციები
          </h1>
          <p className="mt-1 text-[12px] text-text-2">
            საინჟინრო მომსახურების, ხელსაწყოების და პარტნიორული ფასდაკლებების
            მიმდინარე შეთავაზებები.
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div className="rounded-card border border-dashed border-bdr-2 bg-sur p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-lt text-blue">
              <Sparkles size={22} strokeWidth={2} />
            </div>
            <h2 className="text-[16px] font-bold text-navy">
              აქციები მალე გაივრცელდება
            </h2>
            <p className="mt-1.5 text-[13px] text-text-2">
              ამ სივრცეში გამოჩნდება მიმდინარე ფასდაკლებები, სპეციალური
              შეთავაზებები და შეზღუდული დროის აქციები ჩვენი პარტნიორებისგან.
            </p>
            <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur-2 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-text-3">
              <Clock size={12} />
              მზადების პროცესში
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
