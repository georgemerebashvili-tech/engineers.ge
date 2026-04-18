import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {BannersStats} from '@/components/admin/banners/stats';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები · სტატისტიკა · Admin'};

export default async function BannersStatsPage() {
  const slots = await getHeroAdSlots();
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'სტატისტიკა'}]}
        title="ბანერები · სტატისტიკა"
        description="გვერდის ჩვენებები, ფასების განაწილება, TOP slot-ები."
      />
      <AdminSection>
        <BannersStats slots={slots} />
      </AdminSection>
    </>
  );
}
