import {HeroAdsForm} from '@/app/admin/(authed)/tiles/form';
import type {HeroAdSlot, HeroAdUploadRequest} from '@/lib/hero-ads';
import {BannersShell} from './shell';
import {HeroAdUploadRequestsPanel} from './upload-requests';

export function BannersManage({
  slots,
  requests,
  requestsSource
}: {
  slots: HeroAdSlot[];
  requests: HeroAdUploadRequest[];
  requestsSource: 'live' | 'unavailable';
}) {
  return (
    <BannersShell
      title="Hero Ads · მართვა"
      description="აირჩიე slot → შეცვალე ფასი, ვადა, სურათი → Live სიმულაცია → შენახვა."
    >
      <div className="grid gap-5">
        <div className="rounded-card border border-bdr bg-sur p-4">
          <HeroAdsForm initial={slots} />
        </div>
        <HeroAdUploadRequestsPanel
          initialRequests={requests}
          slots={slots}
          source={requestsSource}
        />
      </div>
    </BannersShell>
  );
}
