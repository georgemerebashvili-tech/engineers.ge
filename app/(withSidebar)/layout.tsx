import {DashboardSidebar} from '@/components/dashboard-sidebar';
import {Footer} from '@/components/footer';
import {NavBar} from '@/components/nav-bar';
import {ReferralWidget} from '@/components/referral-widget';

export default function WithSidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <main className="flex-1 bg-bg overflow-x-hidden">{children}</main>
      </div>
      <Footer />
      <ReferralWidget />
    </>
  );
}
