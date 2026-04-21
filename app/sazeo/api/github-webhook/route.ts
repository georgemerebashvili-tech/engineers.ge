import {NextResponse, type NextRequest} from 'next/server';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MATCH_WINDOW_MIN = 30;

type GithubCommit = {
  id: string;
  timestamp: string;
  message?: string;
  author?: {name?: string; email?: string; username?: string};
  committer?: {name?: string; email?: string; username?: string};
};

type PushPayload = {
  ref?: string;
  repository?: {full_name?: string};
  commits?: GithubCommit[];
  head_commit?: GithubCommit;
  sender?: {login?: string};
};

function verifySignature(body: string, sig: string | null, secret: string): boolean {
  if (!sig || !sig.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SAZEO_GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({error: 'webhook secret not configured'}, {status: 503});
  }

  const rawBody = await req.text();
  const sig = req.headers.get('x-hub-signature-256');
  if (!verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({error: 'bad signature'}, {status: 401});
  }

  const event = req.headers.get('x-github-event') || '';
  if (event === 'ping') {
    return NextResponse.json({ok: true, pong: true});
  }
  if (event !== 'push') {
    return NextResponse.json({ok: true, ignored: event});
  }

  let payload: PushPayload;
  try {
    payload = JSON.parse(rawBody) as PushPayload;
  } catch {
    return NextResponse.json({error: 'invalid json'}, {status: 400});
  }

  const repoFull = payload.repository?.full_name || 'unknown';
  const branch = payload.ref?.replace(/^refs\/heads\//, '') ?? null;
  const commits = Array.isArray(payload.commits) ? payload.commits : [];

  if (commits.length === 0) {
    return NextResponse.json({ok: true, commits: 0});
  }

  const db = supabaseAdmin();

  const {data: devs, error: devsErr} = await db
    .from('sazeo_developers')
    .select('id, email, name');
  if (devsErr) {
    return NextResponse.json({error: 'dev lookup failed'}, {status: 500});
  }

  const devByEmail = new Map<string, {id: string; name: string}>();
  for (const d of devs ?? []) {
    if (d.email) devByEmail.set(d.email.toLowerCase(), {id: d.id, name: d.name});
  }

  const audits: Array<Record<string, unknown>> = [];

  for (const c of commits) {
    const authorEmail = (c.author?.email || c.committer?.email || '').toLowerCase() || null;
    const authorName = c.author?.name || c.committer?.name || null;
    const authorLogin = c.author?.username || c.committer?.username || payload.sender?.login || null;
    const committedAt = c.timestamp;

    const dev = authorEmail ? devByEmail.get(authorEmail) : undefined;

    let matched = false;
    let matchedSessionId: string | null = null;
    let matchedEventId: number | null = null;
    let alert: string | null = null;

    if (!dev) {
      alert = `unmapped author ${authorEmail ?? authorName ?? 'unknown'} — no sazeo developer with this email`;
    } else if (!committedAt) {
      alert = 'commit timestamp missing';
    } else {
      const t = new Date(committedAt).getTime();
      const lower = new Date(t - MATCH_WINDOW_MIN * 60000).toISOString();
      const upper = new Date(t + MATCH_WINDOW_MIN * 60000).toISOString();

      const {data: evts, error: evtErr} = await db
        .from('sazeo_events')
        .select('id, session_id, ts_server')
        .eq('developer_id', dev.id)
        .gte('ts_server', lower)
        .lte('ts_server', upper)
        .order('ts_server', {ascending: true})
        .limit(1);

      if (evtErr) {
        alert = `lookup error: ${evtErr.message}`;
      } else if (!evts || evts.length === 0) {
        alert = `no claude session within ±${MATCH_WINDOW_MIN}min of commit`;
      } else {
        matched = true;
        matchedSessionId = evts[0].session_id as string | null;
        matchedEventId = evts[0].id as number;
      }
    }

    audits.push({
      commit_sha: c.id,
      repo_full: repoFull,
      branch,
      author_email: authorEmail,
      author_name: authorName,
      author_login: authorLogin,
      committed_at: committedAt,
      developer_id: dev?.id ?? null,
      session_matched: matched,
      matched_session_id: matchedSessionId,
      matched_event_id: matchedEventId,
      match_window_min: MATCH_WINDOW_MIN,
      alert,
      raw: {
        message: c.message ?? null,
        sender: payload.sender?.login ?? null
      }
    });
  }

  if (audits.length === 0) {
    return NextResponse.json({ok: true, commits: 0});
  }

  const {error: insErr} = await db
    .from('sazeo_commit_audits')
    .upsert(audits, {onConflict: 'repo_full,commit_sha', ignoreDuplicates: true});

  if (insErr) {
    return NextResponse.json({error: insErr.message}, {status: 500});
  }

  const unmatched = audits.filter((a) => !a.session_matched).length;
  return NextResponse.json({
    ok: true,
    repo: repoFull,
    commits: audits.length,
    unmatched
  });
}
