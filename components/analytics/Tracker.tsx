'use client';

import {usePathname} from 'next/navigation';
import {useEffect, useRef} from 'react';

function getVisitorId(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)eng_vid=([^;]+)/);
  return m ? m[1] : null;
}

export function Tracker() {
  const pathname = usePathname();
  const currentId = useRef<number | null>(null);
  const enteredAt = useRef<number>(0);

  useEffect(() => {
    if (!pathname) return;

    const prevId = currentId.current;
    const prevEntered = enteredAt.current;

    if (prevId != null && prevEntered > 0) {
      sendLeave(prevId, Date.now() - prevEntered);
    }

    enteredAt.current = Date.now();
    currentId.current = null;

    const params = new URLSearchParams(window.location.search);
    const controller = new AbortController();

    fetch('/api/track', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      signal: controller.signal,
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign')
      }),
      keepalive: true
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) currentId.current = data.id;
      })
      .catch(() => {});

    return () => controller.abort();
  }, [pathname]);

  // Heartbeat: keep visitor_sessions table up-to-date every 30s
  useEffect(() => {
    if (!pathname) return;
    const send = () => {
      const vid = getVisitorId();
      if (!vid) return;
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({visitor_id: vid, path: pathname}),
        keepalive: true
      }).catch(() => {});
    };
    send(); // immediate on navigation
    const id = setInterval(send, 30_000);
    return () => clearInterval(id);
  }, [pathname]);

  useEffect(() => {
    const onLeave = () => {
      if (currentId.current == null || enteredAt.current === 0) return;
      sendLeave(currentId.current, Date.now() - enteredAt.current);
      currentId.current = null;
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') onLeave();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onLeave);
    };
  }, []);

  return null;
}

function sendLeave(id: number, durationMs: number) {
  if (durationMs < 0 || durationMs > 24 * 60 * 60 * 1000) return;
  const payload = JSON.stringify({id, duration_ms: durationMs});
  if (typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], {type: 'application/json'});
    navigator.sendBeacon('/api/track/leave', blob);
    return;
  }
  fetch('/api/track/leave', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: payload,
    keepalive: true
  }).catch(() => {});
}
