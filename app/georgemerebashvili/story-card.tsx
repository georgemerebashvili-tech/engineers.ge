'use client';

import clsx from 'clsx';
import {TIMELINE_COPY, langOfText, pick, resolveText, yearRecord, type Lang} from './content';
import type {OpenModalHandler} from './detail-modal';
import styles from './portfolio.module.css';

/**
 * The selected year's story: the big year, the kicker, the title, the text and the focus-area
 * buttons. What a year does not have is not drawn: no text, no paragraph; no focus areas, no panel
 * (a milestone year is its label and nothing else). Text is plain React text, never innerHTML. The
 * written years are Georgian-only in the design, so on the English page their text is marked lang="ka".
 */
export function StoryCard({year, lang, onOpenModal}: {year: number; lang: Lang; onOpenModal: OpenModalHandler}) {
  const record = yearRecord(year);
  const kicker = record.tag ? `${year} / ${record.tag}` : String(year);
  const directions = Object.entries(record.directions);
  const title = resolveText(record.title, lang);

  return (
    <div className={styles.storyPanel} id="storyCard" aria-live="polite">
      <div className={styles.storyVisual}>
        <strong>{year}</strong>
      </div>
      <div className={clsx(styles.storyContent, directions.length === 0 && styles.storyContentSolo)}>
        <div className={styles.storyDescription}>
          <span className={styles.storyKicker}>{kicker}</span>
          <h3 data-testid="story-title" lang={langOfText(title, lang)}>
            {title}
          </h3>
          {record.text && <p lang={langOfText(record.text, lang)}>{record.text}</p>}
        </div>
        {directions.length > 0 && (
          <div className={styles.directionPanel}>
            <h4>{pick(TIMELINE_COPY.directionsHeading, lang)}</h4>
            <div className={styles.directionTags}>
              {directions.map(([name, direction]) => (
                <button
                  key={name}
                  type="button"
                  lang={langOfText(name, lang)}
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
        )}
      </div>
    </div>
  );
}
