import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {BACKUPABLE_TABLES, getTableCounts} from '@/lib/db-backup';
import {BackupWorkspace} from './workspace';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Backup · Admin · engineers.ge'};

export default async function AdminBackupPage() {
  const counts = await getTableCounts();

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'Backup'}]}
        title="Database backup / export"
        description='მონიშნე ცხრილები → download. გამოიყენე migration-ამდე (safety net), GDPR data-export request-ებზე, ან data retention policy-ისთვის. ყოველი export დაფიქსირდება audit log-ში.'
      />
      <AdminSection>
        <BackupWorkspace tables={BACKUPABLE_TABLES} counts={counts} />
      </AdminSection>
    </>
  );
}
