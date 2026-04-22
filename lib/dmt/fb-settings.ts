import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type FbWebhookSettings = {
  verifyToken: string | null;
  appSecret: string | null;
  pageAccessToken: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

// DB is the source of truth; env vars are legacy fallback so existing
// deployments keep working until values are copied into the table.
export async function getFbWebhookSettings(): Promise<FbWebhookSettings> {
  let row: {
    verify_token?: string | null;
    app_secret?: string | null;
    page_access_token?: string | null;
    updated_at?: string | null;
    updated_by?: string | null;
  } | null = null;

  try {
    const {data} = await supabaseAdmin()
      .from('dmt_fb_webhook_settings')
      .select('verify_token,app_secret,page_access_token,updated_at,updated_by')
      .eq('id', 1)
      .maybeSingle();
    row = data ?? null;
  } catch {
    row = null;
  }

  return {
    verifyToken: row?.verify_token ?? process.env.FB_VERIFY_TOKEN ?? null,
    appSecret: row?.app_secret ?? process.env.FB_APP_SECRET ?? null,
    pageAccessToken:
      row?.page_access_token ?? process.env.FB_PAGE_ACCESS_TOKEN ?? null,
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null
  };
}

export async function updateFbWebhookSettings(
  patch: {
    verifyToken?: string | null;
    appSecret?: string | null;
    pageAccessToken?: string | null;
  },
  updatedBy: string
): Promise<void> {
  const row: Record<string, unknown> = {
    id: 1,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy
  };
  if (patch.verifyToken !== undefined) row.verify_token = patch.verifyToken;
  if (patch.appSecret !== undefined) row.app_secret = patch.appSecret;
  if (patch.pageAccessToken !== undefined)
    row.page_access_token = patch.pageAccessToken;

  const {error} = await supabaseAdmin()
    .from('dmt_fb_webhook_settings')
    .upsert(row, {onConflict: 'id'});
  if (error) throw new Error(error.message);
}
