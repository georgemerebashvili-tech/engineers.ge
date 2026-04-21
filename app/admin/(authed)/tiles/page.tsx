import {getHeroAdSlots, getHeroOwner} from '@/lib/hero-ads-store';
import {HeroAdsForm} from './form';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';

export default async function AdminTilesPage() {
  const [initial, initialOwner] = await Promise.all([getHeroAdSlots(), getHeroOwner()]);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'Hero Ads'}]}
        title="Hero Ads"
        description="ლურჯი კონტურებიანი სარეკლამო slot-ები, ფასები, დაკავების ვადა და live სიმულაცია მთავარ გვერდზე."
      />
      <AdminSection>
        <HeroAdsForm initial={initial} initialOwner={initialOwner} />
      </AdminSection>
    </>
  );
}
