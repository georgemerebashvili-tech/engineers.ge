import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {HeroAdsForm} from './form';

export const dynamic = 'force-dynamic';

export default async function AdminTilesPage() {
  const initial = await getHeroAdSlots();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Hero Ads</h1>
        <p className="text-sm text-fg-muted">
          ლურჯი კონტურებიანი სარეკლამო slot-ები, ფასები, დაკავების ვადა და live
          სიმულაცია მთავარ გვერდზე. გიორგი მერებაშვილი ფიქსირებულად ჩანს owner
          ნიშნად.
        </p>
      </div>
      <HeroAdsForm initial={initial} />
    </div>
  );
}
