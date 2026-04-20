'use client';

import {useEffect} from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[engineers.ge global-error]', error);
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({
        message: error.message || 'Unknown error',
        stack: error.stack ?? null,
        digest: error.digest ?? null,
        pathname: window.location.pathname,
        kind: 'global',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer || null
      });
      const blob = new Blob([payload], {type: 'application/json'});
      if (navigator.sendBeacon?.('/api/errors', blob)) return;
      void fetch('/api/errors', {method: 'POST', headers: {'content-type': 'application/json'}, body: payload, keepalive: true});
    } catch {
      // swallow
    }
  }, [error]);

  return (
    <html lang="ka">
      <body style={{fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f5f8fc', color: '#1a2840', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'}}>
        <div style={{maxWidth: '420px', textAlign: 'center'}}>
          <div style={{fontSize: '11px', fontFamily: 'monospace', color: '#c0201a', fontWeight: 700, letterSpacing: '0.15em', marginBottom: '8px'}}>
            კრიტიკული შეცდომა
          </div>
          <h1 style={{fontSize: '24px', fontWeight: 700, color: '#1a3a6b', margin: '0 0 12px'}}>
            რაღაც სერიოზულად ვერ აეწყო
          </h1>
          <p style={{fontSize: '13px', color: '#3d5470', lineHeight: 1.5, margin: '0 0 24px'}}>
            ამ გვერდის ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა ან დაბრუნდი მთავარზე.
          </p>
          {error.digest && (
            <div style={{fontSize: '10px', fontFamily: 'monospace', color: '#7a96b8', background: '#f7f9fd', border: '1px solid #dde6f2', borderRadius: '6px', padding: '6px 12px', display: 'inline-block', marginBottom: '20px'}}>
              ref: {error.digest}
            </div>
          )}
          <div style={{display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <button
              type="button"
              onClick={() => reset()}
              style={{background: '#1f6fd4', color: 'white', border: 'none', borderRadius: '999px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}
            >
              ხელახლა ცდა
            </button>
            {/* Plain <a> is intentional — this is the app-wide crash fallback
                where next/link may itself fail to mount. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{background: 'white', color: '#3d5470', border: '1px solid #dde6f2', borderRadius: '999px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none'}}
            >
              მთავარზე
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
