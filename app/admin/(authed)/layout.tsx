import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';
import {NavBar} from '@/components/nav-bar';
import {AdminSidebar} from '@/components/admin-sidebar';
import {AdminBreadcrumbs} from '@/components/admin-breadcrumbs';
import {AdminCommandPaletteMount} from '@/components/admin-command-palette-client';
import {getFeatureFlags} from '@/lib/feature-flags';

export default async function AuthedAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/admin');

  const flags = await getFeatureFlags();

  return (
    <>
      <NavBar />
      <div className="sticky top-14 md:top-16 z-40 flex items-center justify-center gap-3 bg-red-100 text-red-700 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] border-b border-red-200">
        <span>⚠ ადმინისტრატორის პანელი · {session.user} ⚠</span>
        <span className="hidden md:inline-flex items-center gap-1 opacity-70 tracking-normal normal-case">
          <kbd className="rounded border border-red-300 bg-white/60 px-1 py-0.5 text-[9px] font-sans">⌘K</kbd>
          ძიება
        </span>
      </div>
      <AdminCommandPaletteMount />
      <div className="flex min-h-[calc(100vh-56px)]">
        <AdminSidebar flags={flags} />
        <main id="main-content" className="flex-1 bg-bg">
          <div className="border-b bg-sur">
            <AdminBreadcrumbs />
          </div>
          {children}
        </main>
      </div>
    </>
  );
}
