'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {BlockMath, InlineMath} from 'react-katex';
import 'katex/dist/katex.min.css';
import {
  leakageFlow,
  totalLeakage,
  doorOpeningForce,
  maxDpForDoor,
  airChangeRate,
  flowFromACH,
  coConcentration,
  coEmissionRate,
  plumeMassFlow,
  smokeLayerHeight,
  pistonPressure,
  requiredSupplyFlow,
  fanTempDerate,
  REFS,
  STANDARDS
} from '@/public/calc/_physics-engine.js';

type FormulaCategory = 'Leakage' | 'Doors' | 'Airflow' | 'CO' | 'Smoke' | 'Pressure';

type FormulaVar = {
  symbol: string;
  unit: string;
  label: string;
  typical?: string;
};

type FormulaExample = {
  intro: string;
  inputs: string[];
  resultLabel: string;
  resultValue: string;
  conclusion: string;
};

type FormulaDoc = {
  id: string;
  title: string;
  titleEn: string;
  category: FormulaCategory;
  expression: string;
  refKey: keyof typeof REFS;
  explanation: string;
  variables: FormulaVar[];
  example: FormulaExample;
  usedIn: {href: string; label: string}[];
};

function f3(value: number) {
  return Number(value).toFixed(3);
}

function f2(value: number) {
  return Number(value).toFixed(2);
}

function pa(value: number) {
  return `${Number(value).toFixed(Math.abs(value) >= 10 ? 0 : 1)} Pa`;
}

function m3s(value: number) {
  return `${f3(value)} მ³/წმ`;
}

function n(value: number) {
  return `${f2(value)} N`;
}

const USED_IN = {
  stair: {href: '/calc/stair-pressurization', label: 'სადარბაზოს დაწნეხვა'},
  elevator: {href: '/calc/elevator-shaft-press', label: 'ლიფტის შახტის დაწნეხვა'},
  parking: {href: '/calc/parking-ventilation', label: 'პარკინგის ვენტილაცია'},
  floor: {href: '/calc/floor-pressurization', label: 'კორიდორის დაწნეხვა'}
} as const;

