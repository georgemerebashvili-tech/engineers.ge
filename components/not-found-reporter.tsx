'use client';

import {useEffect} from 'react';

/**
 * Fires a single beacon to /api/not-found when the NotFound page mounts.
 * Used by app/not-found.tsx to track broken inbound links in the admin panel.
 */
export function NotFoundReporter() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({
        pathname: window.location.pathname + window.location.search,
        referrer: document.referrer || null
      });
      const blob = new Blob([payload], {type: 'application/json'});
      if (navigator.sendBeacon?.('/api/not-found', blob)) return;
      void fetch('/api/not-found', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: payload,
        keepalive: true
      });
    } catch {
      // swallow
    }
  }, []);

  return null;
}
