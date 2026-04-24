import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';

export const metadata = {title: 'Tag Console — engineers.ge'};

export default async function TagConsoleLayout({children}: {children: React.ReactNode}) {
  const session = await getSession();
  if (!session) redirect('/admin');
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0d1117] flex flex-col">
      {children}
    </div>
  );
}
