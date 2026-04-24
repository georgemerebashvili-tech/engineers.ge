export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

// Ordered newest-first. Bump version on every user-visible release so the red
// dot re-appears for users until they dismiss the banner again.
export const TBC_CHANGELOG: ChangelogEntry[] = [
  {
    version: '2026-04-24',
    date: '2026-04-24',
    title: 'სწრაფი ფოტოები + ატვირთვის ლოადერი',
    items: [
      'ფილიალების სია მსუბუქი რეჟიმით იტვირთება — საიტი სწრაფად იხსნება მობილურზეც',
      'სიაში მხოლოდ პატარა thumbnail-ები ჩნდება; სრული ფოტო double-tap → lightbox-ზე',
      'ფოტოს ატვირთვისას slot-ზე ცხადი overlay spinner + % (ცუდ ინტერნეტზეც ჩანს)',
      'ძველი ფოტოები (209 ცალი) cloud storage-ში გადავიდა — browser cache მუშაობს'
    ]
  },
  {
    version: '2026-04-23',
    date: '2026-04-23',
    title: 'ფილიალის ძიება + ფოტოს lightbox',
    items: [
      'მობილურზე ფილიალების picker-ში ძიების ველი',
      'ფოტოს double-tap → full-screen lightbox (წინ ერთი ხელის მოძრაობა აკლდა)',
      'ფოტოს წაშლის ღილაკი შევცვალეთ double-tap-ით — შემთხვევითი წაშლა აღარ ხდება',
      'წაშლილი ფოტოები 360 დღეში არქივში რჩება'
    ]
  },
  {
    version: '2026-04-22',
    date: '2026-04-22',
    title: 'კონტროლერები + პროდუქტების კატალოგი',
    items: [
      'ახალი tab „🎛 კონტროლერები" დანადგარების შიგნით',
      'პროდუქტების კატალოგი tag-ებით',
      'არქივირება guard-ებით — აქტიური დანადგარი ვერ წაიშლება შემთხვევით'
    ]
  }
];

export const TBC_CURRENT_VERSION = TBC_CHANGELOG[0].version;
export const TBC_LAST_UPDATE = TBC_CHANGELOG[0].date;
