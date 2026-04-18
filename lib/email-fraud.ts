import 'server-only';

// Minimal disposable/throwaway email domains. Extend via admin as needed.
// Source: compressed subset of github.com/disposable/disposable-email-domains
// (most common 2024 offenders). Full list is ~3k domains; this keeps bundle tight.
const DISPOSABLE_DOMAINS = new Set<string>([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'dispostable.com',
  'emlpro.com',
  'fakeinbox.com',
  'getairmail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'mailinator.com',
  'mailinator.net',
  'mintemail.com',
  'mohmal.com',
  'sharklasers.com',
  'spam4.me',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'temp-mail.org',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'yopmail.net',
  'yopmail.fr',
  'burnermail.io',
  'maildrop.cc',
  'mytemp.email',
  'temp-mail.io',
  'tempmail.plus',
  'moakt.com',
  'mailnesia.com',
  'inboxbear.com',
  'getnada.com',
  'inboxalias.com',
  'spamgourmet.com',
  'harakirimail.com'
]);

const ROLE_LOCAL_PARTS = new Set<string>([
  'admin',
  'administrator',
  'info',
  'support',
  'sales',
  'noreply',
  'no-reply',
  'postmaster',
  'webmaster',
  'abuse',
  'contact'
]);

export type EmailFraudCheck = {
  disposable: boolean;
  role_based: boolean;
  score: number;
  reasons: string[];
};

export function checkEmail(email: string): EmailFraudCheck {
  const reasons: string[] = [];
  const e = email.trim().toLowerCase();
  const [local = '', domain = ''] = e.split('@');

  let disposable = false;
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    disposable = true;
    reasons.push('disposable_domain');
  }

  // Subdomain of a disposable? (e.g. anything.yopmail.com)
  if (!disposable && domain) {
    const parts = domain.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join('.');
      if (DISPOSABLE_DOMAINS.has(candidate)) {
        disposable = true;
        reasons.push('disposable_subdomain');
        break;
      }
    }
  }

  const role_based = ROLE_LOCAL_PARTS.has(local);
  if (role_based) reasons.push('role_local_part');

  // Heuristic: too many digits in local part suggests throwaway
  const digitCount = (local.match(/\d/g) ?? []).length;
  if (digitCount >= 6) reasons.push('many_digits_in_local');

  // Heuristic: consonant-blob pattern (e.g. "xkvnbqw@gmail.com")
  if (/^[a-z]{7,}$/.test(local) && !/[aeiouy]/.test(local)) {
    reasons.push('consonant_blob');
  }

  let score = 0;
  if (disposable) score += 80;
  if (role_based) score += 30;
  if (reasons.includes('many_digits_in_local')) score += 10;
  if (reasons.includes('consonant_blob')) score += 20;

  return {disposable, role_based, score, reasons};
}
