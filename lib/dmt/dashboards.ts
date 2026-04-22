// DMT — dashboard builder storage + widget registry + demo data sources.
// Everything persists to localStorage for demo; swap to Supabase later.

export type WidgetType =
  | 'stat'
  | 'bar'
  | 'pie'
  | 'line'
  | 'table'
  | 'filter'
  | 'note';

export type DataSource = 'invoices' | 'inventory';

export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max';

export type WidgetConfig = {
  title?: string;
  source?: DataSource;
  field?: string;
  groupBy?: string;
  agg?: Aggregation;
  limit?: number;
  columns?: string[];
  text?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'navy';
  statusFilter?: string;
};

export type Widget = {
  id: string;
  type: WidgetType;
  w: 3 | 4 | 6 | 8 | 9 | 12;
  h: 1 | 2 | 3 | 4;
  config: WidgetConfig;
};

export type Dashboard = {
  id: string;
  name: string;
  widgets: Widget[];
  createdAt: number;
  updatedAt: number;
};

export type WidgetTemplate = {
  id: string;
  name: string;
  type: WidgetType;
  w: Widget['w'];
  h: Widget['h'];
  config: WidgetConfig;
};

const STORE_KEY = 'dmt_dashboards_v1';
const ACTIVE_KEY = 'dmt_dashboards_active_v1';
const TEMPLATES_KEY = 'dmt_dashboard_templates_v1';

