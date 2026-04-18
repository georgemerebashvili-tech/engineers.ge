'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, Maximize2, Minimize2} from 'lucide-react';
import {Container} from './container';
import {ShareBar} from './share-bar';

type Props = {
  slug: string;
  title: string;
  icon: string;
  standard?: string;
  src: string;
};

export function CalcFrame({slug: _slug, title, icon, standard, src}: Props) {
  const [full, setFull] = useState(false);

  if (full) {
    return (
      <div className="bg-bg">
        <iframe
          src={src}
          title={title}
          className="w-full block"
          style={{height: 'calc(100dvh - 56px)', minHeight: 420, border: 0}}
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals"
        />
        <button
          type="button"
          onClick={() => setFull(false)}
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-navy hover:bg-navy/90 border border-navy rounded-full px-3 py-2 shadow-lg transition-colors"
          title="სრული ეკრანის გათიშვა"
        >
          <Minimize2 size={12} /> გასვლა
        </button>
      </div>
    );
  }

  return (
    <Container className="py-4 md:py-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-2 hover:text-blue transition-colors"
          >
            <ArrowLeft size={14} /> უკან
          </Link>
          <span className="h-4 w-px bg-bdr" />
          <span className="text-lg" aria-hidden>
            {icon}
          </span>
          <h1 className="text-sm md:text-base font-bold text-navy truncate">
            {title}
          </h1>
          {standard && (
            <span className="hidden md:inline text-[10px] font-mono text-text-3 bg-sur-2 border rounded-full px-2 py-0.5">
              {standard}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFull(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-2 hover:text-blue bg-sur border rounded-full px-3 py-1.5 transition-colors"
            title="iframe გაიწელება navbar-მდე"
          >
            <Maximize2 size={12} /> სრული ეკრანი
          </button>
          <ShareBar title={title} />
        </div>
      </div>

      <div className="bg-sur border rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <iframe
          src={src}
          title={title}
          className="w-full block"
          style={{height: 'calc(100dvh - 160px)', minHeight: 440, border: 0}}
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals"
        />
      </div>
    </Container>
  );
}
