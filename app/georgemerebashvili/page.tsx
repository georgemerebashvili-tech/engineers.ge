import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import {jsonLdScript, personJsonLd} from '@/lib/structured-data';
import type {Lang} from './content';
import {Portfolio} from './portfolio';

const TITLE = 'გიორგი მერებაშვილი | პორტფოლიო';
const DESCRIPTION = 'გიორგი მერებაშვილი — ინჟინერი, მეწარმე და Sazeo-ს დამფუძნებელი';
const PORTRAIT = {
  url: '/georgemerebashvili/portrait.jpg',
  width: 900,
  height: 1075,
  alt: 'გიორგი მერებაშვილის პორტრეტი ოფისში'
};

export const metadata: Metadata = {
  title: {absolute: TITLE},
  description: DESCRIPTION,
  alternates: {canonical: '/georgemerebashvili'},
  // A page-level openGraph/twitter replaces the layout's wholesale, so each is complete here.
  openGraph: {
    type: 'profile',
    url: '/georgemerebashvili',
    siteName: 'engineers.ge',
    locale: 'ka_GE',
    title: TITLE,
    description: DESCRIPTION,
    firstName: 'გიორგი',
    lastName: 'მერებაშვილი',
    images: [PORTRAIT]
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: [PORTRAIT.url]
  }
};

// The design's <meta name="theme-color">: the phone's browser bar takes the header's navy.
export const viewport: Viewport = {themeColor: '#0d263f'};

/** The site's language cookie (i18n/routing.ts localeCookie, written by the nav's language switch). */
const LANG_COOKIE = 'lang';

export default async function GeorgeMerebashviliPage() {
  // English only when the visitor chose English on the site; everything else gets the Georgian original.
  // Read from the cookie, not getLocale(): the site runs no next-intl middleware (proxy.ts), so
  // getLocale() is always the default `ka` and would never switch this page to English.
  const initialLang: Lang = (await cookies()).get(LANG_COOKIE)?.value === 'en' ? 'en' : 'ka';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLdScript(personJsonLd())}} />
      <Portfolio initialLang={initialLang} />
    </>
  );
}
