'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useRouter, usePathname} from '@/i18n/navigation';
import {routing, type Locale} from '@/i18n/routing';
import {Globe} from 'lucide-react';
import {useTransition} from 'react';

const LABELS: Record<Locale, string> = {
  ka: '🇬🇪 ქართული',
  en: '🇬🇧 English',
  ru: '🇷🇺 Русский',
  tr: '🇹🇷 Türkçe',
  az: '🇦🇿 Azərbaycan',
  hy: '🇦🇲 Հայերեն'
};

export function LangSwitch() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const t = useTranslations('lang');

  if (pathname.startsWith('/calc/')) return null;

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <Globe size={16} aria-hidden />
      <span className="sr-only">{t('label')}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          start(() => router.replace(pathname, {locale: next}));
        }}
        className="bg-transparent rounded-md border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
