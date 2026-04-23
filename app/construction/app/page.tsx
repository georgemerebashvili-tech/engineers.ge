import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ConstructionAppFrame} from './frame';

export const dynamic = 'force-dynamic';

export default async function ConstructionAppPage() {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  return <ConstructionAppFrame session={session} />;
}
