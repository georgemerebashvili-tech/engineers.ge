import {HeroTreemap} from '@/components/hero-treemap';
import {HERO_OWNER_NAME, type HeroAdSlot} from '@/lib/hero-ads';
import {BannersShell} from './shell';

export function BannersPreview({slots}: {slots: HeroAdSlot[]}) {
  return (
    <BannersShell
      title="ბანერები · Preview"
      description="ცოცხალი preview · ზუსტად ისე, როგორც ვიზიტორს უჩანდება მთავარ გვერდზე."
    >
      <div className="rounded-card border border-bdr bg-sur p-4">
        <div className="rounded-lg bg-sur-2 p-3">
          <HeroTreemap slots={slots} />
        </div>
        <p className="mt-3 text-[11px] text-text-3">
          Owner ნიშანი ({HERO_OWNER_NAME}) ფიქსირებულად ჩანს ყველა სარეკლამო
          slot-ზე.
        </p>
      </div>
    </BannersShell>
  );
}
