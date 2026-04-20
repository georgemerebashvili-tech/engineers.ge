'use client';

import {useEffect} from 'react';
import Link from 'next/link';
import {AlertTriangle, Home, RotateCcw} from 'lucide-react';

export default function Error({
  error,
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    console.error('[engineers.ge error boundary]', error);
    try {
      const payload = JSON.stringify({
        message: error.message || 'Unknown error',
        stack: error.stack ?? null,
        digest: error.digest ?? null,
        pathname: window.location.pathname,
        kind: 'route',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer || null
      });
      const blob = new Blob([payload], {type: 'application/json'});
      // sendBeacon — survives page navigation; gracefully degrades to fetch.
      if (navigator.sendBeacon?.('/api/errors', blob)) return;
      void fetch('/api/errors', {method: 'POST', headers: {'content-type': 'application/json'}, body: payload, keepalive: true});
    } catch {
      // swallow — error reporter must never throw.
    }
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-red-lt bg-red-lt text-red">
          <AlertTriangle size={34} strokeWidth={1.5} />
        </div>

        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-red">
          შეცდომა · UNEXPECTED ERROR
        </div>
        <h1 className="mb-3 text-2xl font-bold text-navy md:text-3xl">
          რაღაც ვერ აეწყო
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-text-2">
          არაპროგნოზირებული შეცდომა მოხდა. თუ პრობლემა მეორდება,
          გვაცნობე georgemerebashvili@gmail.com-ზე.
        </p>

        {error.digest && (
          <div className="mb-6 inline-block rounded-md border border-bdr bg-sur-2 px-3 py-1.5 font-mono text-[10px] text-text-3">
            error: {error.digest}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-blue px-5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2"
          >
            <RotateCcw size={14} /> ხელახლა ცდა
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-bdr bg-sur px-5 text-[13px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
          >
            <Home size={14} /> მთავარზე
          </Link>
        </div>
      </div>
    </main>
  );
}
