import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {BankClient} from './bank-client';

export const dynamic = 'force-dynamic';

export default async function BankPage() {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  if (session.role !== 'admin') redirect('/construction/app');
  return <BankClient session={session} />;
}
