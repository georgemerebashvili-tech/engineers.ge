import 'server-only';
import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateConstructionPassword(): string {
  const bytes = crypto.randomBytes(4);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export async function sendConstructionOnboardingEmail(opts: {
  to: string;
  username: string;
  displayName: string | null;
  tempPassword: string;
  loginUrl: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'engineers.ge <no-reply@engineers.ge>';
  const subject = 'KAYA Construction — თქვენი წვდომა';
  const who = opts.displayName || opts.username;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;padding:20px;line-height:1.55;color:#0f172a">
      <h2 style="color:#1565C0;margin:0 0 12px">გამარჯობა, ${escapeHtml(who)}</h2>
      <p>KAYA Construction-ის ინვენტარიზაციის სისტემაში შენთვის ანგარიში შექმნილია.</p>

      <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#E3F2FD;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 14px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Username</td>
            <td style="padding:10px 14px;font-family:ui-monospace,monospace;font-weight:700;font-size:16px;">${escapeHtml(opts.username)}</td></tr>
        <tr><td style="padding:10px 14px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">დროებითი პაროლი</td>
            <td style="padding:10px 14px;font-family:ui-monospace,monospace;font-weight:700;font-size:22px;color:#1565C0;letter-spacing:0.15em;">${escapeHtml(opts.tempPassword)}</td></tr>
      </table>

      <p style="text-align:center;margin:24px 0">
        <a href="${opts.loginUrl}" style="background:#1565C0;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">შესვლა</a>
      </p>

      <div style="background:#FEF3C7;padding:12px;border-radius:8px;font-size:12px;color:#92400E;margin:14px 0">
        <b>🔒 უსაფრთხოების ინფო:</b><br>
        • პაროლი ბაზაში დაშიფრულია bcrypt-ით (cost 10). ადმინსაც არ უჩანს ფიზიკური სახით.<br>
        • თუ პაროლს დაივიწყებ, აღდგენა არ ხდება — ადმინი ახალ ერთჯერად პაროლს გამოგიგზავნის.<br>
        • ამ მეილს მესამე პირებს <u>არ</u> გადაუცემ.
      </div>

      <p style="color:#94a3b8;font-size:11px;margin-top:14px">— KAYA Construction · engineers.ge</p>
    </div>`;

  if (!key) {
    console.log('[construction onboarding] RESEND_API_KEY missing — would send:', {
      to: opts.to,
      username: opts.username,
      tempPassword: opts.tempPassword
    });
    return {ok: true as const, stubbed: true};
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
    console.error('[construction onboarding] resend failed', res.status, txt);
    return {ok: false as const, status: res.status};
  }
  return {ok: true as const, stubbed: false};
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
