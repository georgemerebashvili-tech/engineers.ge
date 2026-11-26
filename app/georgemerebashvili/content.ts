/**
 * Text and data of /georgemerebashvili, ported verbatim from the owner's supplied design
 * (data-ka / data-en pairs in the markup, timelineData / expertiseItems in its script).
 *
 * Placeholder wording ("შესავსებია", "DEMO", "სადემონსტრაციო", "KAIA", the footer) is deliberately
 * kept as written: the owner decides those. Nothing in this file is plain site copy.
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

/** `label` is a plain string for "Sazeo", which the design never translates. */
export const NAV_LINKS: ReadonlyArray<{href: string; label: Bilingual | string}> = [
  {href: '#home', label: bi('მთავარი', 'Home')},
  {href: '#timeline', label: bi('თაიმლაინი', 'Timeline')},
  {href: '#expertise', label: bi('მიმართულებები', 'Expertise')},
  {href: '#sazeo', label: 'Sazeo'},
  {href: '#gallery', label: bi('გალერეა', 'Gallery')},
  {href: '#awards', label: bi('ჯილდოები', 'Awards')},
  {href: '#contact', label: bi('კონტაქტი', 'Contact')}
];

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

const DEMO_PHOTO_TITLE = 'სადემონსტრაციო ფოტო — შემდგომ შეიცვლება რეალური ფოტოთი';

export type DemoImage = {src: string; width: number; height: number};

/** Demo thumbnails exactly as supplied (public/georgemerebashvili). */
export const IMG = {
  design: {src: '/georgemerebashvili/demo-1.jpg', width: 218, height: 143},
  sazeo: {src: '/georgemerebashvili/demo-2.jpg', width: 300, height: 125},
  controllers: {src: '/georgemerebashvili/demo-3.jpg', width: 160, height: 128}
} as const satisfies Record<string, DemoImage>;