export const DEMO_DASHBOARDS: Dashboard[] = [
  {
    id: 'default',
    name: 'მთავარი მიმოხილვა',
    widgets: [
      {id: 'w1', type: 'stat', w: 3, h: 1, config: {title: 'სულ ინვოისი', source: 'invoices', agg: 'count', color: 'navy'}},
      {id: 'w2', type: 'stat', w: 3, h: 1, config: {title: 'Σ თანხა', source: 'invoices', field: 'amount', agg: 'sum', color: 'green'}},
      {id: 'w3', type: 'stat', w: 3, h: 1, config: {title: 'საშუალო ინვოისი', source: 'invoices', field: 'amount', agg: 'avg', color: 'blue'}},
      {id: 'w4', type: 'stat', w: 3, h: 1, config: {title: 'გადახდილი', source: 'invoices', agg: 'count', statusFilter: 'paid', color: 'green'}},
      {id: 'w5', type: 'pie', w: 6, h: 3, config: {title: 'განაწილება სტატუსის მიხედვით', source: 'invoices', groupBy: 'status'}},
      {id: 'w6', type: 'bar', w: 6, h: 3, config: {title: 'თანხა კლიენტის მიხედვით', source: 'invoices', groupBy: 'client', field: 'amount', agg: 'sum'}},
      {id: 'w7', type: 'table', w: 12, h: 3, config: {title: 'ბოლო ინვოისები', source: 'invoices', limit: 5, columns: ['id', 'client', 'amount', 'status', 'period']}}
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export const WIDGET_META: Record<
  WidgetType,
  {label: string; description: string; defaultW: Widget['w']; defaultH: Widget['h']; defaultConfig: WidgetConfig}
> = {
  stat: {
    label: 'KPI ქარდი',
    description: 'ერთი მეტრიკა — count / sum / avg',
    defaultW: 3,
    defaultH: 1,
    defaultConfig: {title: 'მეტრიკა', source: 'invoices', agg: 'count', color: 'blue'}
  },
  bar: {
    label: 'ბარ-დიაგრამა',
    description: 'ჯგუფების შედარება',
    defaultW: 6,
    defaultH: 3,
    defaultConfig: {title: 'ბარ-დიაგრამა', source: 'invoices', groupBy: 'status', agg: 'count'}
  },
  pie: {
    label: 'Pie / დონატი',
    description: 'წილი მთელში',
    defaultW: 6,
    defaultH: 3,
    defaultConfig: {title: 'განაწილება', source: 'invoices', groupBy: 'status'}
  },
  line: {
    label: 'ლაინ-დიაგრამა',
    description: 'ტრენდი დროში',
    defaultW: 6,
    defaultH: 3,
    defaultConfig: {title: 'ტრენდი', source: 'invoices', groupBy: 'period', field: 'contract', agg: 'sum'}
  },
  table: {
    label: 'ცხრილი',
    description: 'ტოპ N row',
    defaultW: 12,
    defaultH: 3,
    defaultConfig: {title: 'ცხრილი', source: 'invoices', limit: 5, columns: ['company', 'contact', 'status', 'contract']}
  },
  filter: {
    label: 'ფილტრი',
    description: 'სტატუსით შეზღუდვა',
    defaultW: 3,
    defaultH: 1,
    defaultConfig: {title: 'ფილტრი', source: 'invoices', field: 'status'}
  },
  note: {
    label: 'ჩანიშვნა',
    description: 'ტექსტური ბლოკი',
    defaultW: 6,
    defaultH: 1,
    defaultConfig: {title: 'ჩანიშვნა', text: 'აქ დაწერე კონტექსტი…'}
  }
};

// Demo fallback data for sources without local storage.

const DEMO_INVENTORY = [
  {sku: 'FC-ECO-12', category: 'ფანი', stock: 48, price: 280},
  {sku: 'VRV-OUT-22', category: 'კონდიც.', stock: 6, price: 4200},
  {sku: 'DUCT-ISO-5', category: 'სავენტილ.', stock: 120, price: 18},
  {sku: 'AHU-5000', category: 'AHU', stock: 2, price: 16500},
  {sku: 'TEMP-SENS', category: 'სენსორი', stock: 284, price: 45}
];

const DEMO_INVOICES = [
  {id: 'INV-0041', client: 'ცელსიუსი', amount: 4820, status: 'paid', period: 'Q2 2026'},
  {id: 'INV-0042', client: 'ტუმბო', amount: 1250, status: 'due', period: 'Q2 2026'},
  {id: 'INV-0043', client: 'ალფა-ინჟ.', amount: 8400, status: 'overdue', period: 'Q2 2026'},
  {id: 'INV-0044', client: 'Smart Building', amount: 1800, status: 'paid', period: 'Q1 2026'},
  {id: 'INV-0045', client: 'BGEO Group', amount: 6300, status: 'paid', period: 'Q1 2026'}
];

export function loadDataSource(src: DataSource): Array<Record<string, unknown>> {
  if (src === 'invoices') return DEMO_INVOICES;
  if (src === 'inventory') return DEMO_INVENTORY;
  return [];
}

export function getFields(src: DataSource): string[] {
  const rows = loadDataSource(src);
  if (rows.length === 0) {
    if (src === 'invoices') return ['id', 'client', 'amount', 'status', 'period'];
    if (src === 'inventory') return ['sku', 'category', 'stock', 'price'];
  }
  return Object.keys(rows[0] ?? {});
}

export function computeAgg(
  rows: Array<Record<string, unknown>>,
  field: string | undefined,
  agg: Aggregation
): number {
  if (agg === 'count') return rows.length;
  if (!field) return 0;
  const nums = rows
    .map((r) => Number(r[field]))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  if (agg === 'sum') return nums.reduce((s, n) => s + n, 0);
  if (agg === 'avg') return nums.reduce((s, n) => s + n, 0) / nums.length;
  if (agg === 'min') return Math.min(...nums);
  if (agg === 'max') return Math.max(...nums);
  return 0;
}

export function groupRows(
  rows: Array<Record<string, unknown>>,
  groupBy: string,
  field: string | undefined,
  agg: Aggregation
): Array<{name: string; value: number}> {
  const map = new Map<string, Array<Record<string, unknown>>>();
  for (const r of rows) {
    const key = String(r[groupBy] ?? '—');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([name, items]) => ({
    name,
    value: computeAgg(items, field, agg)
  }));
}

export function loadDashboards(): Dashboard[] {
  if (typeof window === 'undefined') return DEMO_DASHBOARDS;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Dashboard[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEMO_DASHBOARDS;
}

export function saveDashboards(list: Dashboard[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {}
}

export function loadActiveId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

export function loadTemplates(): WidgetTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveTemplates(list: WidgetTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
  } catch {}
}

export function formatValue(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 10000) {
    return n.toLocaleString('en-US', {maximumFractionDigits: 0});
  }
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export function randomId(prefix = 'w') {
  return prefix + '-' + Math.random().toString(36).slice(2, 9);
}
