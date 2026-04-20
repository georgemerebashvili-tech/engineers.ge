import {redirect} from 'next/navigation';
import {getTbcSession} from '@/lib/tbc/auth';
import {TbcAdminPanel} from './panel';

export const dynamic = 'force-dynamic';

export default async function TbcAdminPage() {
  const session = await getTbcSession();
  if (!session) redirect('/tbc');
  if (session.role !== 'admin') redirect('/tbc/app');
  return <TbcAdminPanel session={session} />;
}
