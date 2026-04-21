import {getStoryEvents} from '@/lib/story-timeline-store';
import {StoryEventsWorkspace} from './workspace';

export const dynamic = 'force-dynamic';

export default async function AdminStoryPage() {
  const events = await getStoryEvents();
  return (
    <div className="p-5 md:p-7">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-navy tracking-tight">storyabout.me · timeline</h1>
        <p className="mt-1 text-sm text-text-2">
          ჩემი გზა — ცხოვრების წლები + აღწერა + სურათი. ჩანს home page-ის hero
          tile-ზე bio popup-ში გვირგვინის ქვეშ.
        </p>
      </header>
      <StoryEventsWorkspace initial={events} />
    </div>
  );
}
