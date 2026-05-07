'use client';

// Wrapper that lets the user choose between the native (engineers.ge) datasheet
// and an embedded view of the original AFL (cloudair.tech) product page.

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ExternalLink, RefreshCw } from 'lucide-react';

import { FanDatasheet } from './FanDatasheet';
import type { FanModel } from '@/lib/ahu-ashrae/fans/types';

type View = 'native' | 'afl';

export function FanDatasheetClient({ model }: { model: FanModel }) {
  const [view, setView] = useState<View>('native');
  const [iframeKey, setIframeKey] = useState(0);

  const aflUrl = `https://afl.cloudair.tech/product.html?id_product=${model.sourceId}&lang=en`;

  return (
    <div className="max-w-[1400px] mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/calc/ahu-ashrae/fans"
          className="inline-flex items-center gap-1 text-[12px]"
          style={{ color: 'var(--text-3)' }}
        >
          <ChevronLeft size={14} />
          Fan library
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-md border overflow-hidden"
            style={{ borderColor: 'var(--bdr-2)' }}
          >
            <button
              onClick={() => setView('native')}
              className="text-[11px] px-3 py-1.5 transition-colors"
              style={{
                background: view === 'native' ? 'var(--blue)' : 'var(--sur)',
                color: view === 'native' ? '#fff' : 'var(--text-3)',
                cursor: 'pointer',
              }}
            >
              engineers.ge view
            </button>
            <button
              onClick={() => setView('afl')}
              className="text-[11px] px-3 py-1.5 transition-colors border-l"
              style={{
                background: view === 'afl' ? 'var(--blue)' : 'var(--sur)',
                color: view === 'afl' ? '#fff' : 'var(--text-3)',
                borderColor: 'var(--bdr-2)',
                cursor: 'pointer',
              }}
            >
              AFL original
            </button>
          </div>

          {view === 'afl' && (
            <>
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                title="Reload iframe"
                className="p-1.5 rounded-md border"
                style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur)', cursor: 'pointer' }}
              >
                <RefreshCw size={13} style={{ color: 'var(--text-3)' }} />
              </button>
              <a
                href={aflUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in new tab"
                className="p-1.5 rounded-md border"
                style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur)' }}
              >
                <ExternalLink size={13} style={{ color: 'var(--text-3)' }} />
              </a>
            </>
          )}
        </div>
      </div>

      {view === 'native' && <FanDatasheet model={model} />}

      {view === 'afl' && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 border-b text-[10px]"
            style={{ borderColor: 'var(--bdr)', color: 'var(--text-3)' }}
          >
            <span>iframe → afl.cloudair.tech (third-party)</span>
            <span className="font-mono">{aflUrl}</span>
          </div>
          <iframe
            key={iframeKey}
            src={aflUrl}
            title={`${model.code} — AFL datasheet`}
            className="w-full"
            style={{ height: 'calc(100vh - 200px)', border: 0 }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
