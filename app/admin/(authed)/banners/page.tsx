import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {listAuditEntries} from '@/lib/admin-audit';
import {BannersOverview} from '@/components/admin/banners/overview';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები · მიმოხილვა · Admin'};

export default async function BannersOverviewPage() {
  const [slots, history] = await Promise.all([
    getHeroAdSlots(),
    listAuditEntries({action: 'tile', limit: 12})
  ]);
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ბანერები'}, {label: 'მიმოხილვა'}]}
        title="ბანერები · მიმოხილვა"
        description="Hero ads, დატვირთულობა, შემოსავალი და live treemap."
      />
      <AdminSection>
        <BannersOverview
          slots={slots}
          history={history.map((entry) => ({
            id: entry.id,
            actor: entry.actor,
            action: entry.action,
            targetId: entry.target_id,
            createdAt: entry.created_at,
            metadata: entry.metadata
          }))}
        />
      </AdminSection>
    </>
  );
}
