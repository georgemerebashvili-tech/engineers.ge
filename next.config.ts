import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy.
 *
 * Design notes:
 * - `'unsafe-inline'` on script-src is needed for (a) Next.js hydration bootstrap,
 *   (b) `THEME_INIT_SCRIPT` in app/layout.tsx, (c) JSON-LD <script> injections.
 *   Migrating to nonces requires Edge middleware — deferred.
 * - `'unsafe-inline'` on style-src is needed for Tailwind runtime injected styles
 *   and KaTeX inline CSS.
 * - `'unsafe-eval'` on script-src is needed for Three.js module runtime.
 * - `data:` on img-src covers favicon inlining + OG image responses.
 * - `blob:` on img-src + connect-src enables Three.js textures + file uploads.
 * - Supabase URL added to connect-src so the Supabase JS client can reach the DB.
 * - `frame-src 'self'` allows calc iframes (public/calc/*.html) to load.
 * - `object-src 'none'` blocks <embed>/<object>/<applet> attack vectors.
 * - `base-uri 'self'` prevents <base href> hijacking.
 * - `form-action 'self'` stops form posts to external origins.
 * - `frame-ancestors 'self'` overlaps with X-Frame-Options SAMEORIGIN.
 * - `upgrade-insecure-requests` rewrites http://→https:// in prod.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseHost = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).host : '';
  } catch {
    return '';
  }
})();

const CSP_DIRECTIVES = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `img-src 'self' data: blob: https:`,
  [
    `connect-src 'self' blob:`,
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    supabaseHost ? `https://${supabaseHost}` : '',
    supabaseHost ? `wss://${supabaseHost}` : ''
  ].filter(Boolean).join(' '),
  `frame-src 'self'`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`,
  // Browsers POST CSP violations to this endpoint; see app/api/csp-report
  // and /admin/csp-violations for the admin triage UI.
  `report-uri /api/csp-report`,
  ...(isProd ? [`upgrade-insecure-requests`] : [])
].join('; ');

/**
 * Baseline security headers applied to all routes.
 */
const SECURITY_HEADERS = [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'X-DNS-Prefetch-Control', value: 'on'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  },
  {key: 'Content-Security-Policy', value: CSP_DIRECTIVES},
  // HSTS only in production — local dev over http would be broken otherwise.
  ...(isProd
    ? [{key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload'}]
    : [])
];

// X-Frame-Options needs per-path handling: admin pages should DENY framing
// (protects against clickjacking of admin UI), but calculator HTML pages are
// intentionally iframed from Next React routes — we use SAMEORIGIN there.
const ADMIN_FRAME_HEADER = [{key: 'X-Frame-Options', value: 'DENY'}];
const DEFAULT_FRAME_HEADER = [{key: 'X-Frame-Options', value: 'SAMEORIGIN'}];

const nextConfig: NextConfig = {
  typescript: {ignoreBuildErrors: true},
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: '*.supabase.co'},
      {protocol: 'https', hostname: '*.supabase.in'},
      {protocol: 'https', hostname: 'placehold.co'},
      {protocol: 'https', hostname: 'images.unsplash.com'}
    ]
  },
  async headers() {
    return [
      {source: '/admin/:path*', headers: [...SECURITY_HEADERS, ...ADMIN_FRAME_HEADER]},
      {source: '/((?!admin).*)', headers: [...SECURITY_HEADERS, ...DEFAULT_FRAME_HEADER]}
    ];
  }
};

export default withNextIntl(nextConfig);
