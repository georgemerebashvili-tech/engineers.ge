import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
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

export default async function GeorgeMerebashviliPage() {
  const locale = await getLocale();
  // English only when the site itself is in English; every other locale gets the Georgian original.
  const initialLang: Lang = locale === 'en' ? 'en' : 'ka';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLdScript(personJsonLd())}} />
      <Portfolio initialLang={initialLang} />
    </>
  );
}
