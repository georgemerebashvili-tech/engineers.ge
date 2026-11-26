'use client';

import clsx from 'clsx';
import {useEffect, useRef, useState} from 'react';
import {EXPERTISE_COPY, EXPERTISE_ITEMS, pick, type Lang} from './content';
import type {OpenModalHandler} from './detail-modal';
import styles from './portfolio.module.css';

const COUNT = EXPERTISE_ITEMS.length;
const POSITIONS = Array.from({length: COUNT}, (_, index) => index);

/**
 * One of the design's five stacked rows. Each row is its own 5-position carousel: slide `s` shows the
 * five directions rotated so that direction `s` is the centre card. The centre card opens the detail
 * dialog, a side card re-centres the row.
 */
function ExpertiseRow({
  row,
  lang,
  year,
  onOpenModal
}: {
  row: number;
  lang: Lang;
  year: number;
  onOpenModal: OpenModalHandler;
}) {
  // the design starts row r on direction r
  const [position, setPosition] = useState(row);
  const centreCards = useRef<Array<HTMLButtonElement | null>>([]);
  const refocusCentre = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const step = (delta: number) => setPosition((current) => (current + delta + COUNT) % COUNT);

  // A side card is clicked, the rail slides and that card goes inert: keep keyboard focus on the
  // card that is now in the centre instead of dropping it to <body>.
  useEffect(() => {
    if (!refocusCentre.current) return;
    refocusCentre.current = false;
    centreCards.current[position]?.focus({preventScroll: true});
  }, [position]);

  const name = (index: number) => (lang === 'ka' ? EXPERTISE_ITEMS[index].ka : EXPERTISE_ITEMS[index].en);
  const rowLabel = name(row);

  return (
    <section className={clsx(styles.expertiseSection, styles.expertiseRow)} aria-label={rowLabel}>
      <div className={styles.directionContext}>
        {String(row + 1).padStart(2, '0')} / 05 · {name(position)}
      </div>
      <div className={styles.expertiseCarousel}>
        <button type="button" className={styles.expertiseNav} aria-label={pick(EXPERTISE_COPY.prevSlide, lang)} onClick={() => step(-1)}>
          ‹
        </button>
        <div
          className={styles.expertiseStage}
          role="group"
          aria-label={`${rowLabel} — ${pick(EXPERTISE_COPY.carouselSuffix, lang)}`}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0].screenX;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const distance = event.changedTouches[0].screenX - touchStartX.current;
            if (Math.abs(distance) > 40) step(distance < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <div className={styles.fullSlideRail} style={{transform: `translateX(-${position * 20}%)`}}>
            {POSITIONS.map((slideIndex) => (
              // Only the slide in view is reachable; the other four are off-screen and must not be
              // tabbable or announced (the design left all 25 cards focusable).
              <div key={slideIndex} className={styles.fullSlide} inert={slideIndex !== position}>
                <div className={styles.fullSlideFive}>
                  {POSITIONS.map((slot) => {
                    const itemIndex = (slideIndex + slot + 3) % COUNT;
                    const item = EXPERTISE_ITEMS[itemIndex];
                    const centred = slot === 2;
                    return (
                      <button
                        key={slot}
                        type="button"
                        ref={
                          centred
                            ? (node) => {
                                centreCards.current[slideIndex] = node;
                              }
                            : undefined
                        }
                        className={clsx(styles.fullDirectionCard, centred && styles.centered)}
                        data-testid={centred && slideIndex === position ? 'expertise-centre-card' : undefined}
                        onClick={(event) => {
                          if (!centred) {
                            refocusCentre.current = true;
                            setPosition(itemIndex);
                            return;
                          }
                          onOpenModal(
                            {
                              kicker: String(year),
                              title: {ka: item.ka, en: item.en},
                              text: {ka: item.descKa, en: item.descEn},
                              images: []
                            },
                            event.currentTarget
                          );
                        }}
                      >
                        <strong>{lang === 'ka' ? item.ka : item.en}</strong>
                        <span className={styles.fullDirectionIcon} aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className={styles.cardText}>{lang === 'ka' ? item.descKa : item.descEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button type="button" className={styles.expertiseNav} aria-label={pick(EXPERTISE_COPY.nextSlide, lang)} onClick={() => step(1)}>
          ›
        </button>
      </div>
      <div className={styles.expertiseDots}>
        {POSITIONS.map((index) => (
          <button
            key={index}
            type="button"
            className={clsx(styles.expertiseDot, index === position && styles.active)}
            aria-label={`${index + 1} / ${COUNT}`}
            aria-current={index === position ? 'true' : undefined}
            onClick={() => setPosition(index)}
          />
        ))}
      </div>
    </section>
  );
}

/** The five rows, carrying `id="expertise"` — the target the design's "Expertise" nav link never had. */
export function ExpertiseRows({
  lang,
  year,
  onOpenModal
}: {
  lang: Lang;
  year: number;
  onOpenModal: OpenModalHandler;
}) {
  return (
    <div className={styles.fiveRows} id="expertise">
      {POSITIONS.map((row) => (
        <ExpertiseRow key={row} row={row} lang={lang} year={year} onOpenModal={onOpenModal} />
      ))}
    </div>
  );
}
