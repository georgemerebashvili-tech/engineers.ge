import {Container} from './container';
import {HeroTreemap} from './hero-treemap';
import {getHeroAdSlots} from '@/lib/hero-ads-store';

export async function Hero() {
  const slots = await getHeroAdSlots();

  return (
    <section className="relative overflow-hidden">
      <Container className="pt-0 pb-2 md:pt-1 md:pb-3">
        <HeroTreemap slots={slots} />
      </Container>
    </section>
  );
}
