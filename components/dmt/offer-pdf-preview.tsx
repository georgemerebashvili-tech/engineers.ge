'use client';

import {Download, ExternalLink, X} from 'lucide-react';

type Props = {
  url: string;
  title?: string;
  onClose: () => void;
};

export function OfferPdfPreview({url, title = 'Offer PDF', onClose}: Props) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/45 p-3 md:p-6">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-lg border border-bdr bg-sur shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-bdr px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-navy">{title}</div>
            <div className="truncate font-mono text-[10.5px] text-text-3">{url}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
            >
              <ExternalLink size={14} /> Open
            </a>
            <a
              href={url}
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-2 text-[12px] font-semibold text-white hover:bg-navy-2"
            >
              <Download size={14} /> Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-bdr bg-sur-2 p-2 text-text-2 hover:border-red hover:text-red"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>
        <iframe src={url} title={title} className="h-full w-full flex-1 bg-white" />
      </div>
    </div>
  );
}
