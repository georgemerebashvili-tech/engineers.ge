// DMT · მარაგი (Stock / Inventory items)
//
// localStorage-backed inventory. Each stock item has a unique SKU, a
// QR/barcode payload (typically the SKU itself, but overridable), a PLC
// address mapping (since stock positions are physical modules wired into
// PLCs on site), quantity, location, and an optional deviceCode linking
// back to the device catalog.

export type StockLocation = {
  site?: string;    // ობიექტი
  rack?: string;    // სტელაჟი
  bin?: string;     // ყუთი / თარო
  notes?: string;
};

export type StockStatus = 'in_stock' | 'reserved' | 'deployed' | 'broken';

export type StockItem = {
  id: string;
  sku: string;             // unique within catalog
  barcode: string;         // barcode payload (defaults to sku)
  qrPayload: string;       // qr payload (defaults to sku)
  name: string;
  deviceCode?: string;     // optional link to Device.code (GW, IPMP, ...)
  category: string;        // free-form grouping
  qty: number;
  unit: string;            // ც / მ / კგ / ლ
  price: number;           // per unit (₾)
  plcAddress: string;      // ~PLC address e.g. %MW0 / %IX0.1
  status: StockStatus;
  location: StockLocation;
  supplier?: string;
  purchasedAt?: string;    // YYYY-MM-DD
  warrantyMonths?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const LS_KEY = 'dmt_stock_v1';

export function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadStock(): StockItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StockItem[];
  } catch {
    return [];
  }
}

export function saveStock(items: StockItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {}
}

export function clearStock() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

export function createStockItem(init?: Partial<StockItem>): StockItem {
  const now = new Date().toISOString();
  const sku = init?.sku ?? '';
  return {
    id: cryptoRandomId(),
    sku,
    barcode: init?.barcode ?? sku,
    qrPayload: init?.qrPayload ?? sku,
    name: init?.name ?? '',
    deviceCode: init?.deviceCode,
    category: init?.category ?? '',
    qty: init?.qty ?? 1,
    unit: init?.unit ?? 'ც',
    price: init?.price ?? 0,
    plcAddress: init?.plcAddress ?? '',
    status: init?.status ?? 'in_stock',
    location: init?.location ?? {},
    supplier: init?.supplier,
    purchasedAt: init?.purchasedAt,
    warrantyMonths: init?.warrantyMonths,
    notes: init?.notes,
    createdAt: now,
    updatedAt: now
  };
}

export const STATUS_META: Record<
  StockStatus,
  {label: string; color: string; bg: string; border: string}
> = {
  in_stock: {label: 'მარაგში',  color: 'var(--grn)',  bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  reserved: {label: 'რეზერვი',  color: 'var(--ora)',  bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  deployed: {label: 'დამონტ.',  color: 'var(--blue)', bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  broken:   {label: 'გაუმართ.', color: 'var(--red)',  bg: 'var(--red-lt)',  border: 'var(--red)'}
};
