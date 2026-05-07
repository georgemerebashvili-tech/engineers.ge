// AHU Style / Heat Recovery Type Specifications
// Source: ASHRAE Systems & Equipment Handbook ch.26 (Air-to-Air Energy Recovery)

import type { AhuType } from './types';

export interface AhuTypeSpec {
  id: AhuType;
  title: string;            // Georgian display name
  titleEn: string;          // English standard name
  shortLabel: string;       // for compact UI
  category: 'supply' | 'hrv' | 'plate' | 'rotor' | 'fluid';
  // Performance
  sensibleEffMin: number;   // 0–1
  sensibleEffMax: number;
  latentEffMin: number;     // 0–1 (0 if sensible-only)
  latentEffMax: number;
  // Pressure drop
  dpMin: number;            // Pa per side
  dpMax: number;
  // Cross-contamination
  contamination: 'none' | 'low' | 'medium';
  // Frost protection
  frostRisk: 'low' | 'medium' | 'high';
  // Use cases
  bestFor: string;          // Georgian
  notFor: string;           // Georgian
  description: string;      // Georgian
  // Standards
  ashraeRef: string;
  // Visual identity
  accent: string;           // CSS color var
  schematic: 'supply' | 'hrv' | 'crossflow' | 'counterflow' | 'rotor' | 'glycol';
}

