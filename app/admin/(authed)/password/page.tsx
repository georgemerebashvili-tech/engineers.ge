import {PasswordForm} from './form';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'პაროლის შეცვლა · engineers.ge admin'};

export default function PasswordPage() {
  // The change works by rewriting ADMIN_PASS_HASH through the Vercel API, so it
  // needs both values. Production does not have them today: say so up front
  // instead of letting the person type three fields and fail on submit.
  const vercelConfigured = Boolean(
    process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim()
  );

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'პაროლი'}]}
        title="პაროლის შეცვლა"
        description={
          vercelConfigured
            ? 'ცვლილება ახდენს Vercel production env-ს (ADMIN_PASS_HASH) და იწვევს redeploy-ს. ძალაში შედის ~60 წამში.'
            : undefined
        }
      />
      <AdminSection>
        <div className="max-w-md">
          {vercelConfigured ? (
            <PasswordForm />
          ) : (
            <div
              role="status"
              className="space-y-2 rounded-lg border border-bdr bg-sur p-4 text-sm"
            >
              <p className="font-medium text-navy">
                პაროლის შეცვლა აქედან ამჟამად ვერ მუშაობს.
              </p>
              <p className="text-text-2">
                სერვერზე არ არის დაყენებული VERCEL_TOKEN და VERCEL_PROJECT_ID, ამიტომ პაროლს
                ეს გვერდი ვერ შეცვლის.
              </p>
              <p className="text-text-2">
                თუ პაროლი დაგავიწყდა, შესვლის გვერდზე დააჭირე „დაგავიწყდა პაროლი? შედი
                მეილით“ — მეილზე მოვა ერთჯერადი ბმული.
              </p>
            </div>
          )}
        </div>
      </AdminSection>
    </>
  );
}