const FORMULAS: FormulaDoc[] = [
  {
    id: 'air-change-rate',
    title: 'ჰაერცვლის კოეფიციენტი',
    titleEn: 'Air Change Rate',
    category: 'Airflow',
    expression: String.raw`ACH = \frac{Q \cdot 3600}{V}`,
    refKey: 'airChangeRate',
    explanation: 'ეს იდენტობა აჩვენებს, საათში რამდენჯერ იცვლება სივრცის სრული მოცულობა მოცემული ნაკადით. HVAC და smoke-control sizing-ში ეს არის ყველაზე სწრაფი sanity-check მეტრიკა.',
    variables: [
      {symbol: 'ACH', unit: '1/h', label: 'ჰაერცვლის კოეფიციენტი'},
      {symbol: 'Q', unit: 'm^3/s', label: 'ჰაერის ხარჯი'},
      {symbol: 'V', unit: 'm^3', label: 'სივრცის მოცულობა'}
    ],
    example: {
      intro: 'Parking / corridor sizing-ის დროს სწრაფი შემოწმება.',
      inputs: ['Q = 2.20 m³/s', 'V = 240 m³'],
      resultLabel: 'ACH',
      resultValue: f2(airChangeRate(2.2, 240)),
      conclusion: '240 მ³ მოცულობა ამ ნაკადით დაახლოებით 33 ACH-ს იღებს.'
    },
    usedIn: [USED_IN.parking, USED_IN.floor]
  },
  {
    id: 'co-concentration',
    title: 'CO კონცენტრაცია დროის მიხედვით',
    titleEn: 'CO Concentration',
    category: 'CO',
    expression: String.raw`C(t) = C_{eq} + \left(C_0 - C_{eq}\right)e^{-Q_{vent} t / V}`,
    refKey: 'coConcentration',
    explanation: 'პირველი რიგის mass-balance განტოლება CO-ის დაგროვებას და განიავებას ერთიანად აღწერს. პარკინგის სიმულატორი სწორედ ამ გადაწყვეტით აჩვენებს 0–600 წამის curve-ს.',
    variables: [
      {symbol: 'C(t)', unit: 'ppm', label: 'დროის მომენტზე CO'},
      {symbol: 'C_0', unit: 'ppm', label: 'საწყისი კონცენტრაცია'},
      {symbol: 'Q_{vent}', unit: 'm^3/s', label: 'ვენტილაციის ხარჯი'},
      {symbol: 'V', unit: 'm^3', label: 'სივრცის მოცულობა'}
    ],
    example: {
      intro: 'Parking ventilation curve-ის ერთი snapshot.',
      inputs: ['Q_gen = 0.00025 m³/s', 'V = 600 m³', 'Qvent = 2.4 m³/s', 'C0 = 12 ppm', 't = 300 s'],
      resultLabel: 'C(300s)',
      resultValue: `${f2(coConcentration(0.00025, 600, 2.4, 12, 300))} ppm`,
      conclusion: 'ვენტილაცია მაღალია, ამიტომ კონცენტრაცია equilibrium-ზე სწრაფად მიუახლოვდება.'
    },
    usedIn: [USED_IN.parking]
  },
  {
    id: 'co-emission-rate',
    title: 'მანქანის CO ემისიის ხარჯი',
    titleEn: 'CO Emission Rate',
    category: 'CO',
    expression: String.raw`\dot{V}_{CO} = \frac{cars/h \cdot g/cycle}{1000 \cdot 3600 \cdot \rho_{CO}}`,
    refKey: 'coEmissionRate',
    explanation: 'ეს არის მარტივი საინჟინრო შეფასება, რომ საათში რამდენი მანქანის ციკლი რა მოცულობის CO წყაროს ქმნის. ზუსტი emissions inventory-ს ნაცვლად ვიღებთ სწრაფ planning estimate-ს.',
    variables: [
      {symbol: 'cars/h', unit: '1/h', label: 'საათში მანქანების რაოდენობა'},
      {symbol: 'g/cycle', unit: 'g', label: 'ემისია ერთ ციკლზე'},
      {symbol: '\\rho_{CO}', unit: 'kg/m^3', label: 'CO-ის სიმკვრივე'}
    ],
    example: {
      intro: 'Peak hour რეჟიმის estimate.',
      inputs: ['cars/h = 80', 'g/cycle = 20 g'],
      resultLabel: 'Qgen',
      resultValue: m3s(coEmissionRate(80, 20)),
      conclusion: 'ეს rate უკვე შეიძლება გადავიტანოთ contaminant balance ფორმულაში.'
    },
    usedIn: [USED_IN.parking]
  },
  {
    id: 'door-opening-force',
    title: 'კარის გაღების ძალა',
    titleEn: 'Door Opening Force',
    category: 'Doors',
    expression: String.raw`F_{open} = F_{dc} + \frac{A \cdot \Delta p \cdot W}{2 (W - d_h)}`,
    refKey: 'doorOpeningForce',
    explanation: 'წნევით დატვირთული კარი მხოლოდ closer resistance-ს აღარ ებრძვის; pressure moment-იც ემატება. ამიტომ pressurization target ყოველთვის უნდა შევამოწმოთ force limit-თან ერთად.',
    variables: [
      {symbol: 'F_{open}', unit: 'N', label: 'კარის გასაღები ძალა'},
      {symbol: 'F_{dc}', unit: 'N', label: 'closer-ის ძალა'},
      {symbol: 'A', unit: 'm^2', label: 'კარის ფართობი'},
      {symbol: '\\Delta p', unit: 'Pa', label: 'წნევის სხვაობა'}
    ],
    example: {
      intro: 'Typical 900 × 2100 door under 50 Pa.',
      inputs: ['W = 0.90 m', 'H = 2.10 m', 'Δp = 50 Pa', 'Fdc = 30 N'],
      resultLabel: 'Fopen',
      resultValue: n(doorOpeningForce(0.9, 2.1, 50, 30, 0.07)),
      conclusion: 'თუ ეს force ნორმატიულ ლიმიტს აჭარბებს, target Δp ან door strategy უნდა დავაკორექტიროთ.'
    },
    usedIn: [USED_IN.stair, USED_IN.elevator, USED_IN.floor]
  },
  {
    id: 'fan-temp-derate',
    title: 'ვენტილატორის thermal derating',
    titleEn: 'Fan Temperature Derate',
    category: 'Smoke',
    expression: String.raw`Q_{hot} = Q_{ambient} \cdot f(T)`,
    refKey: 'fanTempDerate',
    explanation: 'EN 12101-3 temperature კლასები ნიშნავს, რომ მაღალი ტემპერატურის smoke რეჟიმში fan აღარ ინარჩუნებს ambient capacity-ს. ეს function piecewise approximation-ით აფასებს ამ შემცირებას.',
    variables: [
      {symbol: 'Q_{hot}', unit: 'm^3/s', label: 'ხელმისაწვდომი ხარჯი ცხელ გაზზე'},
      {symbol: 'Q_{ambient}', unit: 'm^3/s', label: 'ambient nominal flow'},
      {symbol: 'T', unit: '°C', label: 'გაზის ტემპერატურა'}
    ],
    example: {
      intro: 'Smoke extract fan at 400°C.',
      inputs: ['Qambient = 4.20 m³/s', 'T = 400°C'],
      resultLabel: 'Qhot',
      resultValue: m3s(fanTempDerate(4.2, 400)),
      conclusion: 'ცხელ რეჟიმში nominal flow შემცირდება და sizing-ში ეს reserve უნდა გავითვალისწინოთ.'
    },
    usedIn: [USED_IN.parking]
  },
  {
    id: 'flow-from-ach',
    title: 'ACH-დან საჭირო ხარჯი',
    titleEn: 'Flow From ACH',
    category: 'Airflow',
    expression: String.raw`Q = \frac{ACH \cdot V}{3600}`,
    refKey: 'flowFromACH',
    explanation: 'როცა სტანდარტი გვეუბნება მიზნობრივ ACH-ს, სწორედ ეს გარდაქმნის ფორმულა გვაძლევს fan sizing flow-ს. Parking ventilation და სხვა generic extract calculations ამას იყენებენ.',
    variables: [
      {symbol: 'ACH', unit: '1/h', label: 'სამიზნე ჰაერცვლა'},
      {symbol: 'V', unit: 'm^3', label: 'მოცულობა'},
      {symbol: 'Q', unit: 'm^3/s', label: 'საჭირო ხარჯი'}
    ],
    example: {
      intro: '6 ACH for a 240 m³ zone.',
      inputs: ['ACH = 6 1/h', 'V = 240 m³'],
      resultLabel: 'Qreq',
      resultValue: m3s(flowFromACH(6, 240)),
      conclusion: 'იგივე იდენტობაა, რასაც back-calc-ით airChangeRate ადასტურებს.'
    },
    usedIn: [USED_IN.parking]
  },
  {
    id: 'leakage-flow',
    title: 'გაჟონვის ნაკადი',
    titleEn: 'Leakage Flow',
    category: 'Leakage',
    expression: String.raw`Q = C_d \cdot A \cdot \sqrt{\frac{2 \Delta p}{\rho}}`,
    refKey: 'leakageFlow',
    explanation: 'ორიფისის განტოლების ამ ფორმით ვიღებთ crack ან opening leakage-ს. Pressurization simulators-ში leakage სწორედ ამ დამოკიდებულებით იზრდება წნევის კვადრატული ფესვით.',
    variables: [
      {symbol: 'Q', unit: 'm^3/s', label: 'ნაკადი'},
      {symbol: 'C_d', unit: '—', label: 'discharge coefficient', typical: '0.65'},
      {symbol: 'A', unit: 'm^2', label: 'ღიობის ფართობი'},
      {symbol: '\\Delta p', unit: 'Pa', label: 'წნევის სხვაობა'},
      {symbol: '\\rho', unit: 'kg/m^3', label: 'ჰაერის სიმკვრივე', typical: '1.2'}
    ],
    example: {
      intro: 'Door crack estimate at standard stair pressure.',
      inputs: ['Cd = 0.65', 'A = 0.020 m²', 'Δp = 50 Pa'],
      resultLabel: 'Q',
      resultValue: m3s(leakageFlow(0.02, 50)),
      conclusion: '∆p-ის ორჯერ გაზრდა leakage-ს ორჯერ არა, მხოლოდ √2-ჯერ ზრდის.'
    },
    usedIn: [USED_IN.stair, USED_IN.elevator, USED_IN.floor]
  },
  {
    id: 'max-dp-for-door',
    title: 'კარისთვის მაქსიმალური Δp',
    titleEn: 'Maximum Δp For Door',
    category: 'Doors',
    expression: String.raw`\Delta p_{max} = \frac{\left(F_{limit} - F_{dc}\right) 2 (W-d_h)}{A \cdot W}`,
    refKey: 'maxDpForDoor',
    explanation: 'ეს არის door-opening-force ფორმულის ინვერსია. როცა force limit წინასწარ ვიცით, შეგვიძლია ვნახოთ კონკრეტულ door geometry-ზე მაქსიმალურად რა წნევა შეიძლება დავუშვათ.',
    variables: [
      {symbol: 'F_{limit}', unit: 'N', label: 'დასაშვები ძალა'},
      {symbol: 'F_{dc}', unit: 'N', label: 'closer force'},
      {symbol: 'A', unit: 'm^2', label: 'კარის ფართობი'}
    ],
    example: {
      intro: '100 N force limit on a standard stair door.',
      inputs: ['W = 0.90 m', 'H = 2.10 m', 'Flimit = 100 N'],
      resultLabel: 'Δpmax',
      resultValue: pa(maxDpForDoor(0.9, 2.1, 100, 30, 0.07)),
      conclusion: 'თუ target ამ მნიშვნელობას სცდება, კარის გახსნა ნორმატივს ვეღარ დააკმაყოფილებს.'
    },
    usedIn: [USED_IN.stair, USED_IN.elevator, USED_IN.floor]
  },
  {
    id: 'piston-pressure',
    title: 'ლიფტის piston pressure',
    titleEn: 'Piston Pressure',
    category: 'Pressure',
    expression: String.raw`\Delta p = \frac{1}{2}\rho \left(v \frac{A_{car}}{A_{shaft}}\right)^2`,
    refKey: 'pistonPressure',
    explanation: 'კაბინის მოძრაობა შახტში ქმნის დამატებით pressure component-ს. Elevator simulator სწორედ ამ წევრით აჩვენებს რატომ იზრდება door force მაღალი სიჩქარის ან დაბალი free area-ის შემთხვევაში.',
    variables: [
      {symbol: 'v', unit: 'm/s', label: 'კაბინის სიჩქარე'},
      {symbol: 'A_{car}', unit: 'm^2', label: 'კაბინის ფრონტალური ფართობი'},
      {symbol: 'A_{shaft}', unit: 'm^2', label: 'შახტის კვეთა'}
    ],
    example: {
      intro: 'Fast elevator with tight shaft clearance.',
      inputs: ['Acar = 1.54 m²', 'Ashaft = 5.00 m²', 'v = 2.5 m/s'],
      resultLabel: 'Δppiston',
      resultValue: pa(pistonPressure(1.54, 5.0, 2.5)),
      conclusion: 'ეს pressure component მერე ემატება static pressurization target-ს.'
    },
    usedIn: [USED_IN.elevator]
  },
  {
    id: 'plume-mass-flow',
    title: 'კვამლის plume mass flow',
    titleEn: 'Plume Mass Flow',
    category: 'Smoke',
    expression: String.raw`\dot{m}_p = 0.071 Q_c^{1/3} z^{5/3} + 0.0018 Q_c`,
    refKey: 'plumeMassFlow',
    explanation: 'Heskestad-ის კორელაცია გვაძლევს, ჭერის დონეზე რა მასის ნაკადი ამოდის plume-ით. Parking smoke extraction-ის one-zone შეფასება ამ mass flow-ს იყენებს.',
    variables: [
      {symbol: 'Q_c', unit: 'kW', label: 'convective heat release'},
      {symbol: 'z', unit: 'm', label: 'სიმაღლე ვირტუალური origin-დან'},
      {symbol: '\\dot{m}_p', unit: 'kg/s', label: 'plume mass flow'}
    ],
    example: {
      intro: 'Typical car fire plume near ceiling.',
      inputs: ['Qc = 3500 kW', 'z = 3.0 m'],
      resultLabel: 'ṁp',
      resultValue: `${f2(plumeMassFlow(3500, 3))} kg/s`,
      conclusion: 'ეს რაოდენობა შემდეგ smoke layer estimate-ში გადადის.'
    },
    usedIn: [USED_IN.parking]
  },
  {
    id: 'required-supply-flow',
    title: 'საჭირო მიწოდების ხარჯი',
    titleEn: 'Required Supply Flow',
    category: 'Airflow',
    expression: String.raw`Q_{supply} = \left(Q_{leak} + Q_{open}\right)\gamma`,
    refKey: 'requiredSupplyFlow',
    explanation: 'Practical fan sizing step: leakage component + open-door component + safety factor. Corridor and stair simulators ამავე summation-ით აჩვენებენ design supply-ს.',
    variables: [
      {symbol: 'Q_{leak}', unit: 'm^3/s', label: 'დახურული ღიობების გაჟონვა'},
      {symbol: 'Q_{open}', unit: 'm^3/s', label: 'ღია კარის ნაკადი'},
      {symbol: '\\gamma', unit: '—', label: 'უსაფრთხოების კოეფიციენტი', typical: '1.1'}
    ],
    example: {
      intro: 'Combined leak plus open-door case.',
      inputs: ['Qleak = 1.20 m³/s', 'Qopen = 3.40 m³/s', 'γ = 1.1'],
      resultLabel: 'Qsupply',
      resultValue: m3s(requiredSupplyFlow(1.2, 3.4, 1.1)),
      conclusion: 'ეს გამოდის უკვე design fan duty, რომელსაც მერე temperature derating-იც შეიძლება შევამატოთ.'
    },
    usedIn: [USED_IN.stair, USED_IN.elevator, USED_IN.floor]
  },
  {
    id: 'smoke-layer-height',
    title: 'კვამლის შრის სიმაღლე',
    titleEn: 'Smoke Layer Height',
    category: 'Smoke',
    expression: String.raw`z = H - \frac{\dot{m}_p t}{\rho_s A}`,
    refKey: 'smokeLayerHeight',
    explanation: 'One-zone engineering estimate გვაჩვენებს, დროში როგორ ჩამოდის smoke interface floor-იდან გაზომილ სიმაღლემდე. Parking simulator fire mode-ში ამას ceiling layer-ად ხატავს.',
    variables: [
      {symbol: 'H', unit: 'm', label: 'ჭერის სიმაღლე'},
      {symbol: 'A', unit: 'm^2', label: 'სართულის ფართობი'},
      {symbol: 't', unit: 's', label: 'დრო'},
      {symbol: 'z', unit: 'm', label: 'interface სიმაღლე floor-იდან'}
    ],
    example: {
      intro: 'Single-level parking during 180 s fire scenario.',
      inputs: ['Q = 5000 kW', 'A = 600 m²', 'H = 3.2 m', 't = 180 s'],
      resultLabel: 'zinterface',
      resultValue: fmtHeight(smokeLayerHeight(5000, 600, 3.2, 180)),
      conclusion: 'როცა interface სწრაფად ეცემა, smoke extract reserve ან geometry უნდა გადაიხედოს.'
    },
    usedIn: [USED_IN.parking, USED_IN.stair]
  },
  {
    id: 'total-leakage',
    title: 'ჯამური leakage პარალელურ ღიობებზე',
    titleEn: 'Total Leakage',
    category: 'Leakage',
    expression: String.raw`Q_{\Sigma} = \sum_i C_{d,i} A_i \sqrt{\frac{2 \Delta p}{\rho}}`,
    refKey: 'totalLeakage',
    explanation: 'როცა ერთნაირ pressure field-ში რამდენიმე parallel crack ან opening გვაქვს, მათი flow-ები უბრალოდ ჯამდება. Stair და corridor models სწორედ ასე აგროვებენ floor/room leakage-ს.',
    variables: [
      {symbol: 'A_i', unit: 'm^2', label: 'თითოეული ღიობის ფართობი'},
      {symbol: 'C_{d,i}', unit: '—', label: 'discharge coefficient'},
      {symbol: 'Q_\\Sigma', unit: 'm^3/s', label: 'ჯამური leakage'}
    ],
    example: {
      intro: 'Three parallel door-crack openings at the same Δp.',
      inputs: ['A = [0.010, 0.012, 0.008] m²', 'Δp = 50 Pa'],
      resultLabel: 'QΣ',
      resultValue: m3s(totalLeakage([{area: 0.01}, {area: 0.012}, {area: 0.008}], 50)),
      conclusion: 'Parallel openings same pressure-ზე პირდაპირ ემატება ერთმანეთს.'
    },
    usedIn: [USED_IN.stair, USED_IN.floor]
  }
].sort((a, b) => a.title.localeCompare(b.title, 'ka'));

