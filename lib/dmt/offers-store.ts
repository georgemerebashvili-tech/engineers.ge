export type OfferStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';

export type OfferItemSource = 'inventory' | 'custom';

export type OfferItem = {
  inventoryId?: string;
  sku?: string;
  name: string;
  description?: string;
  qty: number;
  unitPrice: number;
  laborPerUnit?: number | null;
  currency: string;
  source: OfferItemSource;
};

export type DmtOffer = {
  id: string;
  leadId: string;
  status: OfferStatus;
  items: OfferItem[];
  subtotal: number;
  vatRate: number | null;
  vatAmount: number | null;
  total: number;
  docNumber: number | null;
  docDate: string | null;
  docNumberOverride: number | null;
  docDateOverride: string | null;
  clientCompany: string | null;
  clientTaxId: string | null;
  clientContact: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  laborPerUnit: number | null;
  laborTotal: number | null;
  marginPercent: number;
  marginAmount: number | null;
  marginAmountOverride: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  monthlySubscription: number | null;
  subscriptionRegularPrice: number | null;
  includeMoneyBackGuarantee: boolean;
  pdfUrl: string | null;
  pdfGeneratedAt: string | null;
  pdfGeneratedBy: string | null;
  pdfDocSizeBytes: number | null;
  currency: string;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
  shareToken: string | null;
  shareTokenExpiresAt: string | null;
  sentAt: string | null;
  approvedAt: string | null;
  approvedByClient: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type OfferPayload = {
  leadId: string;
  items: OfferItem[];
  vatRate?: number | null;
  marginPercent?: number | null;
  marginAmountOverride?: number | null;
  discountPercent?: number | null;
  includeMoneyBackGuarantee?: boolean;
  currency?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  notes?: string;
  monthlySubscription?: number | null;
  subscriptionRegularPrice?: number | null;
  clientCompany?: string | null;
  clientTaxId?: string | null;
  clientContact?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  docNumberOverride?: number | null;
  docDateOverride?: string | null;
};

export type OfferTotals = {
  subtotal: number;
  vatRate: number | null;
  vatAmount: number | null;
  laborTotal: number;
  sum: number;
  marginPercent: number;
  marginAmount: number;
  grandBeforeDiscount: number;
  discountPercent: number | null;
  discountAmount: number;
  grandTotal: number;
  total: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const next = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeOfferItems(value: unknown): OfferItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = asRecord(raw);
    const source: OfferItemSource = item.source === 'inventory' ? 'inventory' : 'custom';
    const sku = asString(item.sku).trim();
    const inventoryId = asString(item.inventoryId ?? item.inventory_id).trim();
    const name = asString(item.name, sku || 'Item').trim() || sku || 'Item';
    const qty = Math.max(0, asNumber(item.qty, 1));
    const unitPrice = Math.max(0, asNumber(item.unitPrice ?? item.unit_price ?? item.price, 0));
    const rawLabor = item.laborPerUnit ?? item.labor_per_unit;
    const laborPerUnit =
      rawLabor === null || rawLabor === undefined || rawLabor === ''
        ? null
        : Math.max(0, asNumber(rawLabor, 0));
    return {
      ...(inventoryId ? {inventoryId} : {}),
      ...(sku ? {sku} : {}),
      name,
      description: asString(item.description).trim(),
      qty,
      unitPrice,
      laborPerUnit,
      currency: asString(item.currency, 'GEL').trim() || 'GEL',
      source
    };
  }).filter((item) => item.name.trim().length > 0);
}

export function offerItemsToDb(items: OfferItem[]) {
  return normalizeOfferItems(items).map((item) => ({
    inventory_id: item.inventoryId ?? null,
    sku: item.sku ?? null,
    name: item.name,
    description: item.description ?? '',
    qty: item.qty,
    unit_price: item.unitPrice,
    labor_per_unit: item.laborPerUnit ?? null,
    currency: item.currency || 'GEL',
    source: item.source
  }));
}

