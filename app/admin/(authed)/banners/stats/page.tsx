import {getHeroAdSlots, listHeroAdPayments} from '@/lib/hero-ads-store';
import {BannersStats} from '@/components/admin/banners/stats';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები · სტატისტიკა · Admin'};

export default async function BannersStatsPage() {
  const [slots, paymentSnapshot] = await Promise.all([
    getHeroAdSlots(),
    listHeroAdPayments()
  ]);
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'სტატისტიკა'}]}
        title="ბანერები · სტატისტიკა"
        description="ფასები, payments ledger, outstanding invoices და paid-until coverage."
      />
      <AdminSection>
        <BannersStats
          slots={slots}
          initialPayments={paymentSnapshot.payments}
          paymentsSource={paymentSnapshot.source}
        />
      </AdminSection>
    </>
  );
}
