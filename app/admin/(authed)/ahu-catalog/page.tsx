import { AdminPageHeader, AdminSection } from '@/components/admin-page-header';
import { AhuCatalogOverview } from '@/components/admin/ahu-catalog/overview';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AHU კატალოგი · Admin' };

export default function AhuCatalogPage() {
  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: 'კონტენტი' }, { label: 'AHU კატალოგი' }]}
        title="AHU კატალოგი"
        description="რეალური AHU მოდელები, სექციები, ფილტრები, ხვიები, ვენტილატორები — wizard თვითონ ამოარჩევს ხარჯისა და სქემის მიხედვით."
      />
      <AdminSection>
        <AhuCatalogOverview />
      </AdminSection>
    </>
  );
}
