import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, IBM_Plex_Mono} from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import {Suspense} from 'react';
import {ThemeProvider, THEME_INIT_SCRIPT} from '@/components/theme-provider';
import {Tracker} from '@/components/analytics/Tracker';
import {VerifyEmailFlash} from '@/components/verify-email-flash';
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
  title: 'engineers.ge — საინჟინრო ხელსაწყოები და ცოდნა',
  description:
    'HVAC, თბოდანაკარგები, თბოგადაცემის კოეფიციენტის გაანგარიშება, ხმაურდამხშობი სელექშენი — უფასო ონლაინ კალკულატორები ქართველი ინჟინრებისთვის.',
  metadataBase: new URL('https://engineers.ge')
};

export default async function RootLayout({
  children
}: Readonly<{children: React.ReactNode}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${jakarta.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: THEME_INIT_SCRIPT}} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-text">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <NextTopLoader color="var(--blue)" showSpinner={false} height={2} />
            <Tracker />
            <Suspense fallback={null}>
              <VerifyEmailFlash />
            </Suspense>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
