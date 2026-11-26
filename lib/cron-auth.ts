import 'server-only';
import {timingSafeEqual} from 'node:crypto';

/**
 * Authorises a request to a /api/cron/* route.
 *
 * With CRON_SECRET set, the ONLY accepted proof is `Authorization: Bearer
 * <CRON_SECRET>` (Vercel Cron sends exactly that when the variable exists).
 * The `x-vercel-cron: 1` header is no proof at all: any client can send it.
 *
 * With CRON_SECRET unset (the state production was in when this was written),
 * the old behaviour is kept so the scheduled jobs keep running: the header is
 * accepted, and a warning says the endpoint is open. Setting CRON_SECRET in
 * the Vercel environment is what closes it.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const given = Buffer.from(req.headers.get('authorization') ?? '');
    const wanted = Buffer.from(`Bearer ${secret}`);
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  }
  if (req.headers.get('x-vercel-cron') === '1') {
    console.warn(
      '[cron] CRON_SECRET is not set: the x-vercel-cron header is accepted, and anyone can send it'
    );
    return true;
  }
  return false;
}
