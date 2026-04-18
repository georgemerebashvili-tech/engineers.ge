import 'server-only';
import crypto from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

const TOKEN_BYTES = 32;
const EXPIRES_HOURS = 24;

export async function issueVerifyToken(userId: string, email: string) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const expires = new Date(Date.now() + EXPIRES_HOURS * 3600_000).toISOString();
  const {error} = await supabaseAdmin().from('email_verify_tokens').insert({
    token,
    user_id: userId,
    email: email.toLowerCase().trim(),
    expires_at: expires
  });
  if (error) throw error;
  return {token, expires_at: expires};
}

export async function consumeVerifyToken(token: string) {
  const now = new Date().toISOString();
  const {data, error} = await supabaseAdmin()
    .from('email_verify_tokens')
    .select('token,user_id,email,expires_at,consumed_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return {ok: false as const, reason: 'not_found' as const};
  if (data.consumed_at) return {ok: false as const, reason: 'already_used' as const};
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return {ok: false as const, reason: 'expired' as const};
  }

  const {error: upErr} = await supabaseAdmin()
    .from('email_verify_tokens')
    .update({consumed_at: now})
    .eq('token', token);
  if (upErr) return {ok: false as const, reason: 'db' as const};

  const {error: userErr} = await supabaseAdmin()
    .from('users')
    .update({email_verified: true, email_verified_at: now})
    .eq('id', data.user_id)
    .eq('email', data.email);
  if (userErr) return {ok: false as const, reason: 'db' as const};

  return {ok: true as const, user_id: data.user_id as string};
}

// Thin sender: if RESEND_API_KEY env is set, send via Resend; otherwise log.
// Keeps infra-optional for MVP.
export async function sendVerifyEmail(opts: {
  to: string;
  name: string;
  verifyUrl: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'engineers.ge <no-reply@engineers.ge>';
  const subject = 'engineers.ge — დაადასტურე email';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;padding:20px;line-height:1.5">
      <h2 style="color:#1a3a6b">გამარჯობა, ${escapeHtml(opts.name)}</h2>
      <p>გთხოვთ დაადასტუროთ email მისამართი — დააჭირეთ ქვემოთ ღილაკს:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${opts.verifyUrl}" style="background:#1f6fd4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Email-ის დადასტურება</a>
      </p>
      <p style="color:#7a96b8;font-size:12px">ბმული ვადა გადის 24 საათში. თუ რეგისტრაცია არ გაგივლიათ, უგულებელჰყავით ეს წერილი.</p>
    </div>`;

  if (!key) {
    console.log('[email-verify] RESEND_API_KEY missing — would send:', {
      to: opts.to,
      subject,
      verifyUrl: opts.verifyUrl
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
    console.error('[email-verify] resend failed', res.status, txt);
    return {ok: false, status: res.status};
  }
  return {ok: true, stubbed: false};
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!
  );
}
