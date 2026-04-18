import {Container} from '@/components/container';
import {AdsSimulator} from '@/components/ads-simulator';
import {getHeroAdSlots} from '@/lib/hero-ads-store';

export const metadata = {title: 'რეკლამა · engineers.ge'};
export const dynamic = 'force-dynamic';

export default async function AdsPage() {
  const slots = await getHeroAdSlots();

  return (
    <Container className="py-4 md:py-5">
      <AdsSimulator slots={slots} />
    </Container>
  );
}
