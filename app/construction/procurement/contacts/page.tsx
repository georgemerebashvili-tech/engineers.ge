import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ContactsClient} from './contacts-client';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const session = await getConstructionSession();
  if (!session) redirect('/construction');
  return <ContactsClient session={session} />;
}
