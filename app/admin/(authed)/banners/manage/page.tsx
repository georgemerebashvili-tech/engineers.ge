import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {BannersManage} from '@/components/admin/banners/manage';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Hero Ads მართვა · Admin'};

export default async function BannersManagePage() {
  const slots = await getHeroAdSlots();
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'Hero Ads მართვა'}]}
        title="Hero Ads · მართვა"
        description="აირჩიე slot → შეცვალე ფასი, ვადა, სურათი → შენახვა."
      />
      <AdminSection>
        <BannersManage slots={slots} />
      </AdminSection>
    </>
  );
}
