import {NextResponse, type NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BATCH = 200;
const MAX_EVENT_BYTES = 64 * 1024;

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function canonicalJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = sort((v as Record<string, unknown>)[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

type IncomingEvent = {
  event_type?: unknown;
  session_id?: unknown;
  ts_client?: unknown;
  data?: unknown;
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({error: 'missing bearer token'}, {status: 401});
  }

  const tokenHash = sha256Hex(token);
  const db = supabaseAdmin();

  const {data: dev, error: devErr} = await db
    .from('sazeo_developers')
    .select('id, name, disabled_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (devErr) {
    return NextResponse.json({error: 'lookup failed'}, {status: 500});
  }
  if (!dev) {
    return NextResponse.json({error: 'invalid developer token'}, {status: 401});
  }
  if (dev.disabled_at) {
    return NextResponse.json({error: 'developer disabled'}, {status: 403});
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'invalid json'}, {status: 400});
  }

  const events: IncomingEvent[] = Array.isArray((body as {events?: unknown})?.events)
    ? ((body as {events: IncomingEvent[]}).events)
    : [];
  if (events.length === 0) {
    return NextResponse.json({accepted: 0});
  }
  if (events.length > MAX_BATCH) {
    return NextResponse.json({error: `max ${MAX_BATCH} events per batch`}, {status: 413});
  }

  const {data: lastRow, error: lastErr} = await db
    .from('sazeo_events')
    .select('hash')
    .eq('developer_id', dev.id)
    .order('id', {ascending: false})
    .limit(1)
    .maybeSingle();

  if (lastErr) {
    return NextResponse.json({error: 'chain read failed'}, {status: 500});
  }

  let prevHash: string | null = lastRow?.hash ?? null;
  const rows: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (const e of events) {
    const eventType = String(e?.event_type || '').trim().slice(0, 100);
    if (!eventType) {
      skipped++;
      continue;
    }
    const sessionId =
      typeof e?.session_id === 'string' && e.session_id
        ? e.session_id.slice(0, 200)
        : null;
    const tsClient = typeof e?.ts_client === 'string' ? e.ts_client : null;

    const rawData = (e?.data && typeof e.data === 'object' ? e.data : {}) as Record<
      string,
      unknown
    >;
    let payload: Record<string, unknown> = rawData;
    let payloadStr = canonicalJson(payload);
    if (payloadStr.length > MAX_EVENT_BYTES) {
      payload = {_truncated: true, _size: payloadStr.length};
      payloadStr = canonicalJson(payload);
    }

    const repo = (payload.repo as Record<string, unknown> | undefined) || {};
    const sys = (payload.system as Record<string, unknown> | undefined) || {};

    const canonical = canonicalJson({
      developer_id: dev.id,
      session_id: sessionId,
      event_type: eventType,
      ts_client: tsClient,
      data: payload
    });
    const hash = sha256Hex(`${prevHash ?? ''}|${canonical}`);

    rows.push({
      developer_id: dev.id,
      session_id: sessionId,
      event_type: eventType,
      ts_client: tsClient,
      repo_id: typeof repo.id === 'string' ? repo.id : null,
      repo_root: typeof repo.root === 'string' ? repo.root : null,
      cwd: typeof sys.cwd === 'string' ? (sys.cwd as string).slice(0, 500) : null,
      host: typeof sys.host === 'string' ? (sys.host as string).slice(0, 200) : null,
      os: typeof sys.os === 'string' ? (sys.os as string).slice(0, 200) : null,
      username:
        typeof sys.user === 'string' ? (sys.user as string).slice(0, 200) : null,
      claude_version:
        typeof sys.claude_version === 'string'
          ? (sys.claude_version as string).slice(0, 100)
          : null,
      data: payload,
      prev_hash: prevHash,
      hash
    });

    prevHash = hash;
  }

  if (rows.length === 0) {
    return NextResponse.json({accepted: 0, skipped});
  }

  const {error: insErr} = await db.from('sazeo_events').insert(rows);
  if (insErr) {
    return NextResponse.json(
      {error: 'insert failed', detail: insErr.message},
      {status: 500}
    );
  }

  return NextResponse.json({accepted: rows.length, skipped, developer: dev.name});
}
