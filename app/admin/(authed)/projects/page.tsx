import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {ProjectsGrid} from './grid';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'პროექტები · Admin · engineers.ge'};

export default function AdminProjectsPage() {
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'Admin'}, {label: 'პროექტები'}]}
        title="პროექტები"
        description="ქვე-პროექტები და გარე გარემოები. engineers.ge ქოლგის ქვეშ რამდენიმე დამოუკიდებელი აპი და ტესტ-გარემო ცხოვრობს — აქედან მიდიხარ."
      />
      <AdminSection>
        <ProjectsGrid />
      </AdminSection>
    </>
  );
}
