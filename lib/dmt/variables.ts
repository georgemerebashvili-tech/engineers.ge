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

// ════════════════════════════════════════════════════════════════════
// Page → Table → Column schema (configurable per-page variable system)
// ════════════════════════════════════════════════════════════════════

export type ColumnKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'phone'
  | 'date'
  | 'user'
  | 'select';

export type ColumnScope = 'universal' | 'fixed';

export type PageColumn = {
  id: string;
  label: string;
  kind: ColumnKind;
  /** Only for kind === 'select'. 'universal' → bind to VarSet; 'fixed' → inline options on this column */
  scope?: ColumnScope;
  varSetId?: string;
  options?: VarOption[];
  required?: boolean;
  hint?: string;
};

export type PageTable = {
  id: string;
  label: string;
  description?: string;
  columns: PageColumn[];
};

export type PageScope = {
  id: string;
  label: string;
  route: string;
  icon?: string;
  tables: PageTable[];
};

export const PAGES_KEY = 'dmt_page_scopes_v1';

export const DEFAULT_PAGES: PageScope[] = [
  {
    id: 'inspections',
    label: 'ინსპექტირება',
    route: '/dmt/inspections',
    icon: '🔍',
    tables: [
      {
        id: 'main',
        label: 'ინსპექტირების სია',
        columns: [
          {id: 'site', label: 'ობიექტი', kind: 'text'},
          {id: 'inspector', label: 'ინსპექტორი', kind: 'user'},
          {id: 'date', label: 'თარიღი', kind: 'date'},
          {id: 'status', label: 'სტატუსი', kind: 'select', scope: 'fixed', options: [
            {id: 'planned', label: 'დაგეგმილი', color: 'blue'},
            {id: 'in-progress', label: 'მიმდინარე', color: 'orange'},
            {id: 'done', label: 'დასრულებული', color: 'green'},
            {id: 'issues', label: 'პრობლემებით', color: 'red'}
          ]},
          {id: 'priority', label: 'პრიორიტეტი', kind: 'select', scope: 'universal', varSetId: 'priority'},
          {id: 'notes', label: 'შენიშვნა', kind: 'textarea'}
        ]
      }
    ]
  },
  {
    id: 'invoices',
    label: 'ინვოისები',
    route: '/dmt/invoices',
    icon: '🧾',
    tables: [
      {
        id: 'main',
        label: 'ინვოისების სია',
        columns: [
          {id: 'number', label: '№', kind: 'text'},
          {id: 'client', label: 'კლიენტი', kind: 'text'},
          {id: 'amount', label: 'თანხა', kind: 'currency'},
          {id: 'issued_at', label: 'გაცემული', kind: 'date'},
          {id: 'due_at', label: 'ვადა', kind: 'date'},
          {id: 'status', label: 'სტატუსი', kind: 'select', scope: 'fixed', options: [
            {id: 'draft', label: 'მონახაზი', color: 'gray'},
            {id: 'sent', label: 'გაგზავნილი', color: 'blue'},
            {id: 'paid', label: 'გადახდილი', color: 'green'},
            {id: 'overdue', label: 'ვადაგადაცილებული', color: 'red'},
            {id: 'cancelled', label: 'გაუქმებული', color: 'gray'}
          ]}
        ]
      }
    ]
  },
  {
    id: 'announcements',
    label: 'განცხადებები',
    route: '/dmt/announcements',
    icon: '📣',
    tables: [
      {
        id: 'main',
        label: 'განცხადებების სია',
        columns: [
          {id: 'title', label: 'სათაური', kind: 'text'},
          {id: 'body', label: 'ტექსტი', kind: 'textarea'},
          {id: 'priority', label: 'პრიორიტეტი', kind: 'select', scope: 'universal', varSetId: 'priority'},
          {id: 'visibility', label: 'ხილვადობა', kind: 'select', scope: 'fixed', options: [
            {id: 'all', label: 'ყველა', color: 'blue'},
            {id: 'role', label: 'როლით', color: 'purple'},
            {id: 'user', label: 'კონკრ. მომხმ.', color: 'orange'}
          ]},
          {id: 'published_at', label: 'გამოქვ.', kind: 'date'}
        ]
      }
    ]
  },
  {
    id: 'inventory-objects',
    label: 'ინვენტარი · ობიექტები',
    route: '/dmt/inventory/objects',
    icon: '📦',
    tables: [
      {
        id: 'main',
        label: 'ობიექტების სია',
        columns: [
          {id: 'name', label: 'დასახელება', kind: 'text'},
          {id: 'category', label: 'კატეგორია', kind: 'select', scope: 'fixed', options: [
            {id: 'machine', label: 'მოწყობილობა', color: 'blue'},
            {id: 'tool', label: 'ხელსაწყო', color: 'purple'},
            {id: 'consumable', label: 'საკონსუმოს', color: 'orange'},
            {id: 'vehicle', label: 'ტრანსპორტი', color: 'teal'}
          ]},
          {id: 'serial', label: 'სერიული №', kind: 'text'},
          {id: 'location', label: 'ადგილმდ.', kind: 'text'},
          {id: 'condition', label: 'მდგომარ.', kind: 'select', scope: 'fixed', options: [
            {id: 'new', label: 'ახალი', color: 'green'},
            {id: 'good', label: 'კარგი', color: 'blue'},
            {id: 'used', label: 'მეორ.', color: 'yellow'},
            {id: 'broken', label: 'გაფუჭებული', color: 'red'}
          ]}
        ]
      }
    ]
  },
  {
    id: 'inventory-sku',
    label: 'ინვენტარი · მარაგი · SKU',
    route: '/dmt/inventory/sku',
    icon: '🏷',
    tables: [
      {
        id: 'main',
        label: 'SKU სია',
        columns: [
          {id: 'sku', label: 'SKU', kind: 'text'},
          {id: 'name', label: 'დასახელება', kind: 'text'},
          {id: 'qty', label: 'რაოდ.', kind: 'number'},
          {id: 'unit', label: 'ერთ.', kind: 'select', scope: 'fixed', options: [
            {id: 'pcs', label: 'ცალი', color: 'gray'},
            {id: 'box', label: 'ყუთი', color: 'blue'},
            {id: 'm', label: 'm', color: 'teal'},
            {id: 'kg', label: 'kg', color: 'orange'}
          ]},
          {id: 'unit_price', label: 'ერთ. ფასი', kind: 'currency'}
        ]
      }
    ]
  },
  {
    id: 'products',
    label: 'პროდუქციის კატალოგი',
    route: '/dmt/products',
    icon: '🛒',
    tables: [
      {
        id: 'main',
        label: 'პროდუქცია',
        columns: [
          {id: 'name', label: 'დასახელება', kind: 'text'},
          {id: 'brand', label: 'ბრენდი', kind: 'text'},
          {id: 'model', label: 'მოდელი', kind: 'text'},
          {id: 'category', label: 'კატეგორია', kind: 'select', scope: 'fixed', options: [
            {id: 'hvac', label: 'HVAC', color: 'blue'},
            {id: 'water', label: 'წყალი', color: 'teal'},
            {id: 'electric', label: 'ელ.', color: 'yellow'},
            {id: 'fire', label: 'ხანძ.', color: 'red'}
          ]},
          {id: 'price', label: 'ფასი', kind: 'currency'},
          {id: 'stock', label: 'მარაგი', kind: 'number'}
        ]
      }
    ]
  }
];

export function loadPages(): PageScope[] {
  if (typeof window === 'undefined') return DEFAULT_PAGES;
  try {
    const raw = localStorage.getItem(PAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PageScope[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PAGES;
}

export function savePages(pages: PageScope[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
  } catch {}
}
