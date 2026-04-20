import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {FEATURE_REGISTRY, getFeatureFlagsDetailed} from '@/lib/feature-flags';
import {FeaturesForm} from './form';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ფიჩერ-მართვა · Admin · engineers.ge'};

export default async function AdminFeaturesPage() {
  const flags = await getFeatureFlagsDetailed();
  const dbOffline = flags.every((f) => f.updated_at === null);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'ფიჩერ-მართვა'}]}
        title="ფიჩერ-მართვა · Feature Flags"
        description="ყოველი მენიუ / ტაბი / გვერდი შეიძლება იყოს 🟢 აქტიური · 🟡 სატესტო (ბანერი გვერდზე) · 🔴 დამალული (ვიზიტორი ვერ ხედავს). ცვლილებას ითხოვს დადასტურებას."
      />
      <AdminSection>
        {dbOffline && (
          <div className="mb-4 rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Supabase DB offline ან migration არ გაშვებულა.</p>
            <p className="mt-1 font-mono text-xs">
              ცვლილებები ვერ შეინახება სანამ არ გაუშვებ: <code>supabase/migrations/0015_feature_flags.sql</code>
            </p>
            <p className="mt-1 text-xs">
              ფიჩერები ამ ეტაპზე ყველა აქტიურია (fail-open). UI მუშაობს preview-ად, მაგრამ ცვლილება არ დაფიქსირდება.
            </p>
          </div>
        )}
        <FeaturesForm registry={FEATURE_REGISTRY} initial={flags} />
      </AdminSection>
    </>
  );
}
