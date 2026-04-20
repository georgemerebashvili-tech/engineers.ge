import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, IBM_Plex_Mono} from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import {Suspense} from 'react';
import {ThemeProvider, THEME_INIT_SCRIPT} from '@/components/theme-provider';
import {Tracker} from '@/components/analytics/Tracker';
import {VerifyEmailFlash} from '@/components/verify-email-flash';
import {CookieConsent} from '@/components/cookie-consent';
import {WebVitalsReporter} from '@/components/web-vitals-reporter';
import {getFeatureFlags} from '@/lib/feature-flags';
import {hasAnalyticsConsent} from '@/lib/cookie-consent';
import {ORGANIZATION_JSONLD, WEBSITE_JSONLD, jsonLdScript} from '@/lib/structured-data';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700']
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600']
});

export const metadata: Metadata = {
  title: {
    default: 'engineers.ge — საინჟინრო ხელსაწყოები და ცოდნა',
    template: '%s — engineers.ge'
  },
  description:
    'HVAC, თბოდანაკარგები, თბოგადაცემის კოეფიციენტის გაანგარიშება, ხმაურდამხშობი სელექშენი — უფასო ონლაინ კალკულატორები ქართველი ინჟინრებისთვის.',
  metadataBase: new URL('https://engineers.ge'),
  applicationName: 'engineers.ge',
  keywords: [
    'engineers.ge',
    'საინჟინრო კალკულატორი',
    'HVAC',
    'თბოდანაკარგი',
    'თბოგადაცემა',
    'ვენტილაცია',
    'სახანძრო სიმულაცია',
    'საქართველო'
  ],
  authors: [{name: 'engineers.ge'}],
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'engineers.ge — საინჟინრო ხელსაწყოები და ცოდნა',
    description:
      'HVAC, თბოდანაკარგები, თბოგადაცემა, ხმაურდამხშობი სელექშენი, სახანძრო სიმულაცია — უფასო ონლაინ კალკულატორები ქართველი ინჟინრებისთვის.',
    url: 'https://engineers.ge'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'engineers.ge — საინჟინრო ხელსაწყოები',
    description:
      'HVAC, თბოდანაკარგები, ვენტილაცია, სახანძრო სიმულაცია — უფასო ონლაინ კალკულატორები'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default async function RootLayout({
  children
}: Readonly<{children: React.ReactNode}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const flags = await getFeatureFlags();
  const analyticsConsented = await hasAnalyticsConsent();
  const webVitalsEnabled =
    flags['site.web-vitals'] !== 'hidden' && analyticsConsented;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${jakarta.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: THEME_INIT_SCRIPT}} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript({...ORGANIZATION_JSONLD, '@id': `${ORGANIZATION_JSONLD.url}#org`})
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: jsonLdScript(WEBSITE_JSONLD)}}
        />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-text">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[200] focus:rounded-md focus:bg-blue focus:px-3 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
        >
          გადადი შიგთავსზე
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <NextTopLoader color="var(--blue)" showSpinner={false} height={2} />
            <Tracker />
            <Suspense fallback={null}>
              <VerifyEmailFlash />
            </Suspense>
            {children}
            <WebVitalsReporter enabled={webVitalsEnabled} />
            {flags['site.cookie-consent'] !== 'hidden' && <CookieConsent />}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
