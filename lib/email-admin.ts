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
