import {BannersSection} from '@/components/banners-section';
import {CalcGrid} from '@/components/calc-grid';
import {Footer} from '@/components/footer';
import {Hero} from '@/components/hero';
import {NavBar} from '@/components/nav-bar';

export default function Page() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Hero />
        <BannersSection />
        <CalcGrid />
      </main>
      <Footer />
    </>
  );
}
