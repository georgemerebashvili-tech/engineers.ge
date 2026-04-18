import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {BannersOverview} from '@/components/admin/banners/overview';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები · მიმოხილვა · Admin'};

export default async function BannersOverviewPage() {
  const slots = await getHeroAdSlots();
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'მიმოხილვა'}]}
        title="ბანერები · მიმოხილვა"
        description="Hero ads, დატვირთულობა, შემოსავალი და live treemap."
      />
      <AdminSection>
        <BannersOverview slots={slots} />
      </AdminSection>
    </>
  );
}
