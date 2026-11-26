/**
 * Text and data of /georgemerebashvili, ported from the owner's supplied design
 * (data-ka / data-en pairs in the markup, timelineData / expertiseItems in its script).
 *
 * Placeholders are not shown (owner's word, 27.11.2026): a year without real content is not offered
 * on the strip, and a section without real items (gallery, awards) renders nothing and drops its nav
 * link. The data shapes stay, so adding a year to TIMELINE_DATA / MILESTONES, an item to
 * GALLERY_ITEMS or a card to AWARD_ITEMS brings it back without touching a component. Nothing here
 * may be invented: only what the owner stated or what is verified goes in. The design's "KAIA" was
 * corrected to "KAYA" on the owner's word (27.11.2026).
 */

export type Lang = 'ka' | 'en';
export type Bilingual = {ka: string; en: string};

export const pick = (text: Bilingual, lang: Lang): string => text[lang];

/** Plain strings (e.g. "Sazeo", "BMS / Sazeo") are never translated by the design; pairs follow the language. */
export const resolveText = (value: Bilingual | string, lang: Lang): string =>
  typeof value === 'string' ? value : value[lang];

const bi = (ka: string, en: string): Bilingual => ({ka, en});

/* ------------------------------------------------------------------ header */

export const BRAND = bi('გიორგი მერებაშვილი', 'Giorgi Merebashvili');

export const NAV_ARIA_LABEL = bi('მთავარი მენიუ', 'Main menu');

export const THEME_BUTTON_LABEL = bi('თემის შეცვლა', 'Switch theme');

/* -------------------------------------------------------------------- hero */

export const HERO = {
  portraitAlt: 'გიორგი მერებაშვილის პორტრეტი ოფისში',
  /** Lines of the h1 (the design joined them with <br>). */
  nameLines: {ka: ['გიორგი', 'მერებაშვილი'], en: ['Giorgi', 'Merebashvili']},
  subtitle: bi('ინჟინერი • მეწარმე • Sazeo-ს დამფუძნებელი', 'Engineer • Entrepreneur • Founder of Sazeo'),
  headline: bi('პროექტიდან მომსახურებამდე', 'From design to service'),
  future: bi('ერთად შევქმნათ უკეთესი მომავალი', 'Let’s build a better future together'),
  cta: bi('ჩემი ისტორია', 'My story'),
  companiesAriaLabel: bi('კომპანიები', 'Companies'),
  companiesTitle: bi('კომპანიები და საქმიანობის მიმართულებები', 'Companies and ventures')
} as const;

export type PortfolioImage = {src: string; width: number; height: number};

/**
 * Company logos (public/georgemerebashvili/logos), WebP with alpha, cut at 2x of the largest size
 * they are shown at: the KAYA wordmark (cropped to its ink, 420x66) in a ~210px card slot, the
 * Sazeo app mark (256x256) at 128px in the Sazeo section.
 */
export const LOGOS = {
  kaya: {src: '/georgemerebashvili/logos/kaya.webp', width: 420, height: 66},
  sazeo: {src: '/georgemerebashvili/logos/sazeo.webp', width: 256, height: 256}
} as const satisfies Record<string, PortfolioImage>;

export const COMPANIES: ReadonlyArray<{
  name: string;
  monogram: string;
  selected?: boolean;
  alt: Bilingual;
  image: PortfolioImage;
}> = [
  {name: 'KAYA', monogram: 'K', alt: bi('KAYA ლოგო', 'KAYA logo'), image: LOGOS.kaya},
  {name: 'Sazeo', monogram: 'S', selected: true, alt: bi('Sazeo ლოგო', 'Sazeo logo'), image: LOGOS.sazeo},
  {
    name: 'KAYA Engineering',
    monogram: 'K',
    alt: bi('KAYA Engineering ლოგო', 'KAYA Engineering logo'),
    image: LOGOS.kaya
  }
];

/* ---------------------------------------------------------------- timeline */

export const TIMELINE_COPY = {
  title: bi('ჩემი გზა', 'My journey'),
  lead: bi(
    'ინჟინრისა და მეწარმის ისტორია ბავშვობიდან დღემდე.',
    "An engineer's and entrepreneur's journey from childhood to today."
  ),
  yearsAriaLabel: bi('წლების არჩევა', 'Choose a year'),
  prevYear: bi('წინა წელი', 'Previous year'),
  nextYear: bi('შემდეგი წელი', 'Next year'),
  directionsHeading: bi('ამ წლის მიმართულებები', 'Focus areas this year'),
  help: bi(
    'აირჩიე წელი ან გამოიყენე ისრები. მიმართულებაზე დაჭერით გაიხსნება დეტალები.',
    'Select a year or use the arrows. Select an area for details.'
  )
};

