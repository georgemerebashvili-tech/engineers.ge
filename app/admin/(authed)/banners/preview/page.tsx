import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {BannersPreview} from '@/components/admin/banners/preview';
import {BannerTabs} from '@/components/admin/banners/tabs-nav';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები · Preview · Admin'};

export default async function BannersPreviewPage() {
  const slots = await getHeroAdSlots();
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'Preview'}]}
        title="ბანერები · Preview"
        description="ცოცხალი preview — როგორც ვიზიტორს უჩანდება."
      />
      <AdminSection>
        <BannerTabs />
        <BannersPreview slots={slots} />
      </AdminSection>
    </>
  );
}
