/**
 * The canonical public origin for anything search engines read (sitemap.xml, robots.txt).
 *
 * `VERCEL_URL` is the per-DEPLOYMENT hostname (engineers-<hash>-….vercel.app), not the site:
 * using it made the production sitemap list all its URLs — and robots.txt its Host and
 * Sitemap lines — on a throw-away deployment host (measured on engineers.ge, 27.11.2026).
 * It is only used for preview deployments, which are not meant to be indexed anyway.
 */
export function canonicalSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://engineers.ge';
}
