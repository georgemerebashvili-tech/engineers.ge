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
      <div className="bg-red-600 text-white text-center py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
        ⚠ ადმინისტრატორის პანელი · engineers.ge ⚠
      </div>
      <header className="border-b bg-sur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
              ადმინი
            </span>
            <div className="font-semibold truncate">
              engineers.ge · გიორგი მერებაშვილი
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/tiles" className="hover:text-accent">Hero Ads</Link>
            <Link href="/admin/banners" className="hover:text-accent">Banners</Link>
            <Link href="/admin/stats" className="hover:text-accent">Stats</Link>
            <Link href="/admin/donate" className="hover:text-accent">Donate</Link>
            <Link href="/admin/share" className="hover:text-accent">Share</Link>
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
