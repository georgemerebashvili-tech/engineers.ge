import {NextResponse, type NextRequest} from 'next/server';
import {createCspViolation, type CspReportPayload} from '@/lib/csp-violations';
import {checkRateLimit} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Browsers send CSP reports via two mechanisms:
 *   1. Legacy `report-uri` → Content-Type: application/csp-report
 *      Body: {"csp-report": { ...payload }}
 *   2. Newer `report-to` (Reporting API) → Content-Type: application/reports+json
 *      Body: [{"type": "csp-violation", "body": { ...payload }}]
 *
 * We accept both formats and normalize into a single CspReportPayload.
 */

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() ?? 'anon';
}

function extractReports(raw: unknown): CspReportPayload[] {
  if (!raw || typeof raw !== 'object') return [];
  // Legacy: {csp-report: {...}}
  if ('csp-report' in raw) {
    return [(raw as {'csp-report': CspReportPayload})['csp-report']];
  }
  // Reporting API: [{type:'csp-violation', body: {...}}]
  if (Array.isArray(raw)) {
    return raw
      .filter(
        (r): r is {type?: string; body: CspReportPayload} =>
          typeof r === 'object' && r !== null && 'body' in r
      )
      .filter((r) => !r.type || r.type === 'csp-violation')
      .map((r) => r.body);
  }
  return [];
}

export async function POST(req: NextRequest) {
  // Per-IP throttle — a CSP-broken page on repeated loads would spam us.
  const ip = getClientIp(req);
  const gate = await checkRateLimit('generic', `csp:${ip}`);
  if (gate.locked) {
    return new NextResponse(null, {status: 204});
  }

  let raw: unknown;
  try {
    const text = await req.text();
    raw = text ? JSON.parse(text) : null;
  } catch {
    return new NextResponse(null, {status: 204});
  }

  const reports = extractReports(raw);
  const context = {
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    visitor_id: req.cookies.get('eng_vid')?.value ?? null
  };
  for (const r of reports) {
    await createCspViolation(r, context);
  }

  // Browsers expect 204; returning JSON is fine but unnecessary.
  return new NextResponse(null, {status: 204});
}
