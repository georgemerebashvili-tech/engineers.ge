import {CalcGrid} from '@/components/calc-grid';
import {Footer} from '@/components/footer';
import {Hero} from '@/components/hero';
import {HomeStats} from '@/components/home-stats';
import {LegalPills} from '@/components/legal-pills';
import {NavBar} from '@/components/nav-bar';

export default function Page() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Hero />
        <CalcGrid />
        <LegalPills />
        <HomeStats />
      </main>
      <Footer />
    </>
  );
}
