import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ProcurementDetail} from './procurement-detail';

export const dynamic = 'force-dynamic';

export default async function ProcurementDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  return <ProcurementDetail projectId={id} session={session} />;
}