export type YearDirection = {text: string; photos: readonly PortfolioImage[]};
export type YearRecord = {
  /** A plain string is Georgian-only, as in the design; a pair follows the page language. */
  title: Bilingual | string;
  /** Empty = no paragraph is shown. */
  text: string;
  /** Printed after the year in the card's kicker ("2018 / SAZEO"); absent = the year alone. */
  tag?: string;
  /** Focus-area buttons of the year; empty = the panel is not shown. */
  directions: Record<string, YearDirection>;
};

const dir = (text: string): YearDirection => ({text, photos: []});

/**
 * Years with a written story: the two verified ones (the design's timelineData, as written). A
 * milestone year with nothing more to say needs no record here: yearRecord() builds its card from MILESTONES.
 */
const TIMELINE_DATA: Record<number, YearRecord> = {
  2018: {
    title: 'კომპანიის დაარსება',
    text: '2018 წელს დაარსდა შპს „ციფრული მართვის ტექნოლოგიები“ (ს/კ 405285926). ბრენდის განვითარების გზა: DMT → Sazero → Sazeo.',
    tag: 'SAZEO',
    directions: {
      'კომპანია': dir('შპს „ციფრული მართვის ტექნოლოგიები“ დაარსდა 2018 წელს.'),
      'ბრენდის განვითარება': dir('DMT → Sazero → Sazeo. ეტაპების ზუსტი თარიღები დასაზუსტებელია.')
    }
  },
  2023: {
    title: 'Sazeo-ს MVP საქართველოში',
    text: '2023 წელს საქართველოში შეიქმნა Sazeo-ს MVP.',
    tag: 'SAZEO',
    directions: {
      'პროგრამული პლატფორმა': dir(
        'Sazeo-ს პროგრამული უზრუნველყოფა მუშაობს საკუთარ კონტროლერებთან და შენობაში უკვე არსებულ მოწყობილობებთან.'
      ),
      'BMS / IoT': dir('MVP საქართველოში — 2023 წელი.')
    }
  }
};

export type MilestoneIcon = 'baby' | 'school' | 'graduation' | 'briefcase';

/** The design's milestone map (icons under the strip). Its years are on the strip even without a TIMELINE_DATA record. */
export const MILESTONES: Record<number, ReadonlyArray<{icon: MilestoneIcon; label: Bilingual}>> = {
  1987: [{icon: 'baby', label: bi('დაბადება', 'Birth')}],
  1992: [{icon: 'school', label: bi('სკოლა', 'School')}],
  2005: [
    {icon: 'graduation', label: bi('უნივერსიტეტი', 'University')},
    {icon: 'briefcase', label: bi('სამუშაო / მეწარმეობა', 'Work / entrepreneurship')}
  ],
  2008: [{icon: 'graduation', label: bi('მაგისტრატურა', "Master's degree")}]
};

/** The strip offers exactly the years that have something to show: milestones and written records. */
export const YEAR_VALUES: readonly number[] = [
  ...new Set([...Object.keys(MILESTONES), ...Object.keys(TIMELINE_DATA)].map(Number))
].sort((a, b) => a - b);

export const DEFAULT_YEAR = 2018;

/** Record for a year of YEAR_VALUES. A milestone year without a record is its milestone label(s) and nothing else. */
export function yearRecord(year: number): YearRecord {
  const written = TIMELINE_DATA[year];
  if (written) return written;
  const labels = (MILESTONES[year] ?? []).map(({label}) => label);
  return {
    title: bi(labels.map((label) => label.ka).join(' · '), labels.map((label) => label.en).join(' · ')),
    text: '',
    directions: {}
  };
}

/* --------------------------------------------------------------- expertise */

export type ExpertiseItem = {ka: string; en: string; icon: string; descKa: string; descEn: string};

export const EXPERTISE_ITEMS: readonly ExpertiseItem[] = [
  {
    ka: 'პროექტირება',
    en: 'Design',
    icon: '▤',
    descKa: 'საინჟინრო სისტემების კონცეფცია, გამოთვლები და პროექტირება.',
    descEn: 'Engineering concepts, calculations and design.'
  },
  {
    ka: 'წარმოება',
    en: 'Manufacturing',
    icon: '▦',
    descKa: 'საკუთარი კონტროლერები და საინჟინრო მოწყობილობების განვითარება.',
    descEn: 'In-house controllers and engineering product development.'
  },
  {
    ka: 'მონტაჟი',
    en: 'Installation',
    icon: '⚒',
    descKa: 'საინჟინრო სისტემების მონტაჟი, გაშვება და გამართვა.',
    descEn: 'Installation, commissioning and system setup.'
  },
  {
    ka: 'ზედამხედველობა',
    en: 'Supervision',
    icon: '◎',
    descKa: 'სამუშაოების ტექნიკური კონტროლი, ხარისხი და შესაბამისობა პროექტთან.',
    descEn: 'Technical oversight, quality control and design compliance.'
  },
  {
    ka: 'სერვისი',
    en: 'Service',
    icon: '⚙',
    descKa: 'მონიტორინგი, დიაგნოსტიკა, ტექნიკური მომსახურება და მხარდაჭერა.',
    descEn: 'Monitoring, diagnostics, maintenance and support.'
  }
];

