'use client';

import clsx from 'clsx';
import Image from 'next/image';
import {Fragment, useCallback, useEffect, useState} from 'react';
import {useTheme} from '@/components/theme-provider';
import {
  AWARD_ITEMS,
  AWARDS,
  BRAND,
  COMPANIES,
  CONTACT,
  DEFAULT_YEAR,
  FOOTER,
  HERO,
  NAV_ARIA_LABEL,
  NAV_LINKS,
  SAZEO,
  THEME_BUTTON_LABEL,
  TIMELINE_COPY,
  pick,
  resolveText,
  type Lang
} from './content';
import {DetailModal, type ModalContent, type OpenModal, type OpenModalHandler} from './detail-modal';
import {ExpertiseRows} from './expertise-rows';
import {notoSansGeorgian} from './font';
import {Gallery} from './gallery';
import {smoothBehavior} from './motion';
import styles from './portfolio.module.css';
import {StoryCard} from './story-card';
import {YearStrip} from './year-strip';

/**
 * The owner's portfolio design as one interactive page. The first render (server and client) is the
 * Georgian page, or English when the site's own locale is `en` (decided in page.tsx); the ka/EN
 * toggle then switches every string. ☀ / ☾ drives the site-wide theme, so the site and this page
 * never disagree (portfolio.module.css keys its dark palette off `html.dark`).
 */
