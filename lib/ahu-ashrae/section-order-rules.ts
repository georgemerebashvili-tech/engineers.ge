/**
 * Standard-aligned ordering rules for AHU section chain.
 *
 * Rules encode hard constraints from ASHRAE / EN 13053 practice:
 *   - air-side direction is index 0 → N
 *   - filters must progress coarse → fine
 *   - HR is on the OA side, before mixing
 *   - mixing precedes conditioning coils
 *   - preheat → cool → reheat
 *   - humidifier sits after filters and after fan
 *   - silencer follows fan
 *
 * Pure module — no React, no I/O. Used by the UI for drag-drop validation
 * and a legend explaining what is forbidden.
 */

import type { SectionConfig, SectionType, FilterClass } from './sections';
import type { AhuType } from './types';

// Coarse → fine filter rank. Equal ranks (e.g. F9 and carbon) are
// interchangeable; lower rank cannot follow a higher rank.
export const FILTER_RANK: Record<FilterClass, number> = {
  G4: 1,
  M5: 2,
  F7: 3,
  F9: 4,
  carbon: 4,
  electric: 4,
  H13: 5,
  H14: 6,
};

const FILTER_LABEL: Record<FilterClass, string> = {
  G4: 'G4 (მსხვილი)',
  M5: 'M5 (საშუალო)',
  F7: 'F7 (წვრილი)',
  F9: 'F9 (წვრილი)',
  carbon: 'ნახშირი',
  electric: 'ელექტრო',
  H13: 'H13 (HEPA)',
  H14: 'H14 (HEPA)',
};

export interface OrderViolation {
  rule: string;
  /** Index of the offending section (or one end of the conflict) */
  index: number;
  /** Index of the related section (the other end) */
  conflictWith: number;
  message: string;
}

interface PairRule {
  code: string;
  /** Type that must come before */
  before: SectionType;
  /** Type that must come after */
  after: SectionType;
  message: string;
}

/**
 * Pair rules — for every pair (A=before, B=after), every A index must
 * be strictly smaller than every B index.
 */
const PAIR_RULES: PairRule[] = [
  // OA-side ordering — damper at the very front of the OA path
  { code: 'damper-before-filter', before: 'damper', after: 'filter',
    message: 'OA დემპერი ფილტრის წინ — დემპერი არეგულირებს გარე ჰაერს, ფილტრი მერე წმენდს.' },
  { code: 'damper-before-hr', before: 'damper', after: 'heat_recovery',
    message: 'OA დემპერი რეკუპერატორის წინ — HR-ი მუშაობს გარე ჰაერზე.' },
  { code: 'damper-before-mix', before: 'damper', after: 'mixing_box',
    message: 'OA დემპერი შერევის ყუთის წინ — ჯერ მოგვაქვს გარე ჰაერი, მერე ერევა.' },

  // Heat recovery is on the OA side, before mixing
  { code: 'hr-before-mix', before: 'heat_recovery', after: 'mixing_box',
    message: 'რეკუპერატორი უნდა იყოს შერევის ყუთის წინ — HR-ის ერთი მხარე გარე ჰაერია, მეორე — გამოსაშვები. შერევის შემდეგ არ მუშაობს.' },

  // Mixing happens before any conditioning
  { code: 'mix-before-cool', before: 'mixing_box', after: 'cooling_coil',
    message: 'შერევის ყუთი გამაგრილებლის წინ — გავაგრილოთ უკვე შერეული ჰაერი, რომ სუპლი იყოს კონდიცირებული.' },
  { code: 'mix-before-preheat', before: 'mixing_box', after: 'preheat',
    message: 'შერევის ყუთი წინა გათბობის წინ.' },
  { code: 'mix-before-reheat', before: 'mixing_box', after: 'reheat',
    message: 'შერევის ყუთი უკანა გათბობის წინ.' },

  // Thermal sequence: preheat → cool → reheat
  { code: 'preheat-before-cool', before: 'preheat', after: 'cooling_coil',
    message: 'წინა გათბობა გამაგრილებლის წინ — ზამთრის ანტი-ფრიზის ფუნქცია, ცხელი ხვიის ცივ ჰაერში გათოშვის წინააღმდეგ.' },
  { code: 'cool-before-reheat', before: 'cooling_coil', after: 'reheat',
    message: 'გაგრილება უკანა გათბობის წინ — ჯერ წვიმს გავათმენთ (dehumidify), მერე ტემპერატურა მოვიყვანოთ კომფორტზე.' },

  // Humidifier — must follow all filters (won't wet them) and the fan
  { code: 'filter-before-hum', before: 'filter', after: 'humidifier',
    message: 'გამატენიანებელი ვერ დადგება ფილტრის წინ — წვეთები ფილტრს დაასველებს, ΔP გაიზრდება, მიკრობიოლოგიური რისკი (mould).' },
  { code: 'fan-before-hum', before: 'fan', after: 'humidifier',
    message: 'გამატენიანებელი (განს. ორთქლის/ელექტროს) ვენტილატორის შემდეგ — სტანდარტი მოითხოვს, რომ ჰაერი ვენტილატორის გავლის შემდეგ გატენიანდეს, რომ ფანის მოტორი არ იყოს ნოტიო ჰაერში.' },
  { code: 'cool-before-hum', before: 'cooling_coil', after: 'humidifier',
    message: 'გამატენიანებელი გაგრილების შემდეგ — სხვაგვარად ცივი ხვია გააკონდენსირებს ახლო-ახლო დატენიანებულ ჰაერს.' },

  // Silencer follows the fan (noise source is the fan)
  { code: 'fan-before-silencer', before: 'fan', after: 'silencer',
    message: 'ხმოვანი დამცავი ვენტილატორის შემდეგ — silencer აქრობს ფანის ხმაურს; თუ ფანის წინ არის, მას აზრი არა აქვს.' },
];

