import type {MetadataRoute} from 'next';

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://engineers.ge');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/admin/', '/api/cron/']
      }
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
