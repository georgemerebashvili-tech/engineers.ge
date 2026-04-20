import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type ClaudeSessionRow = {
  session_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  project: string | null;
  cwd: string | null;
  model: string | null;
};

export type ClaudeSessionEvent = {
  id: number;
  session_id: string;
  kind: 'start' | 'end' | 'stop';
  event_at: string;
  client_at: string | null;
  project: string | null;
  cwd: string | null;
  model: string | null;
  user_agent: string | null;
  source_ip: string | null;
};

export type SessionStats = {
  totalSeconds: number;
  totalSessions: number;
  todaySeconds: number;
  last7Seconds: number;
  last30Seconds: number;
  avgSessionSeconds: number;
  activeSessions: number;
};

export async function getSessions(limit = 500): Promise<ClaudeSessionRow[]> {
  const client = supabaseAdmin();
  const {data, error} = await client
    .from('claude_sessions')
    .select('*')
    .order('started_at', {ascending: false})
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ClaudeSessionRow[];
}

export async function getRecentEvents(limit = 100): Promise<ClaudeSessionEvent[]> {
  const client = supabaseAdmin();
  const {data, error} = await client
    .from('claude_session_events')
    .select(
      'id, session_id, kind, event_at, client_at, project, cwd, model, user_agent, source_ip'
    )
    .order('event_at', {ascending: false})
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ClaudeSessionEvent[];
}

export function computeStats(rows: ClaudeSessionRow[]): SessionStats {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  let totalSeconds = 0;
  let todaySeconds = 0;
  let last7Seconds = 0;
  let last30Seconds = 0;
  let closed = 0;
  let active = 0;

  for (const r of rows) {
    // If session is still open, count duration up to now (capped by 24h
    // to avoid runaway "forgot to close" sessions skewing stats).
    const start = new Date(r.started_at).getTime();
    let dur = r.duration_seconds ?? 0;
    if (r.ended_at == null) {
      active += 1;
      const elapsed = Math.max(0, (now - start) / 1000);
      dur = Math.min(elapsed, 24 * 60 * 60);
    } else {
      closed += 1;
    }
    totalSeconds += dur;
    if (start >= dayAgo) todaySeconds += dur;
    if (start >= weekAgo) last7Seconds += dur;
    if (start >= monthAgo) last30Seconds += dur;
  }

  return {
    totalSeconds: Math.round(totalSeconds),
    totalSessions: rows.length,
    todaySeconds: Math.round(todaySeconds),
    last7Seconds: Math.round(last7Seconds),
    last30Seconds: Math.round(last30Seconds),
    avgSessionSeconds: closed > 0 ? Math.round(totalSeconds / closed) : 0,
    activeSessions: active
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}წმ`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}წთ`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return `${h}სთ ${rem}წთ`;
  const d = Math.floor(h / 24);
  const hrem = h % 24;
  return `${d}დღე ${hrem}სთ`;
}

export function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}
