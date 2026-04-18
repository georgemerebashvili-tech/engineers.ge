import {PasswordForm} from './form';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const metadata = {title: 'პაროლის შეცვლა · engineers.ge admin'};

export default function PasswordPage() {
  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'პაროლი'}]}
        title="პაროლის შეცვლა"
        description="ცვლილება ახდენს Vercel production env-ს (ADMIN_PASS_HASH) და იწვევს redeploy-ს. ძალაში შედის ~60 წამში."
      />
      <AdminSection>
        <div className="max-w-md">
          <PasswordForm />
        </div>
      </AdminSection>
    </>
  );
}
