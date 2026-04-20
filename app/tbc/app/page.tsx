import {redirect} from 'next/navigation';
import {getTbcSession} from '@/lib/tbc/auth';
import {TbcAppFrame} from './frame';

export const dynamic = 'force-dynamic';

export default async function TbcAppPage() {
  const session = await getTbcSession();
  if (!session) redirect('/tbc');
  return <TbcAppFrame session={session} />;
}
