'use client';

import {useEffect} from 'react';
import {
  STORY_BIRTH_YEAR,
  currentStoryYear,
  sortStoryEventsDesc,
  type StoryEvent
} from '@/lib/story-timeline';

type Props = {
  open: boolean;
  ownerName: string;
  events: StoryEvent[];
  onClose: () => void;
};

export function StoryTimelineModal({open, ownerName, events, onClose}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sorted = sortStoryEventsDesc(events);
  const year = currentStoryYear();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${ownerName} · storyabout.me`}
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[6px] md:p-6 story-overlay-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="story-modal relative mb-10 w-full max-w-[820px] overflow-hidden rounded-[14px] bg-sur"
      >
        <div className="flex items-center justify-between border-b border-bdr bg-sur px-6 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <CrownIcon className="h-[22px] w-[28px] text-navy" />
            <div>
              <h2 className="text-[18px] font-bold leading-tight tracking-tight text-navy">
                {ownerName} · storyabout.me
              </h2>
              <p className="mt-[3px] font-mono text-[11px] tracking-[0.05em] text-text-3">
                {STORY_BIRTH_YEAR} → {year} · ცხოვრების ქრონოლოგია
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="დახურვა"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-bdr bg-sur text-text-2 transition-colors hover:border-blue hover:bg-[var(--blue-lt)] hover:text-blue"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="story-timeline relative px-6 pb-8 pt-7 md:px-6">
          <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 -translate-x-1/2">
            <span className="story-spine block h-full w-[3px] rounded-sm" />
          </div>

          <div className="relative z-[3] flex justify-center pb-3">
            <span className="story-current-marker rounded-full bg-navy px-[14px] py-[6px] font-mono text-[11px] font-bold tracking-[0.08em] text-white">
              ● {year} · ახლა
            </span>
          </div>

          {sorted.map((ev, i) => (
            <StoryEventRow key={ev.id} event={ev} index={i} />
          ))}

          <div className="relative z-[2] pb-1 pt-5 text-center">
            <span className="story-birth inline-flex items-center gap-[10px] rounded-full bg-navy px-[18px] py-[9px] font-mono text-[13px] font-bold tracking-[0.05em] text-white">
              <span className="story-birth-dot h-[9px] w-[9px] rounded-full bg-blue" />
              {STORY_BIRTH_YEAR} · დაიბადე
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryEventRow({event, index}: {event: StoryEvent; index: number}) {
  const side: 'left' | 'right' = index % 2 === 0 ? 'right' : 'left';
  const accent = event.accent || '#1f6fd4';
  const delay = 0.35 + index * 0.15;

  return (
    <div
      className={`story-event ${side}`}
      style={{
        ['--accent' as string]: accent,
        animationDelay: `${delay}s`
      }}
    >
      <EventCircle event={event} />
      <EventContent event={event} side={side} />
    </div>
  );
}

function EventCircle({event}: {event: StoryEvent}) {
  const accent = event.accent || '#1f6fd4';
  return (
    <div
      className="story-circle"
      title={`${event.year} — ${event.title}`}
    >
      {event.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          className="h-8 w-8"
          style={{color: accent, opacity: 0.9}}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )}
    </div>
  );
}

function EventContent({event, side}: {event: StoryEvent; side: 'left' | 'right'}) {
  const accent = event.accent || '#1f6fd4';

  const card = (
    <div
      className="story-card flex-1 rounded-[var(--radius)] border border-bdr bg-sur px-[22px] py-[18px] text-center"
      style={{['--accent' as string]: accent}}
    >
      <h3
        className="story-card-title mb-[6px] text-[13px] font-bold uppercase tracking-[0.08em]"
        style={{color: accent}}
      >
        {event.title}
      </h3>
      <p className="m-0 text-[12px] leading-[1.55] text-text-2">{event.description}</p>
    </div>
  );

  const yearPill = (
    <span
      className="story-year shrink-0 rounded-[5px] px-3 py-[6px] font-mono text-[12px] font-bold tracking-[0.08em] text-white"
      style={{background: accent}}
    >
      {event.year}
    </span>
  );

  const connector = <span className="story-connector" style={{background: accent}} />;

  if (side === 'right') {
    return (
      <div className="story-event-content">
        {yearPill}
        {connector}
        {card}
      </div>
    );
  }

  return (
    <div className="story-event-content">
      {card}
      {connector}
      {yearPill}
    </div>
  );
}

function CrownIcon({className = ''}: {className?: string}) {
  return (
    <svg viewBox="0 0 24 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2 6L5 14H19L22 6L17 9.5L12 3L7 9.5L2 6Z" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx="2" cy="6" r="1.6" fill="currentColor" />
      <circle cx="22" cy="6" r="1.6" fill="currentColor" />
      <circle cx="12" cy="3" r="1.6" fill="currentColor" />
      <rect x="4" y="14" width="16" height="2.4" fill="currentColor" rx="0.5" />
    </svg>
  );
}

export function CrownButton({onClick}: {onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="story-crown-btn flex flex-col items-center gap-[6px] rounded-[10px] border-0 bg-transparent px-[18px] py-2 transition-colors hover:bg-[var(--blue-lt)]"
      aria-label="ჩემი გზა · storyabout.me"
    >
      <CrownIcon className="story-crown h-[26px] w-[32px] text-[#e8c564]" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-navy">ჩემი გზა</span>
    </button>
  );
}
