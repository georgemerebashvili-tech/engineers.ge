'use client';

import Image from 'next/image';
import {useRef} from 'react';
import {GALLERY_COPY, GALLERY_ITEMS, pick, resolveText, type Lang} from './content';
import type {OpenModalHandler} from './detail-modal';
import {smoothBehavior} from './motion';
import styles from './portfolio.module.css';

const SCROLL_STEP = 380;

/** The photo strip. With no items it renders nothing (the nav link goes with it, see NAV_LINKS). */
export function Gallery({lang, onOpenModal}: {lang: Lang; onOpenModal: OpenModalHandler}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const scroll = (left: number) => stripRef.current?.scrollBy({left, behavior: smoothBehavior()});

  if (GALLERY_ITEMS.length === 0) return null;

  return (
    <section className={styles.lower} id="gallery">
      <h2 className={styles.sectionHeading}>{pick(GALLERY_COPY.heading, lang)}</h2>
      <div className={styles.galleryWrap}>
        <div ref={stripRef} className={styles.galleryStrip}>
          {GALLERY_ITEMS.map((item) => {
            const label = resolveText(item.label, lang);
            return (
              <button
                key={item.image.src}
                type="button"
                className={styles.galleryCard}
                // the visible label is part of the name (WCAG 2.5.3), in the page's current language
                aria-label={`${pick(GALLERY_COPY.openPhoto, lang)}: ${label}`}
                title={pick(GALLERY_COPY.title, lang)}
                onClick={(event) =>
                  onOpenModal(
                    {
                      kicker: GALLERY_COPY.modalKicker,
                      title: label,
                      text: '',
                      images: [item.image]
                    },
                    event.currentTarget
                  )
                }
              >
                <span className={styles.galleryPhoto}>
                  <Image
                    src={item.image.src}
                    width={item.image.width}
                    height={item.image.height}
                    alt={item.alt}
                    unoptimized
                  />
                </span>
                <span className={styles.galleryLabel}>{label}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.galleryControls}>
          <button type="button" aria-label={pick(GALLERY_COPY.back, lang)} onClick={() => scroll(-SCROLL_STEP)}>
            ‹
          </button>
          <button type="button" aria-label={pick(GALLERY_COPY.forward, lang)} onClick={() => scroll(SCROLL_STEP)}>
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
