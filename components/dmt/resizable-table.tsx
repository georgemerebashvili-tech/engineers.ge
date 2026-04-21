'use client';

import {useEffect, useRef} from 'react';

type Props = {
  /** localStorage key to persist column widths across reloads. */
  storageKey: string;
  /** Minimum column width in px. */
  minWidth?: number;
  /** Maximum column width in px. */
  maxWidth?: number;
  className?: string;
  children: React.ReactNode;
};

/**
 * Wraps any `<table>` so its columns become mouse-drag resizable and
 * get visible vertical dividers. Place a standard `<table>` (with
 * `<thead>` + `<tbody>`) inside. No other markup changes required.
 *
 * Persists widths per `storageKey` in localStorage.
 */
export function ResizableTable({
  storageKey,
  minWidth = 60,
  maxWidth = 800,
  className,
  children
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const table = wrap.querySelector<HTMLTableElement>('table');
    if (!table) return;

    table.classList.add('dmt-rt');

    const ths = Array.from(
      table.querySelectorAll<HTMLTableCellElement>('thead > tr > th')
    );
    if (ths.length === 0) return;

    // Load saved widths
    let saved: Record<number, number> = {};
    try {
      const raw = localStorage.getItem(`dmt-rt:${storageKey}`);
      if (raw) saved = JSON.parse(raw);
    } catch {}

    // Apply saved widths before measuring, so colgroup sizes stick
    ths.forEach((th, i) => {
      if (saved[i]) {
        th.style.width = saved[i] + 'px';
        th.style.minWidth = saved[i] + 'px';
      }
    });

    const handles: HTMLSpanElement[] = [];
    const cleanup: Array<() => void> = [];

    ths.forEach((th, idx) => {
      if (idx === ths.length - 1) return; // no handle after last column

      // make th positioned for the absolute handle
      const priorPos = th.style.position;
      if (!priorPos) th.style.position = 'relative';

      const handle = document.createElement('span');
      handle.className = 'dmt-rt-handle';
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', 'სვეტის ზომის ცვლილება');
      handle.tabIndex = 0;
      th.appendChild(handle);
      handles.push(handle);

      let startX = 0;
      let startW = 0;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        let w = startW + dx;
        if (w < minWidth) w = minWidth;
        if (w > maxWidth) w = maxWidth;
        th.style.width = w + 'px';
        th.style.minWidth = w + 'px';
      };
      const onUp = () => {
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);

        // persist
        try {
          const next: Record<number, number> = {};
          ths.forEach((thEl, i) => {
            const r = thEl.getBoundingClientRect();
            if (r.width) next[i] = Math.round(r.width);
          });
          localStorage.setItem(`dmt-rt:${storageKey}`, JSON.stringify(next));
        } catch {}
      };
      const onDown = (ev: PointerEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        startX = ev.clientX;
        startW = th.getBoundingClientRect().width;
        handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      };
      handle.addEventListener('pointerdown', onDown);
      cleanup.push(() => handle.removeEventListener('pointerdown', onDown));
    });

    return () => {
      cleanup.forEach((fn) => fn());
      handles.forEach((h) => h.remove());
    };
  }, [storageKey, minWidth, maxWidth, children]);

  return (
    <div ref={wrapRef} className={className}>
      {children}
    </div>
  );
}
