import Link from 'next/link';
import {Megaphone} from 'lucide-react';
import {CalcGrid} from '@/components/calc-grid';
import {Container} from '@/components/container';
import {Footer} from '@/components/footer';
import {NavBar} from '@/components/nav-bar';

const AD_SLOTS = [1, 2, 3, 4, 5];

export default function DashboardPage() {
  return (
    <>
      <NavBar />
      <main className="flex-1 bg-bg">
        <section className="border-b border-bdr bg-sur py-6">
          <Container>
            <nav aria-label="breadcrumb" className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-3">
              <Link href="/" className="hover:text-blue transition-colors">
                მთავარი
              </Link>
              <span>·</span>
              <span className="text-navy">მიმოხილვა</span>
            </nav>
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">
              ხელსაწყოების დეშბორდი
            </h1>
            <p className="mt-1 text-[12px] text-text-2">
              ყველა საჯარო კალკულატორი ერთ ადგილას — გამოიყენე უფასოდ.
            </p>
          </Container>
        </section>

        <section className="py-6">
          <Container>
            <header className="mb-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-navy">
                SPONSORED
              </p>
              <h2 className="mt-0.5 text-[15px] font-bold text-navy">სარეკლამო სივრცე</h2>
            </header>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
              {AD_SLOTS.map((i) => (
                <div
                  key={i}
                  role="region"
                  aria-label={`რეკლამის სლოტი ${i}`}
                  className="flex h-24 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-bdr-2 bg-sur text-text-3 transition-colors hover:border-blue hover:text-blue"
                >
                  <Megaphone size={16} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                    რეკლამა {i}
                  </span>
                  <span className="text-[9px] opacity-70">320 × 96</span>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <CalcGrid />
      </main>
      <Footer />
    </>
  );
}
