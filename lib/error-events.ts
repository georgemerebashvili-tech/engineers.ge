import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type ErrorKind = 'route' | 'global' | 'api';

export type ErrorEvent = {
  id: number;
  message: string;
  stack: string | null;
  digest: string | null;
  pathname: string;
  kind: ErrorKind;
  user_agent: string | null;
  viewport: string | null;
  referrer: string | null;
  visitor_id: string | null;
  resolved: boolean;
  created_at: string;
};

export type NewErrorEvent = {
  message: string;
  stack?: string | null;
  digest?: string | null;
  pathname: string;
  kind?: ErrorKind;
  user_agent?: string | null;
  viewport?: string | null;
  referrer?: string | null;
  visitor_id?: string | null;
};

export async function createErrorEvent(input: NewErrorEvent): Promise<void> {
  try {
    await supabaseAdmin()
      .from('error_events')
      .insert({
        message: input.message.slice(0, 2000),
        stack: (input.stack ?? null)?.slice(0, 8000) ?? null,
        digest: input.digest ?? null,
        pathname: input.pathname.slice(0, 500),
        kind: input.kind ?? 'route',
        user_agent: input.user_agent?.slice(0, 500) ?? null,
        viewport: input.viewport?.slice(0, 30) ?? null,
        referrer: input.referrer?.slice(0, 500) ?? null,
        visitor_id: input.visitor_id?.slice(0, 100) ?? null
      });
  } catch {
    // Swallow — logging must never cascade into another error.
  }
}

export async function listErrorEvents(opts?: {
  resolved?: boolean;
  limit?: number;
}): Promise<ErrorEvent[]> {
  try {
    let q = supabaseAdmin()
      .from('error_events')
      .select('*')
      .order('created_at', {ascending: false})
      .limit(opts?.limit ?? 300);
    if (typeof opts?.resolved === 'boolean') q = q.eq('resolved', opts.resolved);
    const {data, error} = await q;
    if (error) throw error;
    return (data ?? []) as ErrorEvent[];
  } catch {
    return [];
  }
}

export async function toggleErrorResolved(id: number, resolved: boolean): Promise<void> {
  const {error} = await supabaseAdmin()
    .from('error_events')
    .update({resolved})
    .eq('id', id);
  if (error) throw error;
}

/** Group by message+digest for deduplicated summary view. */
export async function countErrorsByDigest(): Promise<Array<{
  digest: string | null;
  message: string;
  count: number;
  latest_at: string;
}>> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('error_events')
      .select('message,digest,created_at')
      .eq('resolved', false)
      .order('created_at', {ascending: false})
      .limit(1000);
    if (error) throw error;
    const groups = new Map<string, {digest: string | null; message: string; count: number; latest_at: string}>();
    for (const row of (data ?? []) as {message: string; digest: string | null; created_at: string}[]) {
      const key = row.digest ?? row.message.slice(0, 120);
      const entry = groups.get(key);
      if (entry) entry.count++;
      else groups.set(key, {digest: row.digest, message: row.message, count: 1, latest_at: row.created_at});
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}
