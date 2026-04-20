import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {listAuditActions, listAuditEntries} from '@/lib/admin-audit';
import {AuditTable} from './table';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Audit log · Admin · engineers.ge'};

type Search = {actor?: string; action?: string};

export default async function AdminAuditLogPage({
  searchParams
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const [entries, actions] = await Promise.all([
    listAuditEntries({actor: sp.actor, action: sp.action, limit: 500}),
    listAuditActions()
  ]);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'Audit log'}]}
        title="Admin audit log"
        description="ყოველი admin ქმედება (feature toggle, user delete, AI key change, pass change, tile edit…) იწერება აქ. ფორენზიკა: ვინ, რა, როდის, საიდან."
      />
      <AdminSection>
        {entries.length === 0 ? (
          <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-2">
            ჯერ არ ფიქსირდება არცერთი action.
            <p className="mt-1 text-text-3 text-xs">
              გაუშვი migration: <code className="font-mono">0017_admin_audit_log.sql</code>, შემდეგ admin action (მაგ. feature toggle) — გამოჩნდება აქ.
            </p>
          </div>
        ) : (
          <AuditTable initial={entries} availableActions={actions} />
        )}
      </AdminSection>
    </>
  );
}