function fmtHeight(value: number) {
  return `${f2(value)} მ`;
}

const CATEGORY_META: Record<FormulaCategory, {label: string; classes: string}> = {
  Leakage: {
    label: 'Leakage',
    classes: 'border-blue-bd bg-blue-lt text-blue'
  },
  Doors: {
    label: 'Doors',
    classes: 'border-ora-bd bg-ora-lt text-ora'
  },
  Airflow: {
    label: 'Airflow',
    classes: 'border-grn-bd bg-grn-lt text-grn'
  },
  CO: {
    label: 'CO',
    classes: 'border-red bg-red-lt text-red'
  },
  Smoke: {
    label: 'Smoke',
    classes: 'border-ora-bd bg-ora-lt text-ora'
  },
  Pressure: {
    label: 'Pressure',
    classes: 'border-bdr-2 bg-sur-2 text-navy'
  }
};

const STANDARD_SUMMARY = [
  {
    key: 'EN-12101-6',
    title: 'EN 12101-6',
    note: `Classes: ${Object.keys(STANDARDS['EN-12101-6'].classes).join(', ')}`
  },
  {
    key: 'NFPA-92',
    title: 'NFPA 92',
    note: `Classes: ${Object.keys(STANDARDS['NFPA-92'].classes).join(', ')}`
  },
  {
    key: 'SP-7.13130',
    title: 'СП 7.13130',
    note: `Classes: ${Object.keys(STANDARDS['SP-7.13130'].classes).join(', ')}`
  }
] as const;

