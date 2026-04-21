export type StoryEvent = {
  id: string;
  year: number;
  title: string;
  description: string;
  image_url?: string;
  accent?: string;
  sort_order?: number;
};

export const STORY_BIRTH_YEAR = 1987;

export function currentStoryYear() {
  return new Date().getFullYear();
}

export const DEFAULT_STORY_EVENTS: StoryEvent[] = [
  {
    id: 'founded-engineers-ge',
    year: 2024,
    title: 'engineers.ge დაფუძნება',
    description: 'ქართული საინჟინრო პლატფორმის დაწყება — უფასო კალკულატორები, Hero რეკლამები, Admin panel.',
    accent: '#1f6fd4'
  },
  {
    id: 'senior-hvac',
    year: 2021,
    title: 'Senior HVAC Engineer',
    description: 'დიდი სამრეწველო პროექტი — ვენტილაცია + გათბობა, EN 12831 აუდიტი.',
    accent: '#1a3a6b'
  },
  {
    id: 'first-project',
    year: 2018,
    title: 'პირველი საკუთარი პროექტი',
    description: 'Commercial building HVAC დიზაინი — თბილისი, 6000 m².',
    accent: '#1f6fd4'
  },
  {
    id: 'university',
    year: 2014,
    title: 'საუნივერსიტეტო დიპლომი',
    description: 'საქ. ტექნიკური უნივერსიტეტი — თბო-ენერგეტიკის ფაკულტეტი.',
    accent: '#1a3a6b'
  },
  {
    id: 'school',
    year: 2005,
    title: 'სკოლის დამთავრება',
    description: '92-ე საჯარო სკოლა, თბილისი.',
    accent: '#1f6fd4'
  }
];

export function sortStoryEventsDesc(events: StoryEvent[]): StoryEvent[] {
  return [...events].sort((a, b) => b.year - a.year);
}
