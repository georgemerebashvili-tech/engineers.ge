import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {BannersTable} from '@/components/admin/banners/table';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები · ცხრილი · Admin'};

export default async function BannersTablePage() {
  const slots = await getHeroAdSlots();
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'ცხრილი'}]}
        title="ბანერები · ცხრილი"
        description="ყველა სლოტი ერთ ცხრილში."
      />
      <AdminSection>
        <BannersTable slots={slots} />
      </AdminSection>
    </>
  );
}
