import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {IssueTabs} from '@/components/admin/issues/tabs-nav';
import {countErrorsByDigest, listErrorEvents} from '@/lib/error-events';
import {ErrorsTable} from './table';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Errors · Admin · engineers.ge'};

type Search = {resolved?: string};

export default async function AdminErrorsPage({
  searchParams
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const resolvedFilter =
    sp.resolved === 'all' ? undefined : sp.resolved === '1' ? true : false;

  const [entries, digests] = await Promise.all([
    listErrorEvents({resolved: resolvedFilter, limit: 500}),
    countErrorsByDigest()
  ]);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ანალიტიკა'}, {label: 'Errors'}]}
        title="Client error events"
        description="Frontend runtime errors (React boundaries → sendBeacon). Duplicates აიჯგუფება digest-ით. გადახედე ახალი ხარვეზი რომელიც ყველაზე ხშირად ხდება."
      />
      <AdminSection>
        <IssueTabs />
        {entries.length === 0 ? (
          <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-2">
            ამ ფილტრში ჩანაწერი არ არის.{' '}
            <span className="text-text-3 text-xs">
              (ან migration 0018 არ გაუშვა: <code className="font-mono">0018_error_events.sql</code>)
            </span>
          </div>
        ) : (
          <ErrorsTable initial={entries} digests={digests} currentFilter={sp.resolved ?? '0'} />
        )}
      </AdminSection>
    </>
  );
}
