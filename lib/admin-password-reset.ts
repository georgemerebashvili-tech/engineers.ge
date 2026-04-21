import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {supabaseAdmin} from '@/lib/supabase/admin';

const TOKEN_BYTES = 32;
const EXPIRES_MINUTES = 30;

export async function issueAdminResetToken(email: string, ip?: string | null) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const expires = new Date(Date.now() + EXPIRES_MINUTES * 60_000).toISOString();
  const {error} = await supabaseAdmin().from('admin_password_reset_tokens').insert({
    token,
    email: email.toLowerCase().trim(),
    expires_at: expires,
    ip: ip ?? null
  });
  if (error) throw error;
  return {token, expires_at: expires};
}

export type AdminResetConsumeResult =
  | {ok: true; email: string}
  | {ok: false; reason: 'not_found' | 'already_used' | 'expired' | 'db'};

export async function consumeAdminResetToken(
  token: string
): Promise<AdminResetConsumeResult> {
  const {data, error} = await supabaseAdmin()
    .from('admin_password_reset_tokens')
    .select('token,email,expires_at,consumed_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return {ok: false, reason: 'not_found'};
  if (data.consumed_at) return {ok: false, reason: 'already_used'};
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return {ok: false, reason: 'expired'};
  }

  const {error: consumeErr} = await supabaseAdmin()
    .from('admin_password_reset_tokens')
    .update({consumed_at: new Date().toISOString()})
    .eq('token', token);
  if (consumeErr) return {ok: false, reason: 'db'};

  return {ok: true, email: data.email as string};
}

export async function peekAdminResetToken(
  token: string
): Promise<{ok: true; email: string} | {ok: false; reason: 'not_found' | 'already_used' | 'expired'}> {
  const {data, error} = await supabaseAdmin()
    .from('admin_password_reset_tokens')
    .select('email,expires_at,consumed_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return {ok: false, reason: 'not_found'};
  if (data.consumed_at) return {ok: false, reason: 'already_used'};
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return {ok: false, reason: 'expired'};
  }
  return {ok: true, email: data.email as string};
}

export async function sendAdminResetEmail(opts: {to: string; resetUrl: string}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'engineers.ge <no-reply@engineers.ge>';
  const subject = 'engineers.ge — ადმინის პაროლის აღდგენა';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;padding:20px;line-height:1.5">
      <h2 style="color:#1a3a6b">ადმინის პაროლის აღდგენა</h2>
      <p>engineers.ge-ის ადმინის პაროლის აღდგენის მოთხოვნა მივიღეთ. ახალი პაროლის დასაყენებლად დააჭირე ქვემოთ ღილაკს:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${opts.resetUrl}" style="background:#1f6fd4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">პაროლის შეცვლა</a>
      </p>
      <p style="font-size:12px;color:#7a96b8">ან დააკოპირე ბმული: ${opts.resetUrl}</p>
      <p style="color:#7a96b8;font-size:12px">ბმული ვადა გადის 30 წუთში. თუ შენ არ მოგითხოვია, უგულებელჰყავი ეს წერილი — პაროლი არ შეიცვლება.</p>
    </div>`;

  if (!key) {
    console.log('[admin-password-reset] RESEND_API_KEY missing — would send:', {
      to: opts.to,
      subject,
      resetUrl: opts.resetUrl
    });
    return {ok: true, stubbed: true};
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({from, to: [opts.to], subject, html})
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('[admin-password-reset] resend failed', res.status, txt);
    return {ok: false, stubbed: false, status: res.status};
  }
  return {ok: true, stubbed: false};
}

/**
 * Updates ADMIN_PASS_HASH in Vercel project env (production target) and
 * triggers a redeploy if VERCEL_DEPLOY_HOOK_URL is set. Mirrors the flow in
 * /api/admin/password for authenticated password changes.
 */
export async function updateAdminPassHashOnVercel(
  newPassword: string
): Promise<
  | {ok: true; redeployTriggered: boolean}
  | {ok: false; error: 'vercel_config_missing' | 'vercel_list_failed' | 'vercel_patch_failed' | 'vercel_post_failed'; message?: string}
> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return {
      ok: false,
      error: 'vercel_config_missing',
      message: 'VERCEL_TOKEN და VERCEL_PROJECT_ID არ არის დაყენებული.'
    };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env${teamQuery}`,
    {headers: {Authorization: `Bearer ${token}`}}
  );
  if (!listRes.ok) {
    return {ok: false, error: 'vercel_list_failed', message: await listRes.text()};
  }
  const list = (await listRes.json()) as {
    envs: {id: string; key: string; target: string[]}[];
  };
  const existing = list.envs.find(
    (e) => e.key === 'ADMIN_PASS_HASH' && e.target.includes('production')
  );

  if (existing) {
    const patchRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}${teamQuery}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({value: newHash, target: ['production']})
      }
    );
    if (!patchRes.ok) {
      return {
        ok: false,
        error: 'vercel_patch_failed',
        message: await patchRes.text()
      };
    }
  } else {
    const postRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          key: 'ADMIN_PASS_HASH',
          value: newHash,
          type: 'encrypted',
          target: ['production']
        })
      }
    );
    if (!postRes.ok) {
      return {
        ok: false,
        error: 'vercel_post_failed',
        message: await postRes.text()
      };
    }
  }

  const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
  let redeployTriggered = false;
  if (deployHook) {
    const hookRes = await fetch(deployHook, {method: 'POST'});
    redeployTriggered = hookRes.ok;
  }
  return {ok: true, redeployTriggered};
}

export function isRecoveryEmail(email: string): boolean {
  const configured = process.env.ADMIN_RECOVERY_EMAIL;
  if (!configured) return false;
  return email.toLowerCase().trim() === configured.toLowerCase().trim();
}
