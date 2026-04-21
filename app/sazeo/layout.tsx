import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sazeo — Claude Tracker',
  description: 'DMT contracted-developer Claude Code activity monitor',
  robots: {index: false, follow: false}
};

export default async function SazeoLayout({children}: {children: React.ReactNode}) {
  const session = await getSession();
  if (!session) redirect('/admin');
  return <>{children}</>;
}
