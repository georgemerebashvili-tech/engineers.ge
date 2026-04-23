import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ConstructionAdminPanel} from './panel';

export const dynamic = 'force-dynamic';

export default async function ConstructionAdminPage() {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  if (session.role !== 'admin') redirect('/construction/app');
  return <ConstructionAdminPanel session={session} />;
}
