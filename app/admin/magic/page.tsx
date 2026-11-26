import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';
import {MagicLanding} from './landing';

export const metadata: Metadata = {
  title: 'შესვლა მეილით — engineers.ge admin',
  robots: {index: false, follow: false},
  // The login token lives in the URL fragment (never sent anywhere), but there
  // is no reason for this page to leak even its own URL. next.config.ts sets
  // the matching Referrer-Policy header for /admin/magic.
  referrer: 'no-referrer'
};

export const dynamic = 'force-dynamic';

export default async function AdminMagicPage() {
  const session = await getSession();
  if (session) redirect('/admin/stats');
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="font-semibold text-lg">engineers.ge</div>
          <div className="text-sm text-fg-muted">ადმინში შესვლა მეილით</div>
        </div>
        <MagicLanding />
      </div>
    </div>
  );
}
