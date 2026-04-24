'use client';
import {useEffect} from 'react';

function getSelector(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body) {
    if (cur.id) {
      parts.unshift(`#${cur.id}`);
      break;
    }
    let sel = cur.tagName.toLowerCase();
    const cls = Array.from(cur.classList)
      .filter((c) => !/^(hover|focus|active|group|peer|dark|light)/.test(c))
      .slice(0, 2)
      .join('.');
    if (cls) sel += `.${cls}`;
    parts.unshift(sel);
    cur = cur.parentElement;
    if (parts.length >= 4) break;
  }
  return parts.join(' > ');
}

export function TagModeInjector() {
  useEffect(() => {
    // only runs when inside an iframe (tag console)
    if (window.self === window.top) return;

    let tagModeActive = false;
    let hovered: Element | null = null;

    function clearHover() {
      if (hovered) (hovered as HTMLElement).style.removeProperty('outline');
      hovered = null;
    }

    function onOver(e: MouseEvent) {
      clearHover();
      hovered = e.target as Element;
      if (tagModeActive) {
        (hovered as HTMLElement).style.outline = '2px solid #F59E0B';
        (hovered as HTMLElement).style.outlineOffset = '-2px';
      }
      window.parent.postMessage(
        {
          type: 'TAGCONS_HOVER',
          selector: getSelector(hovered),
          tagName: hovered.tagName.toLowerCase(),
          text: (hovered.textContent ?? '').trim().slice(0, 80),
          path: window.location.pathname
        },
        '*'
      );
    }

    function onClick(e: MouseEvent) {
      if (!tagModeActive) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.target as Element;
      window.parent.postMessage(
        {
          type: 'TAGCONS_CLICK',
          selector: getSelector(el),
          tagName: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').trim().slice(0, 120),
          path: window.location.pathname,
          elId: el.id || null,
          elClass: typeof el.className === 'string' ? el.className : null
        },
        '*'
      );
    }

    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'TAGCONS_SET_MODE') {
        tagModeActive = e.data.tagMode;
        document.body.style.outline = tagModeActive ? '2px solid #1565C0' : '';
        if (!tagModeActive) clearHover();
      }
    }

    // notify parent of navigation
    function notifyNav() {
      window.parent.postMessage({type: 'TAGCONS_NAVIGATE', path: window.location.pathname}, '*');
    }
    notifyNav();
    window.addEventListener('popstate', notifyNav);

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('message', onMessage);

    return () => {
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('popstate', notifyNav);
      document.body.style.outline = '';
      clearHover();
    };
  }, []);

  return null;
}
