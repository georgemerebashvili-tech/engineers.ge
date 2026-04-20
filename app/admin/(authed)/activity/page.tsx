import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {getActivityFeed, groupByKind} from '@/lib/activity-feed';
import {ActivityList} from './list';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Activity · Admin · engineers.ge'};

export default async function AdminActivityPage() {
  const entries = await getActivityFeed(80);
  const counts = groupByKind(entries);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მთავარი'}, {label: 'Activity'}]}
        title="Live activity feed"
        description='ერთი ადგილიდან ხედავ: ახალი bug, crash, 404, consent, user registration, admin action. Launch-day-ზე ეს გვერდი უნდა გქონდეს ღია რომ "რა ხდება?" კითხვას მომენტალურად უპასუხო.'
      />
      <AdminSection>
        <ActivityList initial={entries} counts={counts} />
      </AdminSection>
    </>
  );
}
