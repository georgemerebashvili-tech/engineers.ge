/**
 * JSON-LD structured data helpers for SEO.
 *
 * Rendered via <script type="application/ld+json"> tags in layouts/pages. The
 * resulting blob is what powers Google rich snippets (site name in search
 * results, calculator rich cards, breadcrumb trails, etc.).
 *
 * Schemas used:
 *   - Organization       — company card (root layout)
 *   - WebSite            — site-search action (root layout)
 *   - WebApplication     — per-calc rich card with standards, category
 *   - HowTo              — step-by-step for calculators with known steps
 *   - BreadcrumbList     — crumb trail per page
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://engineers.ge';

export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'engineers.ge',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    'ქართული საინჟინრო ინსტრუმენტები — HVAC, თბოდანაკარგები, ვენტილაცია, სახანძრო სიმულაცია',
  areaServed: {
    '@type': 'Country',
    name: 'Georgia'
  },
  knowsLanguage: ['ka', 'en'],
  email: 'georgemerebashvili@gmail.com'
} as const;

export const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'engineers.ge',
  url: SITE_URL,
  inLanguage: 'ka-GE',
  publisher: {'@id': `${SITE_URL}#org`}
} as const;

export type CalcApplicationInput = {
  slug: string;
  title: string;
  description: string;
  category: string;
  standard?: string;
};

/**
 * WebApplication schema per calculator. Google may display this as a rich
 * card (with standard badge, category, free-price, rating slot).
 */
export function calcApplicationJsonLd(input: CalcApplicationInput) {
  const url = `${SITE_URL}/calc/${input.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.title,
    url,
    description: input.description,
    applicationCategory: 'EngineeringApplication',
    applicationSubCategory: input.category,
    operatingSystem: 'Any (browser-based)',
    inLanguage: 'ka-GE',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GEL',
      availability: 'https://schema.org/InStock'
    },
    isAccessibleForFree: true,
    ...(input.standard
      ? {
          citation: {
            '@type': 'CreativeWork',
            name: input.standard
          }
        }
      : {}),
    publisher: {'@id': `${SITE_URL}#org`}
  };
}

export type Crumb = {name: string; url: string};

/** Breadcrumb schema. Positions auto-numbered from 1. */
export function breadcrumbsJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url.startsWith('http') ? c.url : `${SITE_URL}${c.url}`
    }))
  };
}

/**
 * Helper to serialize + script-tag a JSON-LD blob. Returns a string suitable
 * for `dangerouslySetInnerHTML`. Schema objects should always be plain JSON —
 * no functions, no undefined.
 */
export function jsonLdScript(data: object): string {
  // Guard against prototype pollution and JS escape issues: escape </script>
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
