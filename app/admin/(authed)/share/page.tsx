import {supabaseAdmin} from '@/lib/supabase/admin';
import {ShareSettingsForm} from './form';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  facebook: true,
  x: true,
  linkedin: true,
  telegram: true,
  whatsapp: true,
  copy_link: true
};

export default async function AdminSharePage() {
  let initial = DEFAULTS;
  try {
    const {data} = await supabaseAdmin()
      .from('share_settings')
      .select('facebook,x,linkedin,telegram,whatsapp,copy_link')
      .eq('id', 1)
      .maybeSingle();
    if (data) {
      initial = {
        facebook: data.facebook ?? true,
        x: data.x ?? true,
        linkedin: data.linkedin ?? true,
        telegram: data.telegram ?? true,
        whatsapp: data.whatsapp ?? true,
        copy_link: data.copy_link ?? true
      };
    }
  } catch {
    // Supabase not configured — form starts with all-on defaults.
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Share buttons</h1>
        <p className="text-sm text-fg-muted">
          ჩართე/გათიშე სოც. ქსელების ღილაკები footer-ში და კალკულატორის გვერდებზე.
        </p>
      </div>
      <ShareSettingsForm initial={initial} />
    </div>
  );
}
