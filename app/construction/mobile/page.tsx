import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ConstructionMobileApp} from './mobile-app';

export const dynamic = 'force-dynamic';

export default async function ConstructionMobilePage() {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  return <ConstructionMobileApp session={session} />;
}
