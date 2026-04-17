import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ka', 'en', 'ru', 'tr', 'az', 'hy'],
  defaultLocale: 'ka',
  localePrefix: 'never',
  localeCookie: {name: 'lang', maxAge: 60 * 60 * 24 * 365}
});

export type Locale = (typeof routing.locales)[number];
