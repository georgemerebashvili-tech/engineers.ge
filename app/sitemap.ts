import type {MetadataRoute} from 'next';
import {CALCULATORS} from '@/lib/calculators';

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://engineers.ge');

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1},
    {
      url: `${base}/dashboard`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      url: `${base}/ads`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5
    },
    {
      url: `${base}/promotions`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5
    }
  ];

  const calcPages: MetadataRoute.Sitemap = CALCULATORS.map((c) => ({
    url: `${base}/calc/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8
  }));

  return [...staticPages, ...calcPages];
}
