import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getSession} from '@/lib/auth';
import {LogoutButton} from './logout-button';

export default async function AuthedAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">engineers.ge · Admin</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/banners" className="hover:text-accent">Banners</Link>
            <Link href="/admin/stats" className="hover:text-accent">Stats</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
