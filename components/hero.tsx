import {Container} from './container';
import {HeroTreemap} from './hero-treemap';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <Container className="pt-0 pb-6 md:pt-1 md:pb-8">
        <HeroTreemap />
      </Container>
    </section>
  );
}
