import {NavBar} from '@/components/nav-bar';
import {Footer} from '@/components/footer';
import {Container} from '@/components/container';
import {AdsSimulator} from '@/components/ads-simulator';
import {getHeroAdSlots} from '@/lib/hero-ads-store';

export const metadata = {title: 'რეკლამა · engineers.ge'};
export const dynamic = 'force-dynamic';

export default async function AdsPage() {
  const slots = await getHeroAdSlots();

  return (
    <>
      <NavBar />
      <main className="flex-1 bg-bg">
        <Container className="py-10 md:py-14">
          <AdsSimulator slots={slots} />
        </Container>
      </main>
      <Footer />
    </>
  );
}
