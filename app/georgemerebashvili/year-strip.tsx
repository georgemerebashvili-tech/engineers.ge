'use client';

import clsx from 'clsx';
import {useEffect, useRef, type ReactNode} from 'react';
import {MILESTONES, TIMELINE_COPY, YEAR_VALUES, pick, type Lang, type MilestoneIcon} from './content';
import {smoothBehavior} from './motion';
import styles from './portfolio.module.css';

const GLYPHS: Record<MilestoneIcon, ReactNode> = {
  baby: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9h.01M15 9h.01M9 15c1.8 2 4.2 2 6 0" />
      <path d="M11 3c0-2 3-2 3 0" />
    </>
  ),
  school: (
    <>
      <path d="M3 21V9l9-6 9 6v12H3Z" />
      <path d="M9 21v-7h6v7M7 10h.01M17 10h.01" />
    </>
  ),
  graduation: (
    <>
      <path d="m2 10 10-5 10 5-10 5-10-5Z" />
      <path d="M6 12v5c4 3 8 3 12 0v-5M22 10v7" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13c6 4 12 4 18 0M12 13v3" />
    </>
  )
};

function Glyph({icon}: {icon: MilestoneIcon}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[icon]}
    </svg>
  );
}

/**
 * The year ruler: prev/next buttons, arrow keys while focus is inside it, swipe, milestone icons,
 * and the selected year centred in view.
 */
export function YearStrip({year, lang, onChange}: {year: number; lang: Lang; onChange: (year: number) => void}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const centredOnce = useRef(false);
  const touchStartX = useRef<number | null>(null);
  // The design rebuilt the whole strip on every change, which dropped keyboard focus; here the
  // focus follows the selection when the change came from an arrow key.
  const followWithFocus = useRef(false);

  const move = (delta: number) => {
    const index = YEAR_VALUES.indexOf(year);
    const next = Math.min(YEAR_VALUES.length - 1, Math.max(0, index + delta));
    onChange(YEAR_VALUES[next]);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const chosen = viewport?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!viewport || !chosen) return;
    viewport.scrollTo({
      left: chosen.offsetLeft - viewport.clientWidth / 2 + chosen.offsetWidth / 2,
      // the first centring is a placement, not an animation
      behavior: centredOnce.current ? smoothBehavior() : 'instant'
    });
    centredOnce.current = true;
    if (followWithFocus.current) {
      followWithFocus.current = false;
      chosen.focus({preventScroll: true});
    }
  }, [year]);

  return (
    <div
      className={styles.yearNavigation}
      role="group"
      aria-label={pick(TIMELINE_COPY.yearsAriaLabel, lang)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        const target = YEAR_VALUES.indexOf(year) + delta;
        if (target < 0 || target >= YEAR_VALUES.length) return;
        followWithFocus.current = viewportRef.current?.contains(event.target as Node) ?? false;
        move(delta);
      }}
    >
      <button type="button" className={styles.yearSide} aria-label={pick(TIMELINE_COPY.prevYear, lang)} onClick={() => move(-1)}>
        ‹
      </button>
      <div
        ref={viewportRef}
        className={styles.yearViewport}
        id="yearViewport"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0].screenX;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = event.changedTouches[0].screenX - touchStartX.current;
          if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        <div className={styles.years} id="years">
          {YEAR_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              className={clsx(styles.yearItem, value === year && styles.current)}
              aria-pressed={value === year}
              onClick={() => onChange(value)}
            >
              {value}
              {MILESTONES[value] && (
                <span className={styles.milestoneIcons}>
                  {MILESTONES[value].map(({icon, label}) => (
                    <span key={icon + label} className={styles.milestonePill} title={label} role="img" aria-label={label}>
                      <Glyph icon={icon} />
                    </span>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className={styles.yearSide} aria-label={pick(TIMELINE_COPY.nextYear, lang)} onClick={() => move(1)}>
        ›
      </button>
    </div>
  );
}
