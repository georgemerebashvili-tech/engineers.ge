import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {getAiSettings} from '@/lib/ai-settings';
import {AiForm} from './form';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'AI (Claude) · Admin · engineers.ge'};

export default async function AdminAiPage() {
  const settings = await getAiSettings();

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'AI'}]}
        title="AI · Claude API"
        description="Anthropic API key + model preferences. გამოიყენება თარგმნისთვის და სხვა AI ფიჩერებისთვის (engineers.ge-ს ნებისმიერი სერვისი, რომელიც Claude-ს მოითხოვს)."
      />
      <AdminSection>
        {!settings ? (
          <div className="rounded-card border border-red-bd bg-red-lt p-6 text-sm text-red">
            <p className="font-semibold">ai_settings table არ მოიძებნა.</p>
            <p className="mt-1 font-mono text-xs">
              გაუშვი migration:{' '}
              <code>supabase/migrations/0008_ai_settings.sql</code>
            </p>
          </div>
        ) : (
          <AiForm
            initial={{
              has_key: !!settings.anthropic_api_key,
              masked_key: settings.anthropic_api_key
                ? `${settings.anthropic_api_key.slice(0, 7)}••••••••${settings.anthropic_api_key.slice(-4)}`
                : null,
              default_model: settings.default_model,
              enabled: settings.enabled,
              updated_at: settings.updated_at
            }}
          />
        )}
      </AdminSection>
    </>
  );
}