export function Portfolio({initialLang}: {initialLang: Lang}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [modal, setModal] = useState<OpenModal | null>(null);
  const {toggleTheme} = useTheme();

  const openModal = useCallback<OpenModalHandler>((content: ModalContent, trigger: HTMLElement) => {
    setModal({content, trigger});
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  // <html lang> follows the page language while it is on screen (the design set it from the toggle).
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.lang;
    html.lang = lang;
    return () => {
      html.lang = previous;
    };
  }, [lang]);

  // The design's `html{scroll-behavior:smooth;scroll-padding-top:64px}`, scoped to this page's lifetime
  // (and not smooth for visitors who asked for reduced motion). `data-scroll-behavior="smooth"` is
  // Next's own opt-in to switch smooth scrolling off while it changes route, so leaving this page
  // (or arriving from one) jumps to the top instead of animating there.
  useEffect(() => {
    const html = document.documentElement;
    const before = {
      behavior: html.style.scrollBehavior,
      padding: html.style.scrollPaddingTop,
      flag: html.dataset.scrollBehavior
    };
    const smooth = smoothBehavior() === 'smooth';
    html.style.scrollBehavior = smooth ? 'smooth' : 'auto';
    html.style.scrollPaddingTop = '64px';
    if (smooth) html.dataset.scrollBehavior = 'smooth';
    return () => {
      html.style.scrollBehavior = before.behavior;
      html.style.scrollPaddingTop = before.padding;
      if (before.flag === undefined) delete html.dataset.scrollBehavior;
      else html.dataset.scrollBehavior = before.flag;
    };
  }, []);

  return (
    <div className={clsx(styles.root, notoSansGeorgian.variable)}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span>{pick(BRAND, lang)}</span>
        </div>
        <nav aria-label={pick(NAV_ARIA_LABEL, lang)}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {resolveText(link.label, lang)}
            </a>
          ))}
        </nav>
        <div className={styles.headActions}>
          <button
            type="button"
            aria-label={pick(THEME_BUTTON_LABEL, lang)}
            title={pick(THEME_BUTTON_LABEL, lang)}
            onClick={toggleTheme}
          >
            ☀ / ☾
          </button>
          <button
            type="button"
            className={clsx(lang === 'ka' && styles.active)}
            aria-pressed={lang === 'ka'}
            onClick={() => setLang('ka')}
          >
            ქარ
          </button>
          <button
            type="button"
            className={clsx(lang === 'en' && styles.active)}
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} id="home">
          <div className={styles.heroPicture}>
            <Image
              src="/georgemerebashvili/portrait.webp"
              alt={HERO.portraitAlt}
              fill
              preload
              fetchPriority="high"
              sizes="(max-width: 700px) 100vw, 42vw"
            />
          </div>
          <div className={styles.heroCopy}>
            <h1>
              {HERO.nameLines[lang].map((line, index) => (
                <Fragment key={line}>
                  {index > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </h1>
            <p className={styles.heroSubtitle}>{pick(HERO.subtitle, lang)}</p>
            <div className={styles.orangeLine} />
            <h2>{pick(HERO.headline, lang)}</h2>
            <p className={styles.futureStatement}>{pick(HERO.future, lang)}</p>
            <button
              type="button"
              className={styles.cta}
              onClick={() => document.getElementById('timeline')?.scrollIntoView({behavior: smoothBehavior()})}
            >
              <span aria-hidden="true">▶</span>
              <span>{pick(HERO.cta, lang)}</span>
            </button>
            <div className={styles.companyGroup} role="group" aria-label={pick(HERO.companiesAriaLabel, lang)}>
              <div className={styles.companyTitle}>{pick(HERO.companiesTitle, lang)}</div>
              <div className={styles.companyCards}>
                {COMPANIES.map((company) => (
                  <div
                    key={company.name}
                    className={clsx(styles.companyCard, company.selected && styles.selected)}
                  >
                    <div className={styles.companyThumb}>
                      <Image
                        src={company.image.src}
                        width={company.image.width}
                        height={company.image.height}
                        alt={pick(company.alt, lang)}
                        unoptimized
                      />
                    </div>
                    <span className={styles.companyMonogram}>{company.monogram}</span>
                    <strong>{company.name}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.timeline} id="timeline">
          <div className={styles.timelineUpper}>
            <div className={styles.timelineTitle}>
              <h2>{pick(TIMELINE_COPY.title, lang)}</h2>
              <div className={styles.orangeLine} />
              <p>{pick(TIMELINE_COPY.lead, lang)}</p>
            </div>
            <YearStrip year={year} lang={lang} onChange={setYear} />
          </div>
          {/* right under the strip: a year's story must appear where the year was picked, not below five carousels */}
          <StoryCard year={year} lang={lang} onOpenModal={openModal} />
          <p className={styles.timelineHelp}>{pick(TIMELINE_COPY.help, lang)}</p>
          <ExpertiseRows lang={lang} year={year} onOpenModal={openModal} />
        </section>

        <section className={styles.sazeo} id="sazeo">
          <div className={styles.sazeoLogo}>
            <span className={styles.slash} />
            Sazeo
          </div>
          <div className={styles.sazeoFacts}>
            {SAZEO.facts.map((fact) => (
              <div key={fact.mark}>
                {fact.mark} <span>{pick(fact.text, lang)}</span>
              </div>
            ))}
          </div>
          <div className={styles.sazeoHighlights}>
            {SAZEO.highlights.map((highlight) => (
              <div key={highlight.en}>{pick(highlight, lang)}</div>
            ))}
          </div>
          <Image
            className={styles.sazeoMark}
            src={SAZEO.image.src}
            width={SAZEO.image.width}
            height={SAZEO.image.height}
            alt={pick(SAZEO.imageAlt, lang)}
            unoptimized
          />
        </section>

        <Gallery lang={lang} onOpenModal={openModal} />

        {/* no verified awards yet: no section (and no nav link, see NAV_LINKS) */}
        {AWARD_ITEMS.length > 0 && (
          <section className={clsx(styles.lower, styles.white)} id="awards">
            <h2 className={styles.sectionHeading}>{pick(AWARDS.heading, lang)}</h2>
            <div className={styles.awardGrid}>
              {AWARD_ITEMS.map((card) => (
                <div key={card.title.en} className={styles.awardCard}>
                  <strong>{pick(card.title, lang)}</strong>
                  <p>{pick(card.text, lang)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.contact} id="contact">
          <h2>{pick(CONTACT.heading, lang)}</h2>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </section>
      </main>

      <footer>{pick(FOOTER, lang)}</footer>

      {modal && <DetailModal content={modal.content} trigger={modal.trigger} lang={lang} onClose={closeModal} />}
    </div>
  );
}
