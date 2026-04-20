import {redirect} from 'next/navigation';
import {getTbcSession} from '@/lib/tbc/auth';
import {MobileApp} from './mobile-app';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'მობილური · TBC ინვენტარიზაცია',
  robots: {index: false, follow: false}
};

export default async function TbcMobilePage() {
  const session = await getTbcSession();
  if (!session) redirect('/tbc');
  return <MobileApp session={session} />;
}