export const COMPANIES: ReadonlyArray<{
  name: string;
  monogram: string;
  selected?: boolean;
  title: string;
  alt: string;
  image: DemoImage;
}> = [
  {name: 'KAIA', monogram: 'K', title: DEMO_PHOTO_TITLE, alt: 'სადემონსტრაციო ფოტო — KAIA', image: IMG.design},
  {
    name: 'Sazeo',
    monogram: 'S',
    selected: true,
    title: DEMO_PHOTO_TITLE,
    alt: 'სადემონსტრაციო ფოტო — Sazeo',
    image: IMG.sazeo
  },
  {
    name: 'KAIA Engineering',
    monogram: 'K',
    title: DEMO_PHOTO_TITLE,
    alt: 'სადემონსტრაციო ფოტო — KAIA Engineering',
    image: IMG.controllers
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

export type YearDirection = {text: string; photos: readonly DemoImage[]};
export type YearRecord = {
  demo: boolean;
  title: string;
  text: string;
  directions: Record<string, YearDirection>;
};

const dir = (text: string): YearDirection => ({text, photos: []});

/** The design's timelineData, as written. Years 1995, 2000, 2010, 2015 and 2025 are not in
 *  YEAR_VALUES, so no control reaches them (kept: the owner may add those years later). */
const TIMELINE_DATA: Record<number, YearRecord> = {
  1995: {
    demo: true,
    title: 'ადრეული წლები',
    text: 'ბავშვობისა და პირველი ტექნიკური ინტერესების ისტორია — რეალური ინფორმაციით შესავსებია.',
    directions: {'ინტერესები': dir('სადემონსტრაციო ჩანაწერი.'), 'სწავლა': dir('სადემონსტრაციო ჩანაწერი.')}
  },
  2000: {
    demo: true,
    title: 'პირველი ნაბიჯები',
    text: 'ბავშვობის პერიოდის ისტორია შესავსებია.',
    directions: {'სწავლა': dir('რეალური ისტორია დასამატებელია.')}
  },
  2005: {
    demo: true,
    title: 'პროფესიული განვითარება',
    text: 'პროფესიული განვითარების ეტაპი — შესავსებია.',
    directions: {'ინჟინერია': dir('რეალური პროექტები დასამატებელია.')}
  },
  2010: {
    demo: true,
    title: 'საინჟინრო საქმიანობა',
    text: 'პროექტებისა და საქმიანობის აღწერა შესავსებია.',
    directions: {'პროექტირება': dir('პროექტების აღწერა შესავსებია.'), 'მონტაჟი': dir('მონტაჟების აღწერა შესავსებია.')}
  },
  2015: {
    demo: true,
    title: 'ავტომატიზაციის მიმართულება',
    text: 'საქმიანობის დეტალები დასაზუსტებელია.',
    directions: {'BMS': dir('შესავსებია.'), 'ინჟინერია': dir('შესავსებია.')}
  },
  2018: {
    demo: false,
    title: 'კომპანიის დაარსება',
    text: '2018 წელს დაარსდა შპს „ციფრული მართვის ტექნოლოგიები“ (ს/კ 405285926). ბრენდის განვითარების გზა: DMT → Sazero → Sazeo.',
    directions: {
      'კომპანია': dir('შპს „ციფრული მართვის ტექნოლოგიები“ დაარსდა 2018 წელს.'),
      'ბრენდის განვითარება': dir('DMT → Sazero → Sazeo. ეტაპების ზუსტი თარიღები დასაზუსტებელია.')
    }
  },
  2023: {
    demo: false,
    title: 'Sazeo-ს MVP საქართველოში',
    text: '2023 წელს საქართველოში შეიქმნა Sazeo-ს MVP.',
    directions: {
      'პროგრამული პლატფორმა': dir(
        'Sazeo-ს პროგრამული უზრუნველყოფა მუშაობს საკუთარ კონტროლერებთან და შენობაში უკვე არსებულ მოწყობილობებთან.'
      ),
      'BMS / IoT': dir('MVP საქართველოში — 2023 წელი.')
    }
  },
  2025: {
    demo: true,
    title: 'განვითარების ეტაპი',
    text: 'დადასტურებული პროექტები და მიღწევები დასამატებელია.',
    directions: {'განვითარება': dir('დასამატებელია.')}
  },
  2026: {
    demo: true,
    title: 'დღევანდელი ეტაპი',
    text: 'მიმდინარე პროექტები და მიღწევები შესავსებია.',
    directions: {'Sazeo': dir('მიმდინარე ეტაპის აღწერა შესავსებია.')}
  }
};

/** Placeholder the design generates for every regular five-year mark (1987, 1992, ...). */
function placeholderRecord(): YearRecord {
  const missing = 'მონაცემები შესავსებია.';
  return {
    demo: true,
    title: 'ისტორია შესავსებია',
    text: 'ამ წლის რეალური ბიოგრაფიული ისტორია და პროექტები დასამატებელია.',
    directions: {
      'პროექტირება': dir(missing),
      'წარმოება': dir(missing),
      'მონტაჟი': dir(missing),
      'ზედამხედველობა': dir(missing),
      'სერვისი': dir(missing)
    }
  };
}

/** 1987 is the first year; five-year ticks continue toward the present. */
const FIVE_YEAR_TICKS = [1987, 1992, 1997, 2002, 2007, 2012, 2017, 2022];

/** Years the strip offers: the regular five-year marks, the verified milestone years and today. */
export const YEAR_VALUES: readonly number[] = [
  ...new Set([...FIVE_YEAR_TICKS, 2005, 2008, 2018, 2023, 2026])
].sort((a, b) => a - b);

export const DEFAULT_YEAR = 2018;

/**
 * Record for a year. The design had no record for 2008 (a strip year with a milestone icon), so
 * selecting it threw a TypeError; it now gets the same placeholder as the other unwritten years.
 */
export function yearRecord(year: number): YearRecord {
  return TIMELINE_DATA[year] ?? placeholderRecord();
}

export type MilestoneIcon = 'baby' | 'school' | 'graduation' | 'briefcase';

export const MILESTONES: Record<number, ReadonlyArray<{icon: MilestoneIcon; label: string}>> = {
  1987: [{icon: 'baby', label: 'დაბადება'}],
  1992: [{icon: 'school', label: 'სკოლა'}],
  2005: [
    {icon: 'graduation', label: 'უნივერსიტეტი'},
    {icon: 'briefcase', label: 'სამუშაო / მეწარმეობა'}
  ],
  2008: [{icon: 'graduation', label: 'მაგისტრატურა'}]
};

export const STORY_COPY = {
  verifiedBadge: bi('დადასტურებული ფაქტი', 'Verified fact'),
  demoBadge: bi('შესავსებია', 'To be completed'),
  demoNote: bi(
    'სადემონსტრაციო ისტორია — არ წარმოადგენს დადასტურებულ ბიოგრაფიას.',
    'Demo history — not verified biography.'
  )
};

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
  close: bi('დახურვა', 'Close'),
  emptyPhotos: bi('ამ ეტაპის ფოტოები ჯერ დასამატებელია.', 'Images will be added for this milestone.')
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
  imageAlt: 'სადემონსტრაციო ტექნოლოგიური გამოსახულება'
} as const;

/* ---------------------------------------------------------------- gallery */

export const GALLERY_COPY = {
  heading: bi('გალერეა', 'Gallery'),
  sub: bi('სადემონსტრაციო ფოტოები — შესაცვლელია რეალური მასალით.', 'Demo imagery — to be replaced with real project photos.'),
  back: bi('წინა ფოტო', 'Previous photo'),
  forward: bi('შემდეგი ფოტო', 'Next photo'),
  /** Prefix of each card's accessible name; the visible label follows it ("გახსენით ფოტო: პროექტირება"). */
  openPhoto: bi('გახსენით ფოტო', 'Open photo'),
  modalKicker: 'GALLERY',
  modalText: bi(
    'სადემონსტრაციო ფოტო — რეალური მასალით შესაცვლელია.',
    'Demonstration photo, to be replaced with real content.'
  ),
  title: bi('ფოტოს გადიდება', 'Enlarge photo')
};

/** `label` is a plain string for "BMS / Sazeo", which the design never translates. */
export const GALLERY_ITEMS: ReadonlyArray<{
  label: Bilingual | string;
  alt: string;
  image: DemoImage;
}> = [
  {
    label: bi('პროექტირება', 'Design'),
    alt: 'სადემონსტრაციო პროექტის ფოტო',
    image: IMG.design
  },
  {
    label: bi('კონტროლერები', 'Controllers'),
    alt: 'სადემონსტრაციო კონტროლერის ფოტო',
    image: IMG.controllers
  },
  {
    label: 'BMS / Sazeo',
    alt: 'სადემონსტრაციო BMS ფოტო',
    image: IMG.sazeo
  }
];

/* ----------------------------------------------------------------- awards */

export const AWARDS = {
  heading: bi('ჯილდოები და სერტიფიკატები', 'Awards and certificates'),
  sub: bi('სექცია შეივსება მხოლოდ დადასტურებული დოკუმენტებით.', 'This section will only contain verified documents.'),
  pill: 'შესავსებია',
  cards: [
    {
      title: bi('ჯილდოები', 'Awards'),
      text: bi(
        'დასამატებელია სათაური, გამცემი, წელი და დოკუმენტის სკანი.',
        'Title, issuing organization, year, and scan are pending.'
      )
    },
    {
      title: bi('სერტიფიკატები', 'Certificates'),
      text: bi(
        'დასამატებელია დადასტურებული სერტიფიკატები და სკანები.',
        'Verified certificates and scans are pending.'
      )
    }
  ]
};

/* ---------------------------------------------------------------- contact */

export const CONTACT = {
  heading: bi('კონტაქტი', 'Contact'),
  email: 'ceo@sazeo.io',
  note: bi('ტელეფონი და სოციალური ქსელების ბმულები — შესავსებია.', 'Phone number and social links will be added.')
};

export const FOOTER = bi(
  '© 2026 გიორგი მერებაშვილი · პორტფოლიოს სადემონსტრაციო ვერსია',
  '© 2026 Giorgi Merebashvili · Demo portfolio'
);
