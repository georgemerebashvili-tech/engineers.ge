import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {IssueTabs} from '@/components/admin/issues/tabs-nav';
import {listBugReports} from '@/lib/bug-reports';
import {BugReportsTable} from './table';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ხარვეზები · Admin · engineers.ge'};

export default async function AdminBugReportsPage() {
  const reports = await listBugReports({limit: 500});

  const counts = {
    open: reports.filter((r) => r.status === 'open').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    archived: reports.filter((r) => r.status === 'archived').length
  };

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ანალიტიკა'}, {label: 'ხარვეზები'}]}
        title="ხარვეზების შეტყობინებები"
        description="ვიზიტორების მიერ გაგზავნილი bug reports სატესტო გვერდებიდან. სტატუსი იცვლება ინლაინ — confirmation არ სჭირდება."
      />
      <AdminSection>
        <IssueTabs />
        {reports.length === 0 ? (
          <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-2">
            ჯერ არცერთი შეტყობინება არ არის მიღებული.{' '}
            <span className="text-text-3">
              (ან Supabase DB offline — გაუშვი <code className="font-mono text-xs">0016_bug_reports.sql</code>)
            </span>
          </div>
        ) : (
          <BugReportsTable initial={reports} counts={counts} />
        )}
      </AdminSection>
    </>
  );
}
