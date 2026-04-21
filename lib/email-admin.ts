import 'server-only';
import {getFeatureFlags} from '@/lib/feature-flags';
import {bugReportEmail, welcomeEmail} from '@/lib/email-templates';

/**
 * Transactional + admin emails via Resend.
 *
 * All senders are fire-and-forget from the caller's perspective — they never
 * throw, and they silently skip when:
 *   - RESEND_API_KEY is not set (MVP stub — logs instead)
 *   - recipient address is not set (ADMIN_EMAIL for admin, user.email for user)
 *   - the corresponding notify.* feature flag is 'hidden' (admin flows only)
 *
 * Add new notifications as new exported functions; admin-targeted ones should
 * call shouldSendNotification(flagKey) first.
 */

async function shouldSendNotification(flagKey: string): Promise<boolean> {
  try {
    const flags = await getFeatureFlags();
    return flags[flagKey] !== 'hidden';
  } catch {
    // If flags are unreachable, fail-open (send).
    return true;
  }
}

export async function sendEmail(opts: {
  to: string | undefined;
  subject: string;
  html: string;
  context: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'engineers.ge <no-reply@engineers.ge>';

  if (!opts.to) {
    console.log(`[${opts.context}] recipient missing — skipped:`, opts.subject);
    return;
  }

  if (!key) {
    console.log(`[${opts.context}] RESEND_API_KEY not set — would send:`, {
      to: opts.to,
      subject: opts.subject
    });
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {authorization: `Bearer ${key}`, 'content-type': 'application/json'},
      body: JSON.stringify({from, to: [opts.to], subject: opts.subject, html: opts.html})
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[${opts.context}] resend failed`, res.status, txt);
    }
  } catch (e) {
    console.error(`[${opts.context}] send error`, e);
  }
}

/** Welcome email sent to a newly-registered user. Stub-safe. */
export async function sendWelcomeEmail(user: {
  email: string;
  name: string;
  language?: string | null;
}): Promise<void> {
  if (!(await shouldSendNotification('notify.welcome-email'))) return;
  const {subject, html} = welcomeEmail(user);
  await sendEmail({to: user.email, subject, html, context: 'email-welcome'});
}

export async function sendBugReportNotification(report: {
  id: string;
  pathname: string;
  feature_key: string | null;
  message: string;
  email: string | null;
  viewport: string | null;
  user_agent: string | null;
}): Promise<void> {
  if (!(await shouldSendNotification('notify.bug-reports'))) return;
  const {subject, html} = bugReportEmail(report);
  await sendEmail({to: process.env.ADMIN_EMAIL, subject, html, context: 'email-bug'});
}

export async function sendRegulationChangeNotification(result: {
  checked: number;
  changed: number;
  failed: number;
  unchanged: number;
  changedSources: Array<{
    key: string;
    title: string;
    url: string;
    source_group: string;
    excerpt: string;
  }>;
}): Promise<void> {
  if (!result.changedSources.length) return;
  if (!(await shouldSendNotification('notify.regulations'))) return;

  const subject = `[engineers.ge] regulation changes detected: ${result.changedSources.length}`;
  const rows = result.changedSources
    .slice(0, 10)
    .map(
      (source) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0f172a;">${escapeHtml(source.title)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#475569;">${escapeHtml(source.source_group)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;"><a href="${source.url}" target="_blank" rel="noreferrer">open</a></td>
        </tr>
      `
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
      <h1 style="margin:0 0 12px;font-size:20px;">Regulation source change detected</h1>
      <p style="margin:0 0 16px;color:#475569;">
        შემოწმდა ${result.checked} წყარო · ცვლილება ${result.changed} · შეცდომა ${result.failed}.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#eff6ff;color:#1d4ed8;text-align:left;">
            <th style="padding:10px;">წყარო</th>
            <th style="padding:10px;">ჯგუფი</th>
            <th style="padding:10px;">URL</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:16px 0 0;color:#475569;font-size:13px;">
        Admin review: <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://engineers.ge'}/admin/regulations">/admin/regulations</a>
      </p>
    </div>
  `;

  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject,
    html,
    context: 'email-regulations'
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
