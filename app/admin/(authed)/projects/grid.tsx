'use client';

import {Building2, FlaskConical, ExternalLink} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

type Card = {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  // The actual URL is never rendered as text — only used by window.open on click.
  open: () => void;
  badge?: string;
  accent: 'blue' | 'orange';
};

const CARDS: Card[] = [
  {
    key: 'tbc',
    label: 'TBC',
    desc: 'თიბისი ბანკის ფილიალების ინვენტარი — 240 ფილიალი, HVAC დანადგარი, ფოტო-სკანირება Claude Vision-ით, სახანძრო ანგარიშები.',
    icon: Building2,
    open: () => window.open('/tbc/admin', '_blank', 'noopener,noreferrer'),
    badge: 'Live',
    accent: 'blue'
  },
  {
    key: 'staging',
    label: 'Staging · Engineering',
    desc: 'ტესტ-გარემო (preview deployment). ცვლილებები ჯერ აქ ჩანს ცოცხალი DB-ით; production-ზე გადატანა მხოლოდ approve-ის შემდეგ.',
    icon: FlaskConical,
    open: () =>
      window.open(
        'https://engineers-ge-git-staging.vercel.app',
        '_blank',
        'noopener,noreferrer'
      ),
    badge: 'Preview',
    accent: 'orange'
  }
];

export function ProjectsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const badgeClass =
          c.accent === 'orange'
            ? 'bg-ora-lt text-ora border-ora-bd'
            : 'bg-blue-lt text-blue border-blue-bd';
        const iconBgClass =
          c.accent === 'orange'
            ? 'bg-ora-lt text-ora'
            : 'bg-blue-lt text-blue';
        return (
          <button
            key={c.key}
            type="button"
            onClick={c.open}
            className="group relative flex flex-col items-start gap-3 rounded-card border border-bdr bg-sur p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          >
            <div className="flex w-full items-start justify-between">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconBgClass}`}
              >
                <Icon size={22} strokeWidth={1.8} />
              </div>
              {c.badge && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                >
                  {c.badge}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-base font-bold text-navy">
                <span className="truncate">{c.label}</span>
                <ExternalLink
                  size={14}
                  className="text-text-3 transition-colors group-hover:text-blue"
                  aria-hidden
                />
              </div>
              <p className="mt-1.5 text-[12px] leading-snug text-text-2">
                {c.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
