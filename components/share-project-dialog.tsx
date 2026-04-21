'use client';

import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {Check, Copy, Download, QrCode, Share2, X} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {buildSnapshot, encodeSnapshot} from '@/lib/project-snapshot';
import type {Building} from '@/lib/buildings';
import type {Project} from '@/lib/projects';

interface Props {
  open: boolean;
  onClose: () => void;
  building: Building;
  projects: Project[];
}

const URL_WARN_LIMIT = 6000;
const URL_MAX_LIMIT = 30000;

export function ShareProjectDialog({open, onClose, building, projects}: Props) {
  const [mounted, setMounted] = useState(false);
  const [includeState, setIncludeState] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const shareUrl = useMemo(() => {
    if (!open || typeof window === 'undefined') return '';
    const snapshot = buildSnapshot(building, projects, {includeState});
    const payload = encodeSnapshot(snapshot);
    return `${window.location.origin}/shared/project#${payload}`;
  }, [open, building, projects, includeState]);

  const length = shareUrl.length;
  const tooLong = length > URL_MAX_LIMIT;
  const warn = length > URL_WARN_LIMIT;

  if (!open || !mounted) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const downloadQr = () => {
    const svg = document.getElementById('share-qr-svg') as SVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${building.name}-qr.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  const nativeShare = () => {
    if (!navigator.share) {
      handleCopy();
      return;
    }
    navigator
      .share({title: building.name, text: `engineers.ge · ${building.name}`, url: shareUrl})
      .catch(() => {});
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" aria-hidden />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl rounded-[var(--radius-card)] border bg-sur p-6 shadow-xl md:p-7"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-sur-2 hover:text-navy"
          >
            <X size={16} />
          </button>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-bd bg-blue-lt px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-blue">
            <Share2 size={12} />
            Share
          </div>
          <h2 id="share-title" className="text-xl font-bold tracking-tight text-navy">
            გაზიარება · {building.name}
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-text-2">
            შეიქმნება read-only ბმული. მიმღებს არ სჭირდება ანგარიში — ნახავს პროექტის შიგთავსს,
            კალკულაციების სიას და შენს კომენტარებს. მონაცემები ჩაერთვება თვითონ URL-ში
            (ჩვენ სერვერზე არაფერი ინახება).
          </p>

          <div className="mt-4 flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-text-2">
              <input
                type="checkbox"
                checked={includeState}
                onChange={(e) => setIncludeState(e.target.checked)}
                className="h-3.5 w-3.5 accent-blue"
              />
              ჩავრთო თითოეული კალკულაციის მონაცემები
            </label>
          </div>

          <div className="mt-4 rounded-[var(--radius-card)] border bg-sur-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-text-3">
                  ბმული
                </div>
                <div className="break-all font-mono text-[11px] text-navy">
                  {tooLong ? (
                    <span className="text-red">
                      URL ძალიან გრძელია ({length.toLocaleString()} სიმბოლო). გამორთე
                      „მონაცემების“ ჩართვა ან შეამცირე კალკულაციების რაოდენობა.
                    </span>
                  ) : (
                    shareUrl
                  )}
                </div>
                {!tooLong && warn && (
                  <div className="mt-1 font-mono text-[10px] text-ora">
                    ⚠ ბმული გრძელია ({length.toLocaleString()} სიმბოლო) — ზოგიერთ მესენჯერში შეიძლება
                    ვერ ჩაერთოს მთლიანად.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                disabled={tooLong}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11.5px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check size={12} /> დაკოპირდა
                  </>
                ) : (
                  <>
                    <Copy size={12} /> ბმულის კოპირება
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={nativeShare}
                disabled={tooLong}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11.5px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Share2 size={12} /> გაზიარება
              </button>
            </div>
          </div>

          {!tooLong && (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-[var(--radius-card)] border bg-sur p-4">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                <QrCode size={11} /> QR კოდი
              </div>
              <div className="rounded-lg border bg-white p-3">
                <QRCodeSVG
                  id="share-qr-svg"
                  value={shareUrl}
                  size={200}
                  level={length > 2000 ? 'L' : 'M'}
                  marginSize={0}
                />
              </div>
              <button
                type="button"
                onClick={downloadQr}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11.5px] font-semibold text-text-2 hover:border-blue hover:text-blue"
              >
                <Download size={12} /> SVG-ის ჩამოტვირთვა
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
