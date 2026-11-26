'use client';

import {STORY_COPY, TIMELINE_COPY, pick, yearRecord, type Lang} from './content';
import type {OpenModalHandler} from './detail-modal';
import styles from './portfolio.module.css';

/**
 * The selected year's story: badge, kicker, title, text, demo note and the focus-area buttons.
 *
 * The design's own stylesheet ends with `#storyCard{display:none!important}`, so this card is built
 * and kept up to date but not shown (ported as is; showing it again is a one-line CSS change in
 * portfolio.module.css). Text is plain React text, never innerHTML.
 */
export function StoryCard({year, lang, onOpenModal}: {year: number; lang: Lang; onOpenModal: OpenModalHandler}) {
  const record = yearRecord(year);
  const kicker = `${year} / ${record.demo ? 'DEMO' : 'SAZEO'}`;

  return (
    <div className={styles.storyPanel} id="storyCard" aria-live="polite">
      <div className={styles.storyVisual}>
        <span className={styles.storyStamp}>
          {record.demo ? `DEMO · ${pick(STORY_COPY.demoBadge, lang)}` : pick(STORY_COPY.verifiedBadge, lang)}
        </span>
        <strong>{year}</strong>
      </div>
      <div className={styles.storyContent}>
        <div className={styles.storyDescription}>
          <span className={styles.storyKicker}>{kicker}</span>
          <h3 data-testid="story-title">{record.title}</h3>
          <p>{record.text}</p>
          <div className={styles.demoNote}>{record.demo ? pick(STORY_COPY.demoNote, lang) : ''}</div>
        </div>
        <div className={styles.directionPanel}>
          <h4>{pick(TIMELINE_COPY.directionsHeading, lang)}</h4>
          <div className={styles.directionTags}>
            {Object.entries(record.directions).map(([name, direction]) => (
              <button
                key={name}
                type="button"
                onClick={(event) =>
                  onOpenModal(
                    {kicker, title: name, text: direction.text, images: direction.photos},
                    event.currentTarget
                  )
                }
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
