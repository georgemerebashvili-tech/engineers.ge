import {Container} from './container';
import {HeroTreemap} from './hero-treemap';
import {getHeroAdSlots, getHeroOwner} from '@/lib/hero-ads-store';
import {getStoryEvents} from '@/lib/story-timeline-store';
import {getSession} from '@/lib/auth';

export async function Hero() {
  const [slots, owner, storyEvents, session] = await Promise.all([
    getHeroAdSlots(),
    getHeroOwner(),
    getStoryEvents(),
    getSession()
  ]);

  return (
    <section className="relative overflow-hidden">
      <Container className="pt-0 pb-2 md:pt-1 md:pb-3">
        <HeroTreemap
          slots={slots}
          owner={owner}
          storyEvents={storyEvents}
          isAdmin={Boolean(session)}
        />
      </Container>
    </section>
  );
}