export function calculateOfferTotals(
  items: OfferItem[],
  vatRate?: number | null,
  marginPercent = 15,
  marginAmountOverride?: number | null,
  discountPercent?: number | null
): OfferTotals {
  const subtotal = money(
    normalizeOfferItems(items).reduce((sum, item) => sum + item.qty * item.unitPrice, 0)
  );
  const laborTotal = money(
    normalizeOfferItems(items).reduce((sum, item) => sum + item.qty * (item.laborPerUnit ?? 0), 0)
  );
  const sum = money(subtotal + laborTotal);
  const normalizedMarginPercent =
    Number.isFinite(Number(marginPercent)) && Number(marginPercent) > 0 ? money(Number(marginPercent)) : 0;
  const normalizedMarginAmountOverride =
    marginAmountOverride === null || marginAmountOverride === undefined || !Number.isFinite(Number(marginAmountOverride))
      ? null
      : Math.max(0, money(Number(marginAmountOverride)));
  const marginAmount = normalizedMarginAmountOverride === null
    ? money(sum * normalizedMarginPercent / 100)
    : normalizedMarginAmountOverride;
  const effectiveMarginPercent = normalizedMarginAmountOverride !== null && sum > 0
    ? money((normalizedMarginAmountOverride / sum) * 100)
    : normalizedMarginPercent;
  const grandBeforeDiscount = money(sum + marginAmount);
  const normalizedDiscountPercent =
    discountPercent === null || discountPercent === undefined || !Number.isFinite(Number(discountPercent))
      ? null
      : Math.max(0, Math.min(100, money(Number(discountPercent))));
  const discountAmount = normalizedDiscountPercent === null
    ? 0
    : money(grandBeforeDiscount * normalizedDiscountPercent / 100);
  const grandTotal = money(grandBeforeDiscount - discountAmount);
  const normalizedVatRate =
    vatRate === null || vatRate === undefined || !Number.isFinite(Number(vatRate)) || Number(vatRate) <= 0
      ? null
      : money(Number(vatRate));
  const vatAmount = normalizedVatRate === null ? null : money(subtotal * normalizedVatRate / 100);
  return {
    subtotal,
    vatRate: normalizedVatRate,
    vatAmount,
    laborTotal,
    sum,
    marginPercent: effectiveMarginPercent,
    marginAmount,
    grandBeforeDiscount,
    discountPercent: normalizedDiscountPercent,
    discountAmount,
    grandTotal,
    total: grandTotal
  };
}

// Georgian translation table for common API / network / server error patterns.
// Patterns are matched case-insensitively; first matching pattern wins.
// Falls through to the original message if no pattern matches.
const ERROR_TRANSLATIONS: Array<{pattern: RegExp; message: string}> = [
  // Auth + access
  {pattern: /^unauthorized/i, message: 'ავტორიზაცია საჭიროა — შედი თავიდან'},
  {pattern: /^forbidden|access denied/i, message: 'წვდომა აკრძალულია'},

  // Not-found family
  {pattern: /lead not found/i, message: 'ლიდი ვერ მოიძებნა'},
  {pattern: /offer not found/i, message: 'ინვოისი ვერ მოიძებნა'},
  {pattern: /contact not found/i, message: 'კონტაქტი ვერ მოიძებნა'},
  {pattern: /not found/i, message: 'ჩანაწერი ვერ მოიძებნა'},

  // Validation / required fields
  {pattern: /^leadId is required|^lead_id is required/i, message: 'ლიდის არჩევა აუცილებელია'},
  {pattern: /required/i, message: 'ველი აუცილებელია'},

  // Schema / column errors
  {pattern: /could not find the .+ column/i, message: 'მონაცემთა ბაზა არასრულადაა გამართული — მიგრაცია ცოტას მოგვიანებით'},
  {pattern: /schema cache/i, message: 'მონაცემთა ბაზის სქემა ვერ ჩაიტვირთა — სცადე ხელახლა'},

  // Postgres integrity (PostgREST returns numeric SQLSTATE codes)
  {pattern: /^23505|duplicate key|already exists/i, message: 'ეს ჩანაწერი უკვე არსებობს'},
  {pattern: /^23502|null value in column/i, message: 'სავალდებულო ველი ცარიელია'},
  {pattern: /^23503|foreign key/i, message: 'დაკავშირებული ჩანაწერი ვერ მოიძებნა'},
  {pattern: /^23514|check constraint/i, message: 'მნიშვნელობა დაუშვებელ დიაპაზონშია'},

  // Network / timeout
  {pattern: /failed to fetch|network/i, message: 'ქსელის შეცდომა — შეამოწმე ინტერნეტი'},
  {pattern: /timeout/i, message: 'სერვერი დიდხანს არ გვეხმარება'},

  // Storage
  {pattern: /storage|bucket/i, message: 'ფაილის ატვირთვა ვერ მოხერხდა'},

  // Rate limiting
  {pattern: /rate.?limit|too many requests/i, message: 'ძალიან ბევრი მცდელობა — დაელოდე ცოტას'},

  // Generic server / 500
  {pattern: /^server_error|internal server/i, message: 'სერვერის შიდა შეცდომა — სცადე ხელახლა'},
];

