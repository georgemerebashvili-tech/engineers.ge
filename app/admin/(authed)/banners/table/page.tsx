import {getHeroAdSlots, listHeroAdPayments} from '@/lib/hero-ads-store';
import {summarizeHeroAdPayments} from '@/lib/hero-ads';
import {BannersTable} from '@/components/admin/banners/table';
import {BannerTabs} from '@/components/admin/banners/tabs-nav';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები · ცხრილი · Admin'};

export default async function BannersTablePage() {
  const [slots, paymentSnapshot] = await Promise.all([
    getHeroAdSlots(),
    listHeroAdPayments()
  ]);
  const paymentSummary = summarizeHeroAdPayments(paymentSnapshot.payments);
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'ცხრილი'}]}
        title="ბანერები · ცხრილი"
        description="ყველა სლოტი ერთ ცხრილში."
      />
      <AdminSection>
        <BannerTabs />
        <BannersTable slots={slots} paidUntilBySlot={paymentSummary.paidUntilBySlot} />
      </AdminSection>
    </>
  );
}