export default function PhysicsDocsPage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(FORMULAS[0]?.id ?? '');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return FORMULAS;
    return FORMULAS.filter((formula) => {
      const haystack = [
        formula.title,
        formula.titleEn,
        formula.category,
        formula.explanation,
        formula.variables.map((item) => item.label).join(' '),
        formula.usedIn.map((item) => item.label).join(' ')
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  const grouped = useMemo(() => {
    return (Object.keys(CATEGORY_META) as FormulaCategory[]).map((category) => ({
      category,
      items: filtered.filter((formula) => formula.category === category)
    }));
  }, [filtered]);

  const active = filtered.find((formula) => formula.id === selectedId) ?? filtered[0] ?? FORMULAS[0];

  return (
    <div className="mx-auto w-full max-w-site px-4 py-5 md:px-5 md:py-6">
      <div className="mb-4 rounded-card border border-bdr bg-sur px-4 py-4 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center rounded-pill border border-blue-bd bg-blue-lt px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-blue">
              წესები · ფორმულები · physics reference
            </div>
            <h1 className="text-2xl font-bold tracking-[0.02em] text-navy md:text-[32px]">
              ფიზიკის წესები და ფორმულები
            </h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-text-2">
              ყველა აქტიური ventilation formula ერთ გვერდზე: KaTeX ფორმულა, ცვლადები,
              საინჟინრო ახსნა, worked example და რომელ სიმულატორში გამოიყენება.
            </p>
          </div>
          <div className="grid min-w-[220px] gap-2 rounded-card border border-bdr bg-sur-2 p-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              Coverage
            </div>
            <div className="text-[18px] font-bold text-navy">{FORMULAS.length} Formula</div>
            <div className="text-[11px] text-text-2">
              Stair, elevator, parking და corridor simulators ახლა ერთ საერთო reference-ზე ზიან.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-card border border-bdr bg-sur shadow-card lg:sticky lg:top-20 lg:h-[calc(100vh-104px)] lg:overflow-hidden">
          <div className="border-b border-bdr px-4 py-3">
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              სწრაფი ძიება
            </label>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="მაგ: leakage, smoke, ACH, piston..."
              className="w-full rounded-[5px] border-[1.5px] border-bdr bg-white px-2.5 py-2 text-[13px] text-text outline-none focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)] dark:bg-sur"
            />
          </div>

          <div className="border-b border-bdr px-4 py-3">
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              კატეგორიები
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_META) as FormulaCategory[]).map((category) => (
                <span
                  key={category}
                  className={`inline-flex rounded-pill border px-2.5 py-1 text-[10px] font-bold ${CATEGORY_META[category].classes}`}
                >
                  {CATEGORY_META[category].label} · {filtered.filter((item) => item.category === category).length}
                </span>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto px-3 py-3">
            {grouped.map((group) =>
              group.items.length ? (
                <section key={group.category} className="mb-4">
                  <div className="mb-2 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                    {CATEGORY_META[group.category].label}
                  </div>
                  <div className="grid gap-2">
                    {group.items.map((formula) => {
                      const activeItem = formula.id === active.id;
                      return (
                        <button
                          key={formula.id}
                          type="button"
                          onClick={() => setSelectedId(formula.id)}
                          className={`rounded-card border p-3 text-left transition-colors ${
                            activeItem
                              ? 'border-blue bg-blue-lt'
                              : 'border-bdr bg-sur-2 hover:border-blue-bd hover:bg-blue-lt'
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[13px] font-bold text-navy">{formula.title}</span>
                            <span className={`inline-flex rounded-pill border px-2 py-0.5 text-[9px] font-bold ${CATEGORY_META[formula.category].classes}`}>
                              {CATEGORY_META[formula.category].label}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-2">{formula.titleEn}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null
            )}
            {!filtered.length && (
              <div className="rounded-card border border-dashed border-bdr-2 bg-sur-2 px-4 py-6 text-center text-[12px] text-text-2">
                ამ ძიებით formula ვერ მოიძებნა.
              </div>
            )}
          </div>
        </aside>

        {active ? (
          <main className="grid gap-4 print:block">
            <section className="rounded-card border border-bdr bg-sur p-4 shadow-card print:break-inside-avoid">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex rounded-pill border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                    {CATEGORY_META[active.category].label}
                  </div>
                  <h2 className="text-[24px] font-bold text-navy">{active.title}</h2>
                  <p className="mt-1 text-[13px] text-text-2">
                    {active.titleEn} · {REFS[active.refKey].std} · {REFS[active.refKey].sec}
                  </p>
                </div>
                <div className="rounded-card border border-bdr bg-sur-2 px-3 py-2">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                    Citation
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-navy">
                    {REFS[active.refKey].eq}
                  </div>
                </div>
              </div>

              <div className="rounded-card border border-bdr bg-sur-2 p-4">
                <BlockMath math={active.expression} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-card border border-bdr bg-sur-2 p-4">
                  <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                    ახსნა
                  </div>
                  <p className="text-[13px] leading-6 text-text-2">{active.explanation}</p>
                </div>
                <div className="rounded-card border border-bdr bg-sur-2 p-4">
                  <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                    გამოიყენება
                  </div>
                  <div className="grid gap-2">
                    {active.usedIn.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-[6px] border border-bdr bg-sur px-3 py-2 text-[12px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-card border border-bdr bg-sur p-4 shadow-card print:break-inside-avoid">
              <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                ცვლადები
              </div>
              <div className="overflow-hidden rounded-card border border-bdr">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-sur-2">
                      <th className="border-b border-bdr px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                        სიმბოლო
                      </th>
                      <th className="border-b border-bdr px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                        ერთეული
                      </th>
                      <th className="border-b border-bdr px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                        განმარტება
                      </th>
                      <th className="border-b border-bdr px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                        Typical
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.variables.map((item) => (
                      <tr key={item.symbol} className="border-b border-bdr last:border-b-0">
                        <td className="px-3 py-2 text-[12px] font-semibold text-navy">
                          <InlineMath math={item.symbol} />
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-2">{item.unit}</td>
                        <td className="px-3 py-2 text-[12px] text-text-2">{item.label}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-3">
                          {item.typical ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] print:break-inside-avoid">
              <article className="rounded-card border border-bdr bg-sur p-4 shadow-card">
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  Worked Example
                </div>
                <p className="mb-3 text-[13px] text-text-2">{active.example.intro}</p>
                <div className="mb-3 grid gap-2 rounded-card border border-bdr bg-sur-2 p-3">
                  {active.example.inputs.map((line) => (
                    <div key={line} className="font-mono text-[11px] text-text-2">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="rounded-card border border-blue-bd bg-blue-lt p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-blue">
                    {active.example.resultLabel}
                  </div>
                  <div className="mt-1 text-[18px] font-bold text-navy">
                    {active.example.resultValue}
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-text-2">{active.example.conclusion}</p>
                </div>
              </article>

              <article className="rounded-card border border-bdr bg-sur p-4 shadow-card">
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  სტანდარტები
                </div>
                <div className="grid gap-2">
                  {STANDARD_SUMMARY.map((item) => (
                    <div key={item.key} className="rounded-card border border-bdr bg-sur-2 px-3 py-2">
                      <div className="text-[12px] font-bold text-navy">{item.title}</div>
                      <div className="mt-1 text-[11px] text-text-2">{item.note}</div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </main>
        ) : (
          <div className="rounded-card border border-bdr bg-sur p-8 text-center text-[13px] text-text-2 shadow-card">
            ფორმულა ვერ მოიძებნა.
          </div>
        )}
      </div>
    </div>
  );
}
