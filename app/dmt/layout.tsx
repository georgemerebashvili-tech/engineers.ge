import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {DmtSidebar} from '@/components/dmt/sidebar';
import {getCurrentDmtUser} from '@/lib/dmt/auth';

export const metadata: Metadata = {
  title: {
    default: 'DMT',
    template: '%s · DMT'
  },
  description: 'DMT — ინვოისები, ლიდები, ინვენტარიზაცია',
  robots: {index: false, follow: false}
};

// proxy.ts gates /dmt/* and sets x-pathname on every request. Public auth
// paths (login/register/forgot/reset) must render WITHOUT the sidebar — even
// if the user is already authenticated — otherwise the login form shows up
// inside the gated shell.
const PUBLIC_PATHS = ['/dmt/login', '/dmt/register', '/dmt/forgot', '/dmt/reset'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export default async function DmtLayout({children}: {children: React.ReactNode}) {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';
  const onPublic = isPublicPath(pathname);

  const user = await getCurrentDmtUser();

  // Authenticated user visiting a login/register page → bounce to /dmt.
  if (user && onPublic) {
    redirect('/dmt');
  }

  // Public path (unauthenticated) — render auth page without sidebar.
  if (onPublic) {
    return <div className="min-h-screen bg-bg text-text">{children}</div>;
  }

  // Gated path but no user (race with proxy.ts redirect) — render bare.
  if (!user) {
    return <div className="min-h-screen bg-bg text-text">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <DmtSidebar
        user={{name: user.name || user.email, email: user.email, role: user.role}}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
