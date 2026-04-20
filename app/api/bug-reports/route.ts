import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {createBugReport} from '@/lib/bug-reports';
import {checkRateLimit, recordFailure} from '@/lib/rate-limit';
import {sendBugReportNotification} from '@/lib/email-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  feature_key: z.string().max(120).optional().nullable(),
  pathname: z.string().min(1).max(500),
  message: z.string().min(10).max(4000),
  email: z
    .string()
    .email()
    .max(200)
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  viewport: z.string().max(30).optional().nullable()
});

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() ?? 'anon';
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', issues: parsed.error.flatten()},
      {status: 400}
    );
  }

  const ip = getClientIp(req);
  const gate = await checkRateLimit('generic', `bug:${ip}`);
  if (gate.locked) {
    return NextResponse.json(
      {error: 'rate_limited', retry_after_seconds: gate.retry_after_seconds},
      {status: 429}
    );
  }

  try {
    const report = await createBugReport({
      ...parsed.data,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null
    });
    // Fire-and-forget: email latency must not block the user-facing 200.
    void sendBugReportNotification({
      id: report.id,
      pathname: report.pathname,
      feature_key: report.feature_key,
      message: report.message,
      email: report.email,
      viewport: report.viewport,
      user_agent: report.user_agent
    });
    return NextResponse.json({ok: true, id: report.id});
  } catch (e) {
    await recordFailure('generic', `bug:${ip}`);
    const msg = e instanceof Error ? e.message : 'error';
    const missing = /relation .* does not exist|bug_reports/i.test(msg);
    return NextResponse.json(
      {
        error: 'failed',
        message: msg,
        hint: missing
          ? 'gaushvi migration 0016_bug_reports.sql Supabase-ze.'
          : undefined
      },
      {status: 500}
    );
  }
}