function localizeError(raw: string): string {
  for (const entry of ERROR_TRANSLATIONS) {
    if (entry.pattern.test(raw)) return entry.message;
  }
  return raw;
}

function describeApiError(value: unknown, status: number): string {
  let raw = '';
  if (value == null) raw = '';
  else if (typeof value === 'string') raw = value;
  else if (value instanceof Error) raw = value.message;
  else if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) raw = obj.message;
    else if (typeof obj.details === 'string' && obj.details) raw = obj.details;
    else if (typeof obj.hint === 'string' && obj.hint) raw = obj.hint;
    else if (typeof obj.code === 'string' && obj.code) raw = obj.code;
    else {
      try { raw = JSON.stringify(value); } catch { raw = ''; }
    }
  }

  // Status-based fallback when no body details available.
  if (!raw) {
    if (status === 401) return 'ავტორიზაცია საჭიროა — შედი თავიდან';
    if (status === 403) return 'წვდომა აკრძალულია';
    if (status === 404) return 'ჩანაწერი ვერ მოიძებნა';
    if (status === 408 || status === 504) return 'სერვერი დიდხანს არ გვეხმარება';
    if (status === 409) return 'კონფლიქტი — ჩანაწერი უკვე შეიცვალა';
    if (status === 413) return 'ფაილი ძალიან დიდია';
    if (status === 429) return 'ძალიან ბევრი მცდელობა — დაელოდე ცოტას';
    if (status >= 500) return 'სერვერის შიდა შეცდომა — სცადე ხელახლა';
    return `შეცდომა (HTTP ${status})`;
  }

  return localizeError(raw);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData
      ? init.headers
      : {'content-type': 'application/json', ...(init?.headers ?? {})}
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errValue = (data as {error?: unknown}).error;
    throw new Error(describeApiError(errValue, res.status));
  }
  return data as T;
}

export function listOffers(leadId: string) {
  return fetchJson<{offers: DmtOffer[]}>(`/api/dmt/offers?lead_id=${encodeURIComponent(leadId)}`);
}

export function createOffer(payload: OfferPayload) {
  return fetchJson<{offer: DmtOffer}>('/api/dmt/offers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateOffer(id: string, payload: Partial<OfferPayload> & {status?: OfferStatus}) {
  return fetchJson<{offer: DmtOffer}>(`/api/dmt/offers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function sendOffer(id: string) {
  return fetchJson<{offer: DmtOffer; publicUrl: string}>(`/api/dmt/offers/${encodeURIComponent(id)}/send`, {
    method: 'POST'
  });
}

export function generateOfferPdf(id: string) {
  return fetchJson<{offer: DmtOffer; pdfUrl: string; docNumber: number; total: number}>(
    `/api/dmt/offers/${encodeURIComponent(id)}/generate-pdf`,
    {method: 'POST'}
  );
}

export function deleteOffer(id: string) {
  return fetchJson<{ok: true}>(`/api/dmt/offers/${encodeURIComponent(id)}`, {method: 'DELETE'});
}
