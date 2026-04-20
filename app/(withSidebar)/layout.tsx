import {headers} from 'next/headers';
import {DashboardSidebar} from '@/components/dashboard-sidebar';
import {Footer} from '@/components/footer';
import {NavBar} from '@/components/nav-bar';
import {ReferralWidget} from '@/components/referral-widget';
import {TestModeBanner} from '@/components/test-mode-banner';
import {getFeatureFlags} from '@/lib/feature-flags';

export default async function WithSidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';
  const flags = await getFeatureFlags();

  return (
    <>
      <NavBar />
      <TestModeBanner pathname={pathname} />
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar flags={flags} />
        <main id="main-content" className="flex-1 bg-bg overflow-x-hidden">{children}</main>
      </div>
      <Footer />
      {flags['site.referral-widget'] !== 'hidden' && <ReferralWidget />}
    </>
  );
}
