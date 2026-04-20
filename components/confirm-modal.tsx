'use client';

import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle, X} from 'lucide-react';

export type ConfirmTone = 'default' | 'warn' | 'danger';

type Props = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const TONE_STYLES: Record<ConfirmTone, {btn: string; icon: string}> = {
  default: {
    btn: 'bg-blue text-white hover:bg-blue/90',
    icon: 'text-blue'
  },
  warn: {
    btn: 'bg-ora text-white hover:bg-ora/90',
    icon: 'text-ora'
  },
  danger: {
    btn: 'bg-red-600 text-white hover:bg-red-700',
    icon: 'text-red-600'
  }
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'დადასტურება',
  cancelLabel = 'გაუქმება',
  tone = 'default',
  busy = false,
  onConfirm,
  onClose
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Enter' && !busy) onConfirm();
    };
    window.addEventListener('keydown', onKey);
    const {style} = document.body;
    const prev = style.overflow;
    style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      style.overflow = prev;
    };
  }, [open, busy, onClose, onConfirm]);

  if (!open || typeof window === 'undefined') return null;

  const styles = TONE_STYLES[tone];

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="w-full max-w-md rounded-card border border-bdr bg-sur p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sur-2 ${styles.icon}`}
          >
            <AlertTriangle size={18} />
          </span>
          <div className="flex-1">
            <h2
              id="confirm-modal-title"
              className="text-[15px] font-semibold text-navy"
            >
              {title}
            </h2>
            <div className="mt-1 text-[13px] text-text-2 leading-relaxed">
              {message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-sur-2 hover:text-navy"
            aria-label="დახურვა"
            disabled={busy}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="h-9 rounded-md border border-bdr bg-sur px-4 text-[13px] font-semibold text-text-2 hover:bg-sur-2 disabled:opacity-50"
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => !busy && onConfirm()}
            className={`h-9 rounded-md px-4 text-[13px] font-semibold transition-colors disabled:opacity-60 ${styles.btn}`}
            disabled={busy}
          >
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
