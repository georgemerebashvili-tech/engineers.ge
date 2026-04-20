import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {listRateLimits} from '@/lib/rate-limit';
import {RateLimitsTable} from './table';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Rate limits · Admin · engineers.ge'};

export default async function AdminRateLimitsPage() {
  const rows = await listRateLimits({limit: 500});

  const now = Date.now();
  const locked = rows.filter(
    (r) => r.locked_until && new Date(r.locked_until).getTime() > now
  );
  const cooling = rows.filter((r) => !locked.includes(r));

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'Rate limits'}]}
        title="Rate limits"
        description='ამჟამინდელი locked IP-ები და bucket-ები. Launch-day-ზე გადახედე აქ თუ user-ი ჩივის „ვერ შემოვდივარ". Unlock ერთი click-ით.'
      />
      <AdminSection>
        <RateLimitsTable locked={locked} cooling={cooling} />
      </AdminSection>
    </>
  );
}
