import 'server-only';

// Georgian company lookup — RS.ge or NAPR (enreg.reestri.gov.ge)
//
// Configuration (in .env.local):
//   RS_GE_API_URL   — full base URL if you have an RS.ge commercial API key
//                     e.g. https://eservices.rs.ge/rs-api/api/public
//   RS_GE_API_KEY   — API key/token (passed as Authorization: Bearer <key>)
//
// Without env vars: falls back to NAPR HTML scrape which works without auth.

export type RsCompany = {
  identification_code: string;
  name: string;
  status: string | null;
  address: string | null;
  director: string | null;
  vat_payer: boolean;
};

export async function rsLookup(code: string): Promise<RsCompany> {
  const clean = code.trim().replace(/\s+/g, '');
  if (!/^\d{9,11}$/.test(clean)) throw new Error('საიდენტიფიკაციო კოდი 9–11 ციფრია');

  const apiUrl = process.env.RS_GE_API_URL;
  const apiKey = process.env.RS_GE_API_KEY;

  if (apiUrl) {
    return rsApiLookup(clean, apiUrl, apiKey);
  }
  return naprHtmlLookup(clean);
}

// ── commercial RS.ge API (requires RS_GE_API_URL) ────────────────────────────
async function rsApiLookup(code: string, baseUrl: string, key?: string): Promise<RsCompany> {
  const url = `${baseUrl.replace(/\/$/, '')}/taxpayer/${encodeURIComponent(code)}`;
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const res = await fetch(url, {headers, next: {revalidate: 300}});

  if (res.status === 404) throw new Error(`ს.კ. ${code} — ვერ მოიძებნა`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`RS.ge ${res.status}: ${txt.slice(0, 120)}`);
  }

  const d = await res.json();
  return {
    identification_code: code,
    name:      d.name ?? d.companyName ?? d.fullName ?? d.orgName ?? '',
    status:    d.status ?? d.taxpayerStatus ?? null,
    address:   d.address ?? d.legalAddress ?? null,
    director:  d.director ?? d.directorName ?? null,
    vat_payer: d.vatPayer === true || d.isVatPayer === true || false,
  };
}

// ── NAPR HTML scrape (enreg.reestri.gov.ge) — no auth required ──────────────
async function naprHtmlLookup(code: string): Promise<RsCompany> {
  const url = `https://enreg.reestri.gov.ge/main.php?c=app&m=searchGe&query=${encodeURIComponent(code)}&lang=ge`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ka-GE,ka;q=0.9',
    },
    next: {revalidate: 300},
  });

  if (!res.ok) throw new Error(`NAPR ${res.status}`);

  const html = await res.text();

  // Parse company name from HTML table rows
  const nameMatch = html.match(/class="[^"]*subject[^"]*"[^>]*>([^<]{5,120})<\/[^>]+>/i)
    ?? html.match(/<td[^>]*>\s*([^\s<][^<]{4,119})\s*<\/td>/);

  const name = nameMatch ? nameMatch[1].trim() : '';

  // Extract identification code from the results
  const codeMatch = html.match(/(\d{9,11})/);
  const foundCode = codeMatch ? codeMatch[1] : code;

  if (!name) {
    throw new Error(`ს.კ. ${code} — NAPR-ში ვერ მოიძებნა. RS_GE_API_URL დაყენება საჭიროა.`);
  }

  return {
    identification_code: foundCode,
    name,
    status: null,
    address: null,
    director: null,
    vat_payer: false,
  };
}
