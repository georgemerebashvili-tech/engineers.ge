'use client';

import {useReportWebVitals} from 'next/web-vitals';

/**
 * Client-only reporter: reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB) +
 * Next.js custom metrics (hydration, route-change) to /api/web-vitals via
 * navigator.sendBeacon (falls back to fetch keepalive).
 *
 * Mount once per app tree (root layout). Consent-gated at mount-time so users
 * who declined analytics don't get tracked.
 */
export function WebVitalsReporter({enabled}: {enabled: boolean}) {
  useReportWebVitals((metric) => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: (metric as unknown as {rating?: string}).rating ?? null,
        pathname: window.location.pathname,
        navigation_type: metric.navigationType ?? null,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      });
      const blob = new Blob([payload], {type: 'application/json'});
      if (navigator.sendBeacon?.('/api/web-vitals', blob)) return;
      void fetch('/api/web-vitals', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: payload,
        keepalive: true
      });
    } catch {
      // swallow — reporter must never break pages
    }
  });
  return null;
}
