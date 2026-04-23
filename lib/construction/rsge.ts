import 'server-only';

// RS.ge — Revenue Service of Georgia — public taxpayer info
// Endpoint: https://eservices.rs.ge/rs-api/api/public/taxpayer/{code}
const RS_BASE = 'https://eservices.rs.ge/rs-api/api/public';

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

  const url = `${RS_BASE}/taxpayer/${encodeURIComponent(clean)}`;
  const res = await fetch(url, {
    headers: {Accept: 'application/json'},
    next: {revalidate: 300},
  });

  if (res.status === 404) throw new Error(`ს.კ. ${clean} — ვერ მოიძებნა RS.ge-ში`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`RS.ge ${res.status}: ${txt.slice(0, 120)}`);
  }

  const d = await res.json();

  return {
    identification_code: clean,
    name:      d.name ?? d.companyName ?? d.fullName ?? d.orgName ?? '',
    status:    d.status ?? d.taxpayerStatus ?? null,
    address:   d.address ?? d.legalAddress ?? null,
    director:  d.director ?? d.directorName ?? null,
    vat_payer: d.vatPayer === true || d.isVatPayer === true || false,
  };
}
