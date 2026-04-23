import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ProcurementDetail} from './procurement-detail';

export const dynamic = 'force-dynamic';

export default async function ProcurementDetailPage({params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  return <ProcurementDetail projectId={params.id} session={session} />;
}
