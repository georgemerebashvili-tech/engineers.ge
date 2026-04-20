import 'server-only';
import {cookies} from 'next/headers';

/**
 * Server-side helper to read the visitor's cookie-consent choice.
 * Returns null if they haven't made a choice yet (treat analytics as OFF
 * until explicit opt-in to be GDPR-safe).
 */
export async function readConsentServer(): Promise<{
  analytics: boolean;
  marketing: boolean;
  decided_at: string;
} | null> {
  const store = await cookies();
  const raw = store.get('eng_cookie_consent')?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      decided_at: parsed.decided_at ?? null
    };
  } catch {
    return null;
  }
}

export async function hasAnalyticsConsent(): Promise<boolean> {
  const c = await readConsentServer();
  return c?.analytics === true;
}

export async function hasMarketingConsent(): Promise<boolean> {
  const c = await readConsentServer();
  return c?.marketing === true;
}
