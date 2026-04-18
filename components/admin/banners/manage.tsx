import {HeroAdsForm} from '@/app/admin/(authed)/tiles/form';
import type {HeroAdSlot} from '@/lib/hero-ads';
import {BannersShell} from './shell';

export function BannersManage({slots}: {slots: HeroAdSlot[]}) {
  return (
    <BannersShell
      title="Hero Ads · მართვა"
      description="აირჩიე slot → შეცვალე ფასი, ვადა, სურათი → Live სიმულაცია → შენახვა."
    >
      <div className="rounded-card border border-bdr bg-sur p-4">
        <HeroAdsForm initial={slots} />
      </div>
    </BannersShell>
  );
}
