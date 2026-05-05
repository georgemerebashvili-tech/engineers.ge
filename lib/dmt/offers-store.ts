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
  laborPerUnit: number | null;
  laborTotal: number | null;
  marginPercent: number;
  marginAmount: number | null;
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
  includeMoneyBackGuarantee?: boolean;
  currency?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  notes?: string;
};

export type OfferTotals = {
  subtotal: number;
  vatRate: number | null;
  vatAmount: number | null;
  laborTotal: number;
  sum: number;
  marginPercent: number;
  marginAmount: number;
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
  marginPercent = 15
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
  const marginAmount = money(sum * normalizedMarginPercent / 100);
  const grandTotal = money(sum + marginAmount);
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
    marginPercent: normalizedMarginPercent,
    marginAmount,
    grandTotal,
    total: grandTotal
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData
      ? init.headers
      : {'content-type': 'application/json', ...(init?.headers ?? {})}
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((data as {error?: unknown}).error ?? `HTTP ${res.status}`));
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
