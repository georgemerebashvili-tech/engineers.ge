import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ProcurementList} from './procurement-list';

export const dynamic = 'force-dynamic';

export default async function ProcurementPage() {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  return <ProcurementList session={session} />;
}
