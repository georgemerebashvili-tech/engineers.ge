import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Audit · Sazeo — Engineers.ge',
  description: 'Sazeo audit workspace — internal blueprints & reports',
  robots: {index: false, follow: false}
};

// proxy.ts is the real gate (it also covers the static blueprints under
// public/audit.sazeo); this check is the defence in depth every admin layout has.
export default async function AuditSazeoLayout({children}: {children: React.ReactNode}) {
  const session = await getSession();
  if (!session) redirect('/admin');
  return <>{children}</>;
}
