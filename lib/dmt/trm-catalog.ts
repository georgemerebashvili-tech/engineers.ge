// Static product catalog sourced from trm.ge (scraped via scripts/scrape-trm.mjs).
// Loaded on demand from /dmt/trm-products.json (public asset) to keep bundle small.

export type TrmProduct = {
  id: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  power: string;
  color: string;
  made_in: string;
  price: number | null;
  regular: number | null;
  sale: number | null;
  on_sale: boolean;
  in_stock: boolean;
  image: string;
  url: string;
};

export type TrmCatalog = {
  source: string;
  fetched_at: string;
  count: number;
  products: TrmProduct[];
};

let cache: Promise<TrmCatalog> | null = null;

export function loadTrmCatalog(): Promise<TrmCatalog> {
  if (cache) return cache;
  cache = fetch('/dmt/trm-products.json', {cache: 'force-cache'})
    .then((r) => {
      if (!r.ok) throw new Error(`catalog HTTP ${r.status}`);
      return r.json() as Promise<TrmCatalog>;
    })
    .catch((err) => {
      cache = null;
      throw err;
    });
  return cache;
}

// Collapse "A / B / C" category string to its leaf segment for filter chips.
export function leafCategory(full: string): string {
  if (!full) return '';
  const parts = full.split('/').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || full;
}

export function uniqueCategories(products: TrmProduct[]): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const leaf = leafCategory(p.category);
    if (leaf) set.add(leaf);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ka'));
}
