export type CalcMeta = {
  slug: string;
  icon: string;
  title: string;
  desc: string;
  tag: string;
  standard?: string;
  useProjects?: boolean;
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
    title: 'თბოგადაცემის კოეფიციენტის გაანგარიშება',
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
    slug: 'stair-pressurization',
    icon: '🏢',
    title: 'სადარბაზოს დაწნეხვა',
    desc: '3D სიმულატორი · ჭრილი + გეგმა, სართულები, კარი, ჰაერის მიწოდების სცენარი',
    tag: 'HVAC',
    standard: 'EN 12101-6',
    useProjects: true
  },
  {
    slug: 'elevator-shaft-press',
    icon: '🛗',
    title: 'ლიფტის შახტის დაწნეხვა',
    desc: '3D სიმულატორი · კაბინა, დირიჟელი, საპირწონე, piston effect, თანხვიდნი სართულები',
    tag: 'HVAC',
    standard: 'EN 12101-6 · Elevator',
    useProjects: true
  },
  {
    slug: 'parking-ventilation',
    icon: '🅿️',
    title: 'პარკინგის ვენტილაცია',
    desc: 'CO + smoke extract · jet fans, heatmap, 3D პარკინგი, PDF/JSON export',
    tag: 'HVAC',
    standard: 'ASHRAE 62.1 · EN 12101-3',
    useProjects: true
  },
  {
    slug: 'floor-pressurization',
    icon: '🚪',
    title: 'კორიდორის დაწნეხვა',
    desc: 'Lobby / corridor refuge mode · room door toggles, cross-shaft context, 3D corridor',
    tag: 'HVAC',
    standard: 'EN 12101-6 · Corridor',
    useProjects: true
  },
  {
    slug: 'wall-editor',
    icon: '📐',
    title: 'გეგმის რედაქტორი',
    desc: '1-სართ. გეგმა · კედლები, კარ/ფანჯარა (1/2 ფრთ.), კოლონები, jet fans + exhausts',
    tag: 'CAD',
    standard: 'Wall editor',
    useProjects: true
  },
  {
    slug: 'building-composer',
    icon: '🏢',
    title: 'შენობის აღმშენებლობა',
    desc: 'მრავალსართულიანი შენობის შეკრება · სართულები stacked 3D-ში, module library, connections',
    tag: 'CAD',
    standard: 'Building composer',
    useProjects: true
  },
  {
    slug: 'ifc-viewer',
    icon: '🏠',
    title: 'IFC / BIM Viewer',
    desc: 'IFC მოდელების 3D viewer · walls, spaces, slabs, physics overlay (heat loss, orientation)',
    tag: 'CAD',
    standard: 'IFC 4 · web-ifc',
    useProjects: false
  }
];

export function getCalc(slug: string) {
  return CALCULATORS.find((c) => c.slug === slug);
}
