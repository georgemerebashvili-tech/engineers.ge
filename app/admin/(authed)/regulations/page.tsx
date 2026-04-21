import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {getRegulationDashboardData} from '@/lib/regulation-sources';
import {RegulationsWorkspace} from './workspace';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'სტანდარტები & წყაროები · Admin · engineers.ge'};

export default async function AdminRegulationsPage() {
  const data = await getRegulationDashboardData();

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'კონტენტი'}, {label: 'სტანდარტები & წყაროები'}]}
        title="სტანდარტები & წყაროები"
        description="სამართლებრივი და სტანდარტული წყაროების მონიტორი. აკონტროლებს ცვლილებებს, ინახავს snapshot-ებს და აჩვენებს ბოლო diff-ს."
      />
      <AdminSection>
        <RegulationsWorkspace data={data} />
      </AdminSection>
    </>
  );
}
