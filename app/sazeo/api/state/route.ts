import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECENT_EVENT_LIMIT = 120;
const SESSION_LIMIT = 60;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  const db = supabaseAdmin();

  const [devsRes, recentRes, totalsRes, integrityRes, commitsRes, unmatchedRes] =
    await Promise.all([
      db
        .from('sazeo_developers')
        .select('id, name, email, disabled_at, created_at')
        .order('created_at', {ascending: true}),
      db
        .from('sazeo_events')
        .select(
          'id, developer_id, session_id, event_type, ts_server, ts_client, repo_id, data, host, os, claude_version'
        )
        .order('id', {ascending: false})
        .limit(RECENT_EVENT_LIMIT),
      db.from('sazeo_events').select('id', {count: 'exact', head: true}),
      db
        .from('sazeo_events_integrity')
        .select('id', {count: 'exact', head: true})
        .eq('ok', false),
      db
        .from('sazeo_commit_audits')
        .select(
          'id, commit_sha, repo_full, branch, author_email, author_name, committed_at, developer_id, session_matched, matched_session_id, alert, pushed_at'
        )
        .order('pushed_at', {ascending: false})
        .limit(40),
      db
        .from('sazeo_commit_audits')
        .select('id', {count: 'exact', head: true})
        .eq('session_matched', false)
    ]);

  if (devsRes.error || recentRes.error) {
    return NextResponse.json({error: 'query failed'}, {status: 500});
  }

  const developers = devsRes.data ?? [];
  const recent = recentRes.data ?? [];

  const now = Date.now();
  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);
  const todayStart = startOfTodayUtc.getTime();

  const devAgg = new Map<
    string,
    {
      last_seen: string | null;
      last_event: string | null;
      last_session: string | null;
      last_repo: string | null;
      prompts: number;
      tools: number;
      errors: number;
      sessions: Set<string>;
      minutes_today_first: number | null;
      minutes_today_last: number | null;
      os: string | null;
      host: string | null;
      claude_version: string | null;
    }
  >();

  for (const row of recent) {
    const devId = row.developer_id as string;
    const agg =
      devAgg.get(devId) ??
      {
        last_seen: null,
        last_event: null,
        last_session: null,
        last_repo: null,
        prompts: 0,
        tools: 0,
        errors: 0,
        sessions: new Set<string>(),
        minutes_today_first: null,
        minutes_today_last: null,
        os: null,
        host: null,
        claude_version: null
      };

    const tsServer = row.ts_server as string;
    if (!agg.last_seen || new Date(tsServer) > new Date(agg.last_seen)) {
      agg.last_seen = tsServer;
      agg.last_event = row.event_type as string;
      agg.last_session = row.session_id as string | null;
      agg.last_repo = (row.repo_id as string | null) ?? null;
      agg.os = agg.os ?? ((row.os as string | null) ?? null);
      agg.host = agg.host ?? ((row.host as string | null) ?? null);
      agg.claude_version =
        agg.claude_version ?? ((row.claude_version as string | null) ?? null);
    }
    if (row.event_type === 'prompt') agg.prompts++;
    if (row.event_type === 'tool_post') agg.tools++;
    if (row.event_type === 'error') agg.errors++;
    if (typeof row.session_id === 'string' && row.session_id) {
      agg.sessions.add(row.session_id);
    }

    const t = new Date(tsServer).getTime();
    if (t >= todayStart) {
      agg.minutes_today_first = Math.min(agg.minutes_today_first ?? t, t);
      agg.minutes_today_last = Math.max(agg.minutes_today_last ?? t, t);
    }

    devAgg.set(devId, agg);
  }

  const devList = developers
    .map((d) => {
      const a = devAgg.get(d.id);
      const lastSeenMs = a?.last_seen ? new Date(a.last_seen).getTime() : 0;
      const deltaMin = lastSeenMs ? (now - lastSeenMs) / 60000 : Number.POSITIVE_INFINITY;
      const status =
        !lastSeenMs
          ? 'offline'
          : deltaMin <= 3
          ? 'online'
          : deltaMin <= 15
          ? 'idle'
          : 'offline';
      const minutesToday =
        a?.minutes_today_first && a?.minutes_today_last
          ? Math.round((a.minutes_today_last - a.minutes_today_first) / 60000)
          : 0;
      return {
        id: d.id,
        name: d.name,
        email: d.email,
        disabled: !!d.disabled_at,
        status,
        last_seen: a?.last_seen ?? null,
        last_event: a?.last_event ?? null,
        last_session: a?.last_session ?? null,
        last_repo: a?.last_repo ?? null,
        sessions_total: a?.sessions.size ?? 0,
        prompts: a?.prompts ?? 0,
        tools: a?.tools ?? 0,
        errors: a?.errors ?? 0,
        minutes_today: minutesToday,
        os: a?.os ?? null,
        host: a?.host ?? null,
        claude_version: a?.claude_version ?? null
      };
    })
    .sort((a, b) => {
      const av = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bv = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bv - av;
    });

  const sessionsAgg = new Map<
    string,
    {
      developer_id: string;
      session_id: string;
      started: string;
      ended: string;
      tools: number;
      errors: number;
      closed: boolean;
      repo_id: string | null;
    }
  >();

  for (const row of recent) {
    const sid = row.session_id as string | null;
    if (!sid) continue;
    const key = `${row.developer_id}::${sid}`;
    const agg =
      sessionsAgg.get(key) ??
      {
        developer_id: row.developer_id as string,
        session_id: sid,
        started: row.ts_server as string,
        ended: row.ts_server as string,
        tools: 0,
        errors: 0,
        closed: false,
        repo_id: (row.repo_id as string | null) ?? null
      };
    if (new Date(row.ts_server as string) < new Date(agg.started)) {
      agg.started = row.ts_server as string;
    }
    if (new Date(row.ts_server as string) > new Date(agg.ended)) {
      agg.ended = row.ts_server as string;
    }
    if (row.event_type === 'tool_post') agg.tools++;
    if (row.event_type === 'error') agg.errors++;
    if (row.event_type === 'session_end' || row.event_type === 'stop') {
      agg.closed = true;
    }
    if (!agg.repo_id && row.repo_id) agg.repo_id = row.repo_id as string;
    sessionsAgg.set(key, agg);
  }

  const devNameById = new Map(developers.map((d) => [d.id, d.name]));
  const sessions = Array.from(sessionsAgg.values())
    .sort((a, b) => new Date(b.started).getTime() - new Date(a.started).getTime())
    .slice(0, SESSION_LIMIT)
    .map((s) => ({
      developer: devNameById.get(s.developer_id) ?? s.developer_id,
      session_id: s.session_id,
      started: s.started,
      ended: s.ended,
      tools: s.tools,
      errors: s.errors,
      closed: s.closed,
      repo_id: s.repo_id,
      duration_min: Math.round(
        (new Date(s.ended).getTime() - new Date(s.started).getTime()) / 60000
      )
    }));

  const totals = {
    events: totalsRes.count ?? 0,
    integrity_broken: integrityRes.count ?? 0,
    devs: developers.length,
    devs_online: devList.filter((d) => d.status === 'online').length,
    devs_idle: devList.filter((d) => d.status === 'idle').length,
    errors_recent: recent.filter((r) => r.event_type === 'error').length,
    commits_unmatched: unmatchedRes.count ?? 0
  };

  const commits = (commitsRes.data ?? []).map((c) => ({
    id: c.id,
    commit_sha: (c.commit_sha as string)?.slice(0, 10) ?? '',
    repo_full: c.repo_full,
    branch: c.branch,
    author_email: c.author_email,
    author_name: c.author_name,
    committed_at: c.committed_at,
    pushed_at: c.pushed_at,
    developer:
      (c.developer_id && devNameById.get(c.developer_id as string)) ||
      c.author_name ||
      c.author_email,
    session_matched: c.session_matched,
    matched_session_id: c.matched_session_id,
    alert: c.alert
  }));

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    totals,
    developers: devList,
    sessions,
    recent: recent.map((r) => ({
      id: r.id,
      developer: devNameById.get(r.developer_id as string) ?? r.developer_id,
      event_type: r.event_type,
      session_id: r.session_id,
      ts_server: r.ts_server,
      repo_id: r.repo_id,
      data: r.data
    })),
    commits
  });
}