const TYPE_LABEL_KA: Record<SectionType, string> = {
  damper: 'დემპერი',
  filter: 'ფილტრი',
  mixing_box: 'შერევის ყუთი',
  heat_recovery: 'რეკუპერატორი',
  preheat: 'წინა გათბობა',
  cooling_coil: 'გამაგრილებელი',
  reheat: 'უკანა გათბობა',
  humidifier: 'გამატენიანებელი',
  fan: 'ვენტილატორი',
  silencer: 'ხმოვანი დამცავი',
};

/**
 * AHU-type-level forbidden section types.
 * supply_only = no exhaust stream → heat recovery is physically impossible.
 */
const AHU_FORBIDDEN: Partial<Record<AhuType, SectionType[]>> = {
  supply_only: ['heat_recovery'],
};

/**
 * Validate the proposed section sequence. Returns all violations.
 * Empty array → sequence is standards-compliant.
 */
export function validateOrder(sections: SectionConfig[], ahuType?: AhuType): OrderViolation[] {
  const v: OrderViolation[] = [];

  // R0 — AHU-type-level forbidden sections
  if (ahuType) {
    const forbidden = AHU_FORBIDDEN[ahuType] ?? [];
    for (let i = 0; i < sections.length; i++) {
      if (forbidden.includes(sections[i].spec.type)) {
        v.push({
          rule: 'ahu-type-forbidden',
          index: i,
          conflictWith: -1,
          message: `${TYPE_LABEL_KA[sections[i].spec.type]} — ეს სექცია ამ AHU ტიპისთვის დაუშვებელია. "წინდინება (Direct flow)" სქემაში გამოსაშვები ნაკადი არ არის, რეკუპერატორი ვერ იმუშავებს.`,
        });
      }
    }
  }

  // R1 — filter class progression (coarse → fine)
  let lastRank = 0;
  let lastIdx = -1;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.spec.type !== 'filter') continue;
    const rank = FILTER_RANK[s.spec.params.filterClass];
    if (lastIdx >= 0 && rank < lastRank) {
      const prev = sections[lastIdx];
      if (prev.spec.type === 'filter') {
        v.push({
          rule: 'filter-class',
          index: i,
          conflictWith: lastIdx,
          message: `ფილტრის კლასი მცირდება: ${FILTER_LABEL[s.spec.params.filterClass]} ვერ დადგება ${FILTER_LABEL[prev.spec.params.filterClass]}-ის შემდეგ. წესი: მსხვილიდან წვრილისკენ (G → M → F → H).`,
        });
      }
    }
    if (rank > lastRank) {
      lastRank = rank;
      lastIdx = i;
    }
  }

  // R2 — pair rules
  for (const r of PAIR_RULES) {
    const beforeIdxs: number[] = [];
    const afterIdxs: number[] = [];
    for (let i = 0; i < sections.length; i++) {
      const t = sections[i].spec.type;
      if (t === r.before) beforeIdxs.push(i);
      if (t === r.after) afterIdxs.push(i);
    }
    if (beforeIdxs.length === 0 || afterIdxs.length === 0) continue;
    // Every "before" must come strictly before every "after"
    for (const bi of beforeIdxs) {
      for (const ai of afterIdxs) {
        if (bi >= ai) {
          v.push({ rule: r.code, index: ai, conflictWith: bi, message: r.message });
        }
      }
    }
  }

  // De-duplicate identical (rule, index, conflictWith) entries
  const seen = new Set<string>();
  return v.filter((x) => {
    const k = `${x.rule}:${x.index}:${x.conflictWith}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Attempt to move section at `fromIdx` to slot `toIdx`. Returns the new
 * sequence if it's valid, or a reason why it isn't.
 *
 * `toIdx` is the index BEFORE removal — so dragging item 2 onto position 5
 * means it lands in the slot currently occupied by item 5.
 */
export function tryReorder(
  sections: SectionConfig[],
  fromIdx: number,
  toIdx: number,
  ahuType?: AhuType,
): { ok: true; next: SectionConfig[] } | { ok: false; reason: string; rule: string } {
  if (fromIdx === toIdx) return { ok: true, next: sections };
  if (fromIdx < 0 || fromIdx >= sections.length) {
    return { ok: false, reason: 'არასწორი წყარო ინდექსი.', rule: 'invalid-from' };
  }
  const clamped = Math.max(0, Math.min(toIdx, sections.length - 1));

  const next = [...sections];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(clamped, 0, moved);

  // Re-write order field for stability
  const stamped = next.map((s, i) => ({ ...s, order: i }));

  const violations = validateOrder(stamped, ahuType);
  // Only block if the moved section is part of any violation
  const movedNewIdx = clamped;
  const blocking = violations.find(
    (x) => x.index === movedNewIdx || x.conflictWith === movedNewIdx,
  );
  if (blocking) {
    return { ok: false, reason: blocking.message, rule: blocking.rule };
  }
  return { ok: true, next: stamped };
}

/**
 * Human-readable rule legend for the UI.
 */
export const ORDER_RULE_LEGEND: Array<{ code: string; ka: string }> = [
  { code: 'damper-first', ka: 'OA დემპერი — ჰაერის შესასვლელთან, ფილტრის/HR-ის/შერევის წინ.' },
  { code: 'filter-class', ka: 'ფილტრები მსხვილიდან წვრილისკენ: G4 → M5 → F7 → F9 → H13/H14. წვრილი წინ უმსხვილესს — აკრძალულია.' },
  { code: 'hr-before-mix', ka: 'რეკუპერატორი შერევის ყუთის წინ (HR გარე ჰაერზე მუშაობს).' },
  { code: 'mix-before-coils', ka: 'შერევის ყუთი ყველა ხვიის წინ — ვაკონდიცირებთ შერეულ ჰაერს.' },
  { code: 'thermal-order', ka: 'წინა გათბობა → გაგრილება → უკანა გათბობა.' },
  { code: 'humidifier-pos', ka: 'გამატენიანებელი — ყველა ფილტრის და ვენტილატორის შემდეგ; გაგრილების შემდეგ.' },
  { code: 'silencer-last', ka: 'ხმოვანი დამცავი ვენტილატორის შემდეგ.' },
];
