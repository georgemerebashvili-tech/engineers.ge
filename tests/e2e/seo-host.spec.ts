import {test, expect} from '@playwright/test';

/**
 * sitemap.xml and robots.txt must point search engines at https://engineers.ge, never at a
 * per-deployment *.vercel.app host. Until 27.11.2026 production listed all 28 sitemap URLs
 * (and robots' Host/Sitemap lines) on engineers-<hash>-….vercel.app because both files used
 * VERCEL_URL. Meaningful against production and a local dev server; a preview deployment
 * legitimately uses its own host (see lib/site-url.ts).
 */
const CANONICAL = 'https://engineers.ge';

test('sitemap.xml lists only canonical engineers.ge URLs, including the portfolio', async ({request}) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(10);
  for (const loc of locs) expect(loc.startsWith(`${CANONICAL}/`) || loc === CANONICAL).toBe(true);
  expect(locs).toContain(`${CANONICAL}/georgemerebashvili`);
});

test('robots.txt names the canonical host and sitemap', async ({request}) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain(`Sitemap: ${CANONICAL}/sitemap.xml`);
  expect(body).not.toMatch(/vercel\.app/);
});
