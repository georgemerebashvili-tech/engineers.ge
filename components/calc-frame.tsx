'use client';

import {useState, useEffect} from 'react';
import Link from 'next/link';
import {ArrowLeft, Maximize2, Minimize2} from 'lucide-react';

type Props = {
  slug: string;
  title: string;
  icon: string;
  standard?: string;
  src: string;
};

export function CalcFrame({slug: _slug, title, icon: _icon, standard: _standard, src}: Props) {
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (full) {
      try {
        localStorage.setItem('eng_sidebar_pinned', '0');
      } catch {}
    }
  }, [full]);

  if (full) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
        <iframe
          key={src}
          src={src}
          title={title}
          className="w-full flex-1 block"
          style={{border: 0}}
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals"
        />
        <div className="fixed bottom-4 right-4 flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-2 hover:text-blue bg-sur border rounded-full px-3 py-2 shadow-lg transition-colors"
          >
            <ArrowLeft size={12} /> დეშბორდზე
          </Link>
          <button
            type="button"
            onClick={() => setFull(false)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-navy hover:bg-navy/90 border border-navy rounded-full px-3 py-2 shadow-lg transition-colors"
            title="სრული ეკრანის გათიშვა"
          >
            <Minimize2 size={12} /> გასვლა
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-bg w-full h-full">
      <iframe
        key={src}
        src={src}
        title={title}
        className="w-full h-full block"
        style={{border: 0}}
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals"
      />
      <button
        type="button"
        onClick={() => setFull(true)}
        className="absolute top-3 right-3 z-10 inline-flex items-center justify-center h-8 w-8 text-text-2 hover:text-blue bg-sur/90 hover:bg-sur border rounded-full shadow-sm backdrop-blur transition-colors"
        title="სრული ეკრანი"
        aria-label="სრული ეკრანი"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
