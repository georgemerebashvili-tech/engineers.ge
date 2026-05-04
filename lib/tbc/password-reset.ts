import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {supabaseAdmin} from '@/lib/supabase/admin';

const TOKEN_BYTES = 32;
const EXPIRES_HOURS = 1;

export type TbcResetIssueInput = {
  userId: string;
  email: string;
  ip?: string | null;
  createdBy?: string | null;
};

export async function issueTbcResetToken(opts: TbcResetIssueInput) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const expires_at = new Date(
    Date.now() + EXPIRES_HOURS * 3600_000
  ).toISOString();
  const {error} = await supabaseAdmin().from('tbc_password_reset_tokens').insert({
    token,
    user_id: opts.userId,
    email: opts.email.toLowerCase().trim(),
    expires_at,
    ip: opts.ip ?? null,
    created_by: opts.createdBy ?? null
  });
  if (error) throw error;
  return {token, expires_at};
}

export type TbcResetConsumeResult =
  | {ok: true; userId: string; username: string}
  | {ok: false; reason: 'not_found' | 'already_used' | 'expired' | 'db'};

export async function consumeTbcResetToken(
  token: string,
  newPassword: string
): Promise<TbcResetConsumeResult> {
  const db = supabaseAdmin();
  const {data, error} = await db
    .from('tbc_password_reset_tokens')
    .select('token,user_id,email,expires_at,consumed_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return {ok: false, reason: 'not_found'};
  if (data.consumed_at) return {ok: false, reason: 'already_used'};
  if (new Date(data.expires_at as string).getTime() < Date.now())
    return {ok: false, reason: 'expired'};

  const hash = await bcrypt.hash(newPassword, 10);
  const now = new Date().toISOString();

  // Update password first so a transient failure on the token row doesn't
  // strand the user with a wasted token AND an unchanged password.
  const upd = await db
    .from('tbc_users')
    .update({password_hash: hash})
    .eq('id', data.user_id)
    .select('id, username')
    .single();
  if (upd.error || !upd.data) {
    console.error('[tbc password-reset] user update failed', upd.error);
    return {ok: false, reason: 'db'};
  }

  // Best-effort: mark token consumed. If this fails the password is already
  // updated, so the user is fine; we just leave a reusable token (a cleanup
  // job can sweep it).
  const c = await db
    .from('tbc_password_reset_tokens')
    .update({consumed_at: now})
    .eq('token', token);
  if (c.error) {
    console.error('[tbc password-reset] consume failed (password already changed)', c.error);
  }

  return {
    ok: true,
    userId: upd.data.id as string,
    username: upd.data.username as string
  };
}

export async function sendTbcResetEmail(opts: {
  to: string;
  username: string;
  displayName: string | null;
  resetUrl: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'engineers.ge <no-reply@engineers.ge>';
  const subject = 'TBC ინვენტარიზაცია — პაროლის აღდგენა';
  const who = opts.displayName || opts.username;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;padding:20px;line-height:1.55;color:#0f172a">
      <h2 style="color:#0071CE;margin:0 0 12px">გამარჯობა, ${escapeHtml(who)}</h2>
      <p>მივიღეთ პაროლის აღდგენის მოთხოვნა ანგარიშისთვის <b>${escapeHtml(opts.username)}</b>.</p>
      <p>ახალი პაროლის დასაყენებლად დააჭირე ქვემოთ ღილაკს:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${opts.resetUrl}" style="background:#0071CE;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">პაროლის შეცვლა</a>
      </p>
      <p style="color:#64748b;font-size:12px">ბმული ვადა გადის 1 საათში. თუ შენ არ მოგითხოვია, უგულებელჰყავი ეს წერილი — პაროლი არ შეიცვლება.</p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">— TBC × DMT ინვენტარიზაცია · engineers.ge</p>
    </div>`;

  if (!key) {
    console.log('[tbc password-reset] RESEND_API_KEY missing — would send:', {
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
    console.error('[tbc password-reset] resend failed', res.status, txt);
    return {ok: false, status: res.status};
  }
  return {ok: true, stubbed: false};
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}) as Record<
        string,
        string
      >)[c]!
  );
}
