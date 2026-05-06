// AHU Style / Heat Recovery Type Specifications
// Source: ASHRAE Systems & Equipment Handbook ch.26 (Air-to-Air Energy Recovery)

import type { AhuType } from './types';

export interface AhuTypeSpec {
  id: AhuType;
  title: string;            // Georgian display name
  titleEn: string;          // English standard name
  shortLabel: string;       // for compact UI
  category: 'plate' | 'rotor' | 'fluid' | 'phase';
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
  schematic: 'crossflow' | 'counterflow' | 'rotor' | 'glycol' | 'heatpipe';
}

export const AHU_TYPES: AhuTypeSpec[] = [
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
    title: 'პირდაპირნაკადიანი როტორი',
    titleEn: 'Direct Flow Rotary Wheel (Sensible)',
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
    id: 'enthalpy_rotor',
    title: 'ენთალპიური როტორი',
    titleEn: 'Enthalpy Wheel (Total Energy)',
    shortLabel: 'Enthalpy Wheel',
    category: 'rotor',
    sensibleEffMin: 0.70, sensibleEffMax: 0.85,
    latentEffMin: 0.65,   latentEffMax: 0.80,
    dpMin: 175, dpMax: 350,
    contamination: 'low',
    frostRisk: 'low',
    bestFor: 'ნოტიო კლიმატი (ბათუმი, ფოთი), რესტორნები, საცხოვრებელი — სითბოც და ტენიც',
    notFor: 'ლაბორატორიები / IC-რუმები — ნებისმიერი ჰიგროსკოპული მიგრაცია მიუღებელია',
    description: 'მბრუნავი ჰიგროსკოპული მატრიცა (silica gel / molecular sieve). გადააქვს როგორც სითბო, ასევე ტენი. მაქსიმუმი ენერგიის მიმოცვლა.',
    ashraeRef: 'ASHRAE HVAC S&E ch.26.3 + ASHRAE 62.1 §5.16',
    accent: 'var(--grn)',
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
  {
    id: 'heat_pipe',
    title: 'სითბური მილი (Heat Pipe)',
    titleEn: 'Heat Pipe',
    shortLabel: 'Heat Pipe',
    category: 'phase',
    sensibleEffMin: 0.45, sensibleEffMax: 0.65,
    latentEffMin: 0,      latentEffMax: 0,
    dpMin: 100, dpMax: 250,
    contamination: 'none',
    frostRisk: 'low',
    bestFor: 'საავადმყოფოები, ლაბორატორიები — მოძრავი ნაწილების გარეშე, ნულოვანი დაბინძურება',
    notFor: 'მაღალი ეფექტურობის მოთხოვნები — ფირფიტა/როტორი უპირატესობს',
    description: 'ფაზობრივი გადასვლა — ცეცხცეცხლი მაცივარი მილებში. მოძრავი ნაწილების გარეშე, ჩუმი, ულტრა-საიმედო. ჰაერის ნაკადები ერთ კონსტრუქციაშია, მაგრამ ფიზიკურად განცალკევებული.',
    ashraeRef: 'ASHRAE HVAC S&E ch.26.6',
    accent: 'var(--ora)',
    schematic: 'heatpipe',
  },
];

export function getAhuTypeSpec(id: AhuType): AhuTypeSpec | undefined {
  return AHU_TYPES.find((t) => t.id === id);
}