export const EXPERTISE_COPY = {
  prevSlide: bi('წინა სლაიდი', 'Previous slide'),
  nextSlide: bi('შემდეგი სლაიდი', 'Next slide'),
  /** Appended to the row's name: "პროექტირება — ხუთბარათიანი მოძრავი ბლოკი". */
  carouselSuffix: bi('ხუთბარათიანი მოძრავი ბლოკი', 'five-card carousel')
};

export const MODAL_COPY = {
  close: bi('დახურვა', 'Close')
};

/* ------------------------------------------------------------------ sazeo */

export const SAZEO = {
  facts: [
    {mark: '▤', text: bi('შპს „ციფრული მართვის ტექნოლოგიები“', 'Digital Management Technologies LLC')},
    {mark: '▣', text: bi('ს/კ 405285926', 'Company ID 405285926')},
    {mark: '▦', text: bi('დაარსდა 2018 წელს', 'Founded in 2018')}
  ],
  highlights: [
    bi('MVP საქართველოში — 2023 წელს', 'MVP in Georgia — 2023'),
    bi('ბრენდის გზა: DMT → Sazero → Sazeo', 'Brand evolution: DMT → Sazero → Sazeo'),
    bi('პროგრამა საკუთარ კონტროლერებთან ერთად', 'Software paired with proprietary controllers'),
    bi('შენობაში არსებული მოწყობილობების ინტეგრაცია', 'Integration with existing building equipment')
  ],
  image: LOGOS.sazeo,
  imageAlt: bi('Sazeo ლოგო', 'Sazeo logo')
} as const;

/* ---------------------------------------------------------------- gallery */

export const GALLERY_COPY = {
  heading: bi('გალერეა', 'Gallery'),
  back: bi('წინა ფოტო', 'Previous photo'),
  forward: bi('შემდეგი ფოტო', 'Next photo'),
  /** Prefix of each card's accessible name; the visible label follows it ("გახსენით ფოტო: პროექტირება"). */
  openPhoto: bi('გახსენით ფოტო', 'Open photo'),
  modalKicker: 'GALLERY',
  title: bi('ფოტოს გადიდება', 'Enlarge photo')
};

/**
 * Real project photos. Empty today, so the gallery section and its nav link are not rendered; the
 * first item brings both back. `label` is a plain string for names the design never translates.
 */
export const GALLERY_ITEMS: ReadonlyArray<{
  label: Bilingual | string;
  alt: string;
  image: PortfolioImage;
}> = [];

/* ----------------------------------------------------------------- awards */

export const AWARDS = {
  heading: bi('ჯილდოები და სერტიფიკატები', 'Awards and certificates')
};

/** Verified awards and certificates only. Empty today, so the awards section and its nav link are not rendered. */
export const AWARD_ITEMS: ReadonlyArray<{title: Bilingual; text: Bilingual}> = [];

/* ---------------------------------------------------------------- contact */

export const CONTACT = {
  heading: bi('კონტაქტი', 'Contact'),
  email: 'ceo@sazeo.io'
};

export const FOOTER = bi('© 2026 გიორგი მერებაშვილი', '© 2026 Giorgi Merebashvili');

/* ------------------------------------------------------------- navigation */

/**
 * The header links, in page order. Declared after the section data because gallery and awards are
 * linked only while they have something to show. `label` is a plain string for "Sazeo", which the
 * design never translates.
 */
export const NAV_LINKS: ReadonlyArray<{href: string; label: Bilingual | string}> = [
  {href: '#home', label: bi('მთავარი', 'Home')},
  {href: '#timeline', label: bi('თაიმლაინი', 'Timeline')},
  {href: '#expertise', label: bi('მიმართულებები', 'Expertise')},
  {href: '#sazeo', label: 'Sazeo'},
  ...(GALLERY_ITEMS.length > 0 ? [{href: '#gallery', label: GALLERY_COPY.heading}] : []),
  ...(AWARD_ITEMS.length > 0 ? [{href: '#awards', label: bi('ჯილდოები', 'Awards')}] : []),
  {href: '#contact', label: bi('კონტაქტი', 'Contact')}
];
