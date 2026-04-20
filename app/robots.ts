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
        disallow: [
          '/admin',
          '/admin/',
          '/api/',          // internal endpoints aren't content; keep out of index
          '/auth/',         // session setup routes
          '/reset-password', // password reset token URLs
          '/r/',            // referral redirect sinks
          '/_next/'         // Next.js build artifacts
        ]
      },
      // Block AI crawlers explicitly — content is free for humans but we don't
      // want to fund training runs without attribution. User can relax later.
      {userAgent: 'GPTBot', disallow: '/'},
      {userAgent: 'ClaudeBot', disallow: '/'},
      {userAgent: 'anthropic-ai', disallow: '/'},
      {userAgent: 'CCBot', disallow: '/'},
      {userAgent: 'PerplexityBot', disallow: '/'}
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
