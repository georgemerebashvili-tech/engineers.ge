// DMT — shared option-set ("variables") library.
// Stored in localStorage; reused by any grid column of kind "select".

export type VarColor =
  | 'gray'
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'purple'
  | 'pink'
  | 'yellow'
  | 'teal'
  | 'navy';

export type VarOption = {
  id: string;
  label: string;
  color: VarColor;
};

export type VarSet = {
  id: string;
  name: string;
  type: 'single' | 'multi';
  options: VarOption[];
};

export const COLOR_STYLES: Record<
  VarColor,
  {color: string; bg: string; border: string}
> = {
  gray:   {color: 'var(--text-2)', bg: 'var(--sur-2)',  border: 'var(--bdr)'},
  blue:   {color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  green:  {color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  orange: {color: 'var(--ora)',    bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  red:    {color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'},
  purple: {color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  pink:   {color: '#db2777',       bg: '#fce7f3',        border: '#f9a8d4'},
  yellow: {color: '#a16207',       bg: '#fef3c7',        border: '#fcd34d'},
  teal:   {color: '#0d9488',       bg: '#ccfbf1',        border: '#5eead4'},
  navy:   {color: '#ffffff',       bg: 'var(--navy)',    border: 'var(--navy)'}
};

export const COLORS: VarColor[] = [
  'gray',
  'blue',
  'green',
  'orange',
  'red',
  'purple',
  'pink',
  'yellow',
  'teal',
  'navy'
];

export const STORE_KEY = 'dmt_variable_sets_v1';

export const DEFAULT_SETS: VarSet[] = [
  {
    id: 'status-lead',
    name: 'ლიდის სტატუსი',
    type: 'single',
    options: [
      {id: 'potential', label: 'პოტენციური', color: 'orange'},
      {id: 'level-up', label: 'Level UP', color: 'yellow'},
      {id: 'later', label: 'მოგვიანებით მოსაკითხი', color: 'gray'},
      {id: 'interested', label: 'დაინტერესებული', color: 'pink'},
      {id: 'negotiating', label: 'მოლაპარაკების პროცესი', color: 'purple'},
      {id: 'to-send', label: 'გასაგზავნია შეთავაზება', color: 'yellow'},
      {id: 'sent', label: 'გაგზავნილია შეთავაზება', color: 'orange'},
      {id: 'contract-ready', label: 'კონტრაქტი დასადები', color: 'blue'},
      {id: 'to-install', label: 'დასამონტაჟებელი', color: 'teal'},
      {id: 'testing', label: 'სატესტო პერიოდი', color: 'yellow'},
      {id: 'active', label: 'აქტიური დილერი', color: 'green'},
      {id: 'contracted', label: 'დაკონტრაქტებული', color: 'green'},
      {id: 'failed', label: 'ვერ შედგა შეთანხმება', color: 'red'},
      {id: 'to-remove', label: 'ჩამოსაშლელი', color: 'red'},
      {id: 'unassigned', label: 'თავმოუბმელი', color: 'gray'}
    ]
  },
  {
    id: 'role',
    name: 'როლი',
    type: 'single',
    options: [
      {id: 'end-user', label: 'End user', color: 'gray'},
      {id: 'consultant', label: 'Consultant', color: 'blue'},
      {id: 'contractor', label: 'Contractor', color: 'purple'},
      {id: 'designer', label: 'Designer', color: 'pink'},
      {id: 'supplier', label: 'Supplier', color: 'orange'}
    ]
  },
  {
    id: 'priority',
    name: 'პრიორიტეტი',
    type: 'single',
    options: [
      {id: 'urgent', label: '🔴 Urgent', color: 'red'},
      {id: 'high', label: '🟠 High', color: 'orange'},
      {id: 'medium', label: '🟡 Medium', color: 'yellow'},
      {id: 'low', label: '🟢 Low', color: 'green'}
    ]
  }
];

export function loadSets(): VarSet[] {
  if (typeof window === 'undefined') return DEFAULT_SETS;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VarSet[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_SETS;
}

export function saveSets(sets: VarSet[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(sets));
  } catch {}
}

export function findOption(
  sets: VarSet[],
  setId: string,
  optionId: string
): {set: VarSet; option: VarOption} | null {
  const set = sets.find((s) => s.id === setId);
  if (!set) return null;
  const option = set.options.find((o) => o.id === optionId);
  if (!option) return null;
  return {set, option};
}

export function randomId(prefix = 'id') {
  return prefix + '-' + Math.random().toString(36).slice(2, 9);
}
