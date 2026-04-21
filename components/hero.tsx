import {Container} from './container';
import {HeroTreemap} from './hero-treemap';
import {getHeroAdSlots, getHeroOwner} from '@/lib/hero-ads-store';

export async function Hero() {
  const [slots, owner] = await Promise.all([getHeroAdSlots(), getHeroOwner()]);

  return (
    <section className="relative overflow-hidden">
      <Container className="pt-0 pb-2 md:pt-1 md:pb-3">
        <HeroTreemap slots={slots} owner={owner} />
      </Container>
    </section>
  );
}
