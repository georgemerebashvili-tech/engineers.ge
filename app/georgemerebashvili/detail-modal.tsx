'use client';

import Image from 'next/image';
import {useEffect, useId, useRef} from 'react';
import {MODAL_COPY, pick, resolveText, type Bilingual, type DemoImage, type Lang} from './content';
import styles from './portfolio.module.css';

export type ModalContent = {
  kicker: string;
  title: Bilingual | string;
  text: Bilingual | string;
  images: readonly DemoImage[];
};

/** What the page keeps while a dialog is open: its content and the control that opened it. */
export type OpenModal = {content: ModalContent; trigger: HTMLElement | null};

export type OpenModalHandler = (content: ModalContent, trigger: HTMLElement) => void;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The design's detail dialog (expertise cards, year directions, gallery photos), with the focus
 * handling the design lacked: focus moves into the dialog on open, Tab stays inside it, and focus
 * returns to the control that opened it on close. Escape, the backdrop and × close it; the page
 * behind does not scroll while it is open.
 */
export function DetailModal({
  content,
  trigger,
  lang,
  onClose
}: {
  content: ModalContent;
  trigger: HTMLElement | null;
  lang: Lang;
  onClose: () => void;
}) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
    return () => {
      trigger?.focus({preventScroll: true});
    };
  }, [trigger]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const keepFocusInside = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const box = boxRef.current;
    if (!box) return;
    const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      event.preventDefault();
      box.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === box)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const title = resolveText(content.title, lang);

  return (
    <div className={styles.modal}>
      <div className={styles.modalBg} aria-hidden="true" onClick={onClose} />
      <div
        ref={boxRef}
        className={styles.modalBox}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={keepFocusInside}
      >
        <button type="button" className={styles.close} aria-label={pick(MODAL_COPY.close, lang)} onClick={onClose}>
          ×
        </button>
        <span className={styles.storyKicker}>{content.kicker}</span>
        <h2 id={titleId}>{title}</h2>
        <p>{resolveText(content.text, lang)}</p>
        <div className={styles.modalGrid}>
          {content.images.length === 0 ? (
            <div className={styles.emptyPhoto}>{pick(MODAL_COPY.emptyPhotos, lang)}</div>
          ) : (
            content.images.map((image) => (
              <Image key={image.src} src={image.src} width={image.width} height={image.height} alt={title} unoptimized />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
