export type ComponentRow = {
  id: string;
  name: string;
  type: string;   // doubles as "model" for TRM catalog matching
  qty: number;
  unit: string;
  price: number;  // per unit
};

export type IoConnector = {
  id: string;
  name: string;   // e.g. "J1"
  kind: string;   // "Analog IN", "Digital OUT", "Modbus", ...
  pin: string;
  notes: string;
};

export type ButtonAction = {
  id: string;
  name: string;   // Connect, Calibration, Reset
  steps: string;  // long step-by-step description
  notes: string;
};

export type ErrorEntry = {
  id: string;
  code: string;
  description: string;
  recovery: string;
};

export type ProductFile = {
  id: string;
  label: string;
  url: string;
  kind: 'firmware' | 'manual' | 'drawing' | 'datasheet' | 'other';
};

export type OverheadOp =
  | 'add'         // +value (fixed)
  | 'percent'     // +% of subtotal
  | 'multiply';   // ×value

export type OverheadRow = {
  id: string;
  label: string;
  op: OverheadOp;
  value: number;
};

export type Product = {
  id: string;
  name: string;
  version: string;
  type: string;              // e.g. "Control Board", "Pump", "Sensor"
  description: string;
  imageDataUrl: string;      // small preview, optional
  usage: string;             // where it's used
  components: ComponentRow[];
  overhead: OverheadRow[];
  // Structured spec (optional — back-fillable on old rows):
  pcbId?: string;
  connectionType?: string;   // "Analog" / "Digital" / "Modbus RTU" / ...
  connectionName?: string;
  rwOptions?: string;
  reservedKeys?: string[];   // ["L1", "I_L1", "S_L1", ...]
  recommendation?: string;
  ioConnectors?: IoConnector[];
  buttons?: ButtonAction[];
  errors?: ErrorEntry[];
  wiringDiagramDataUrl?: string;
  files?: ProductFile[];
  createdAt: string;
  updatedAt: string;
};

const LS_KEY = 'dmt_products_v1';

export function loadProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Product[];
  } catch {
    return [];
  }
}

export function saveProducts(products: Product[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(products));
  } catch {}
}

export function createProduct(init?: Partial<Product>): Product {
  const now = new Date().toISOString();
  return {
    id: cryptoRandomId(),
    name: init?.name ?? 'ახალი პროდუქცია',
    version: init?.version ?? 'V0.0.1',
    type: init?.type ?? '',
    description: init?.description ?? '',
    imageDataUrl: init?.imageDataUrl ?? '',
    usage: init?.usage ?? '',
    components: init?.components ?? [],
    overhead: init?.overhead ?? [
      {id: cryptoRandomId(), label: 'აწყობა', op: 'percent', value: 10},
      {id: cryptoRandomId(), label: 'ტრანსპორტირება', op: 'add', value: 0},
      {id: cryptoRandomId(), label: 'დღგ', op: 'percent', value: 18}
    ],
    pcbId: init?.pcbId ?? '',
    connectionType: init?.connectionType ?? '',
    connectionName: init?.connectionName ?? '',
    rwOptions: init?.rwOptions ?? '',
    reservedKeys: init?.reservedKeys ?? [],
    recommendation: init?.recommendation ?? '',
    ioConnectors: init?.ioConnectors ?? [],
    buttons: init?.buttons ?? [],
    errors: init?.errors ?? [],
    wiringDiagramDataUrl: init?.wiringDiagramDataUrl ?? '',
    files: init?.files ?? [],
    createdAt: now,
    updatedAt: now
  };
}

export function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Price computation — subtotal of components, then apply overhead rows in order.
export function componentsSubtotal(rows: ComponentRow[]): number {
  return rows.reduce((s, r) => s + (r.qty || 0) * (r.price || 0), 0);
}

export function computeBreakdown(product: Product) {
  const subtotal = componentsSubtotal(product.components);
  let running = subtotal;
  const steps: {id: string; label: string; delta: number; running: number}[] = [];
  for (const o of product.overhead) {
    let delta = 0;
    if (o.op === 'add') delta = o.value;
    else if (o.op === 'percent') delta = running * (o.value / 100);
    else if (o.op === 'multiply') delta = running * (o.value - 1);
    running += delta;
    steps.push({id: o.id, label: o.label, delta, running});
  }
  return {subtotal, steps, total: running};
}
