export type CalcMeta = {
  slug: string;
  icon: string;
  title: string;
  desc: string;
  tag: string;
  standard?: string;
};

export const CALCULATORS: CalcMeta[] = [
  {
    slug: 'heat-loss',
    icon: '🔥',
    title: 'თბოდანაკარგები',
    desc: 'EN 12831 · შენობის სითბური დატვირთვა, FCU სელექშენი, PDF ანგარიში',
    tag: 'HVAC',
    standard: 'EN 12831 · ASHRAE'
  },
  {
    slug: 'wall-thermal',
    icon: '🧱',
    title: 'კედლის თბოგამტარობა',
    desc: 'ISO 6946 · მრავალშრიანი კედლის U-ფაქტორი, კონდენსაცია, Glaser',
    tag: 'შრეები',
    standard: 'ISO 6946 · ISO 13788'
  },
  {
    slug: 'hvac',
    icon: '❄️',
    title: 'HVAC კალკულატორი',
    desc: 'სარკინიგზო დატვირთვის ფულ-ვერსია · სიცივე/სითბო, ვენტილაცია',
    tag: 'HVAC',
    standard: 'ASHRAE 62.1'
  },
  {
    slug: 'silencer',
    icon: '🔇',
    title: 'ხმაურდამხშობი სელექშენი',
    desc: 'ფრთის ხმაურდამხშობის სელექცია სიხშირით, dBA შემცირება',
    tag: 'აკუსტიკა',
    standard: 'ISO 7235'
  },
  {
    slug: 'silencer-kaya',
    icon: '🔕',
    title: 'KAYA ხმაურდამხშობი',
    desc: 'KAYA ბრენდის ხმაურდამხშობის დეტალური სელექცია და ფასი',
    tag: 'აკუსტიკა'
  },
  {
    slug: 'ahu-ashrae',
    icon: '🌀',
    title: 'AHU · ASHRAE რეპორტი',
    desc: 'Air Handling Unit-ის რეპორტი ASHRAE სტანდარტით',
    tag: 'HVAC',
    standard: 'ASHRAE'
  },
  {
    slug: 'procurement',
    icon: '📋',
    title: 'შესყიდვის მოდული',
    desc: 'საინჟინრო შესყიდვების ფორმირება და მართვა',
    tag: 'პროექტი'
  }
];

export function getCalc(slug: string) {
  return CALCULATORS.find((c) => c.slug === slug);
}
