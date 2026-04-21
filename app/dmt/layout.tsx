import type {Metadata} from 'next';
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

// Note: middleware.ts at repo root gates /dmt/* — redirects unauthenticated
// requests to /dmt/login (except /dmt/login, /dmt/register, /dmt/forgot, /dmt/reset).
// Layout just reads the user and renders sidebar conditionally.

export default async function DmtLayout({children}: {children: React.ReactNode}) {
  const user = await getCurrentDmtUser();

  if (!user) {
    // No user — either public auth page (middleware allowed) or the first render
    // before redirect. Render content without sidebar so login/register work.
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
