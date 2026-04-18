import 'server-only';
import crypto from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {hashPassword} from '@/lib/users';

const TOKEN_BYTES = 32;
const EXPIRES_HOURS = 1;

export async function issueResetToken(
  userId: string,
  email: string,
  ip?: string | null
) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const expires = new Date(Date.now() + EXPIRES_HOURS * 3600_000).toISOString();
  const {error} = await supabaseAdmin().from('password_reset_tokens').insert({
    token,
    user_id: userId,
    email: email.toLowerCase().trim(),
    expires_at: expires,
    ip: ip ?? null
  });
  if (error) throw error;
  return {token, expires_at: expires};
}

export type ResetConsumeResult =
  | {ok: true; user_id: string; email: string}
  | {ok: false; reason: 'not_found' | 'already_used' | 'expired' | 'db'};

export async function consumeResetToken(
  token: string,
  newPassword: string
): Promise<ResetConsumeResult> {
  const now = new Date().toISOString();
  const {data, error} = await supabaseAdmin()
    .from('password_reset_tokens')
    .select('token,user_id,email,expires_at,consumed_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return {ok: false, reason: 'not_found'};
  if (data.consumed_at) return {ok: false, reason: 'already_used'};
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return {ok: false, reason: 'expired'};
  }

  const {hash, salt} = hashPassword(newPassword);

  // Mark consumed + rotate password in a write-through sequence.
  const {error: consumeErr} = await supabaseAdmin()
    .from('password_reset_tokens')
    .update({consumed_at: now})
    .eq('token', token);
  if (consumeErr) return {ok: false, reason: 'db'};

  const {error: userErr} = await supabaseAdmin()
    .from('users')
    .update({password_hash: hash, password_salt: salt})
    .eq('id', data.user_id);
  if (userErr) return {ok: false, reason: 'db'};

  return {ok: true, user_id: data.user_id as string, email: data.email as string};
}

export async function sendResetEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'engineers.ge <no-reply@engineers.ge>';
  const subject = 'engineers.ge — პაროლის აღდგენა';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;padding:20px;line-height:1.5">
      <h2 style="color:#1a3a6b">გამარჯობა, ${escapeHtml(opts.name)}</h2>
      <p>პაროლის აღდგენის მოთხოვნა მივიღეთ. ახალი პაროლის დასაყენებლად დააჭირე ქვემოთ ღილაკს:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${opts.resetUrl}" style="background:#1f6fd4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">პაროლის შეცვლა</a>
      </p>
      <p style="color:#7a96b8;font-size:12px">ბმული ვადა გადის 1 საათში. თუ შენ არ მოგითხოვია, უგულებელჰყავი ეს წერილი — პაროლი არ შეიცვლება.</p>
    </div>`;

  if (!key) {
    console.log('[password-reset] RESEND_API_KEY missing — would send:', {
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
    console.error('[password-reset] resend failed', res.status, txt);
    return {ok: false, status: res.status};
  }
  return {ok: true, stubbed: false};
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!
  );
}