export const AHU_TYPES: AhuTypeSpec[] = [
  {
    id: 'supply_only',
    title: 'წინდინება (Direct flow)',
    titleEn: 'Direct-Flow Supply (Coils Only, No Recovery)',
    shortLabel: 'Direct flow',
    category: 'supply',
    sensibleEffMin: 0, sensibleEffMax: 0,
    latentEffMin: 0,   latentEffMax: 0,
    dpMin: 0, dpMax: 0,
    contamination: 'none',
    frostRisk: 'low',
    bestFor: 'მცირე საცხოვრებელი, სათავსოები, სარდაფი — მიწოდების მარტივი ვენტილაცია ხვიებით',
    notFor: 'მაღალი ეფექტურობა — რეკუპერაციის გარეშე ენერგია იკარგება გაწოვილ ჰაერთან',
    description: 'ცალმხრივი ნაკადი: გარე ჰაერი → ფილტრი → ხვიები (გათბობა/გაგრილება) → ვენტილატორი → ოთახი. რეკუპერატორი არ არის, მხოლოდ ხვიები ამუშავებს ჰაერის ტემპერატურას/ტენიანობას. მარტივი და იაფი.',
    ashraeRef: 'ASHRAE HVAC Apps ch.4 (residential / small commercial)',
    accent: 'var(--text-2)',
    schematic: 'supply',
  },
  {
    id: 'hrv',
    title: 'ენერგო-რეკუპერაცია (HRV / HRU)',
    titleEn: 'Energy Recovery Ventilator (HRV/HRU)',
    shortLabel: 'HRV',
    category: 'hrv',
    sensibleEffMin: 0.65, sensibleEffMax: 0.90,
    latentEffMin: 0,      latentEffMax: 0,
    dpMin: 100, dpMax: 250,
    contamination: 'none',
    frostRisk: 'medium',
    bestFor: 'საცხოვრებელი / პატარა ოფისი — დაბალანსებული მოდინება + გაწოვა + რეკუპერატორი ხვიების გარეშე',
    notFor: 'ცენტრალური მაღალი სიმძლავრე — coil-ები ცალკე AHU-ში სჯობს',
    description: 'მცირე მოწყობილობა: მიმწოდი + უკუვენტილატორი + რეკუპერატორი (ფირფიტა ან როტორი) ერთ კარკასში. ხვიები არ არის — სუფთა ვენტილაციური ერთეული.',
    ashraeRef: 'ASHRAE HVAC Apps ch.1 (HRV/ERV)',
    accent: 'var(--grn)',
    schematic: 'hrv',
  },
  {
    id: 'crossflow_plate',
    title: 'ჯვარედინ-ნაკადიანი რეკუპერატორი',
    titleEn: 'Cross-Flow Plate Recuperator',
    shortLabel: 'Crossflow',
    category: 'plate',
    sensibleEffMin: 0.50, sensibleEffMax: 0.65,
    latentEffMin: 0,      latentEffMax: 0,
    dpMin: 150, dpMax: 300,
    contamination: 'none',
    frostRisk: 'medium',
    bestFor: 'ოფისები, სავაჭრო ცენტრები — როცა მცირე ჰიგროსკოპული გადაცვლა საჭიროა',
    notFor: 'სველი / დაკავებადი ზონები (აუზი, საპირფარეშო) — მცირე latent recovery',
    description: 'მუდმივი ფირფიტები ჯვარედინი ნაკადით; ნაკადები არ ერევა, არ არის ჯვარედინი დაბინძურება. მარტივი, საიმედო, საშუალო ეფექტურობა.',
    ashraeRef: 'ASHRAE HVAC S&E ch.26.4',
    accent: 'var(--blue)',
    schematic: 'crossflow',
  },
  {
    id: 'counterflow_plate',
    title: 'საპირისპირო-ნაკადიანი რეკუპერატორი',
    titleEn: 'Counter-Flow Plate Recuperator',
    shortLabel: 'Counterflow',
    category: 'plate',
    sensibleEffMin: 0.70, sensibleEffMax: 0.90,
    latentEffMin: 0,      latentEffMax: 0,
    dpMin: 200, dpMax: 400,
    contamination: 'none',
    frostRisk: 'high',
    bestFor: 'მაღალი ეფექტურობის სავენტილაციო სისტემები, ASHRAE 90.1 §6.5.6.1',
    notFor: 'ცივი კლიმატი frost-protection-ის გარეშე — გათოშვის რისკი',
    description: 'ფირფიტები საპირისპირო ნაკადებით — მაქსიმალური სითბო-მიმოცვლა. 90% სენსიბ. ეფექტურობა შესაძლებელია. ASHRAE 90.1-ის სტანდარტული არჩევანი.',
    ashraeRef: 'ASHRAE HVAC S&E ch.26.4 + ASHRAE 90.1 §6.5.6',
    accent: 'var(--navy)',
    schematic: 'counterflow',
  },
  {
    id: 'direct_flow_rotor',
    title: 'მბრუნავი როტორი (sensible)',
    titleEn: 'Sensible Rotary Wheel',
    shortLabel: 'Sensible Wheel',
    category: 'rotor',
    sensibleEffMin: 0.70, sensibleEffMax: 0.85,
    latentEffMin: 0,      latentEffMax: 0,
    dpMin: 150, dpMax: 300,
    contamination: 'low',
    frostRisk: 'low',
    bestFor: 'სავენტილაციო სისტემები, სადაც ლატენტური მიმოცვლა საჭირო არ არის',
    notFor: 'ულტრა-სუფთა ოთახები (cleanroom) — purge sector-მაც კი გადატანის გარკვეული რისკი',
    description: 'მბრუნავი მატრიცა ალუმინის/ფოლადის. მხოლოდ სენსიბელური სითბო. დაბალი ΔP, ნაკლები გათოშვის რისკი ვიდრე ფირფიტას.',
    ashraeRef: 'ASHRAE HVAC S&E ch.26.3',
    accent: 'var(--ora)',
    schematic: 'rotor',
  },
  {
    id: 'run_around_coil',
    title: 'Run-Around წყლის ციკლი',
    titleEn: 'Run-Around Coil Loop (Glycol)',
    shortLabel: 'Run-around',
    category: 'fluid',
    sensibleEffMin: 0.45, sensibleEffMax: 0.65,
    latentEffMin: 0,      latentEffMax: 0,
    dpMin: 150, dpMax: 250,
    contamination: 'none',
    frostRisk: 'low',
    bestFor: 'როცა მიწოდების და გასაშვები ჰაერი ფიზიკურად ცალ-ცალკეა (სხვადასხვა სართული)',
    notFor: 'პატარა AHU — ტუმბო + დამხმარე ფურნიტურა გაამძიმებს სისტემას',
    description: 'ორი წყლის სპირალი — ერთი მიწოდებაში, მეორე გასაშვებში — ციკლირებული გლიკოლის ხსნარით. სრულად განცალკევებული ჰაერის ნაკადები.',
    ashraeRef: 'ASHRAE HVAC S&E ch.26.5',
    accent: 'var(--blue)',
    schematic: 'glycol',
  },
];

export function getAhuTypeSpec(id: AhuType): AhuTypeSpec | undefined {
  return AHU_TYPES.find((t) => t.id === id);
}
