import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {
  getCurrentDmtUser,
  getDmtSession,
  isPrivilegedRole,
  verifyPassword
} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {updateFbWebhookSettings} from '@/lib/dmt/fb-settings';
import {logDmtAudit} from '@/lib/dmt/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin edits FB webhook secrets (verify token / app secret / page access token).
// Requires privileged role + password re-entry. Empty string clears the field.

type Patch = {
  verifyToken?: string | null;
  appSecret?: string | null;
  pageToken?: string | null;
  password?: string;
  generateVerifyToken?: boolean;
};

function generateToken() {
  // 32 bytes base64url ≈ 43 chars, URL-safe, unambiguous.
  return crypto.randomBytes(32).toString('base64url');
}

export async function POST(req: Request) {
  const me = await getCurrentDmtUser();
  const session = await getDmtSession();
  if (!me || !session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  if (!isPrivilegedRole(me.role)) {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }

  let body: Patch;
  try {
    body = (await req.json()) as Patch;
  } catch {
    return NextResponse.json({error: 'bad_json'}, {status: 400});
  }

  if (!body.password) {
    return NextResponse.json({error: 'password_required'}, {status: 400});
  }

  const {data, error} = await supabaseAdmin()
    .from('dmt_users')
    .select('password_hash,status')
    .eq('id', me.id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({error: 'lookup_failed'}, {status: 500});
  }
  if (data.status === 'suspended') {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }
  const ok = await verifyPassword(body.password, data.password_hash);
  if (!ok) {
    void logDmtAudit({
      action: 'fb_webhook.update_failed',
      entity_type: 'secret',
      entity_id: 'fb_webhook_config',
      actor_id: me.id,
      actor_email: me.email,
      actor_role: me.role
    });
    return NextResponse.json({error: 'wrong_password'}, {status: 401});
  }

  const patch: {
    verifyToken?: string | null;
    appSecret?: string | null;
    pageAccessToken?: string | null;
  } = {};

  if (body.generateVerifyToken) {
    patch.verifyToken = generateToken();
  } else if (body.verifyToken !== undefined) {
    patch.verifyToken = body.verifyToken === '' ? null : body.verifyToken;
  }
  if (body.appSecret !== undefined) {
    patch.appSecret = body.appSecret === '' ? null : body.appSecret;
  }
  if (body.pageToken !== undefined) {
    patch.pageAccessToken = body.pageToken === '' ? null : body.pageToken;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({error: 'nothing_to_update'}, {status: 400});
  }

  try {
    await updateFbWebhookSettings(patch, me.id);
  } catch (e) {
    return NextResponse.json(
      {error: 'update_failed', message: e instanceof Error ? e.message : 'unknown'},
      {status: 500}
    );
  }

  void logDmtAudit({
    action: 'fb_webhook.update',
    entity_type: 'secret',
    entity_id: 'fb_webhook_config',
    payload: {
      fields: Object.keys(patch),
      generated: !!body.generateVerifyToken
    },
    actor_id: me.id,
    actor_email: me.email,
    actor_role: me.role
  });

  return NextResponse.json({
    ok: true,
    generatedVerifyToken: body.generateVerifyToken ? patch.verifyToken : undefined
  });
}
