'use client';

import {useEffect, useState} from 'react';
import {Copy, ExternalLink} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';

type Props = {
  href: string;
  label?: string;
};

export function QrCodeLink({href, label = 'Mobile link'}: Props) {
  const [value, setValue] = useState(href);

  useEffect(() => {
    const next = href.startsWith('http') ? href : `${window.location.origin}${href}`;
    queueMicrotask(() => setValue(next));
  }, [href]);

  return (
    <div className="rounded-md border border-bdr bg-sur p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-navy">{label}</span>
        <a
          href={href}
          className="inline-flex items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
        >
          <ExternalLink size={12} /> Open
        </a>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-bdr bg-white p-2">
          <QRCodeSVG value={value} size={112} />
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(value)}
          className="min-w-0 flex-1 rounded-md border border-bdr bg-sur-2 px-3 py-2 text-left font-mono text-[10.5px] text-text-2 hover:border-blue"
        >
          <span className="mb-1 flex items-center gap-1 font-sans text-[11px] font-semibold text-text-2">
            <Copy size={12} /> Copy
          </span>
          <span className="block truncate">{value}</span>
        </button>
      </div>
    </div>
  );
}
