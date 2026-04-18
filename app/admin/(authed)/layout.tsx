import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';
import {NavBar} from '@/components/nav-bar';
import {AdminSidebar} from '@/components/admin-sidebar';

export default async function AuthedAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/admin');

  return (
    <>
      <NavBar />
      <div className="sticky top-14 md:top-16 z-40 bg-red-100 text-red-700 text-center py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] border-b border-red-200">
        ⚠ ადმინისტრატორის პანელი · {session.user} ⚠
      </div>
      <div className="flex min-h-[calc(100vh-56px)]">
        <AdminSidebar />
        <main className="flex-1 bg-bg">{children}</main>
      </div>
    </>
  );
}
