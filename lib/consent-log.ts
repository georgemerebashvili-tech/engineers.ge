import 'server-only';
import {createHash} from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type ConsentAction = 'decide' | 'reopen';

export type ConsentLogEntry = {
  id: number;
  visitor_id: string | null;
  analytics: boolean;
  marketing: boolean;
  action: ConsentAction;
  pathname: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
};

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function createConsentLog(input: {
  visitor_id?: string | null;
  analytics: boolean;
  marketing: boolean;
  action?: ConsentAction;
  pathname?: string | null;
  user_agent?: string | null;
  ip_hash?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin()
      .from('consent_log')
      .insert({
        visitor_id: input.visitor_id?.slice(0, 100) ?? null,
        analytics: input.analytics,
        marketing: input.marketing,
        action: input.action ?? 'decide',
        pathname: input.pathname?.slice(0, 500) ?? null,
        user_agent: input.user_agent?.slice(0, 500) ?? null,
        ip_hash: input.ip_hash ?? null
      });
  } catch {
    // swallow — logging never breaks app
  }
}

export async function listConsentLog(limit = 300): Promise<ConsentLogEntry[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('consent_log')
      .select('*')
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ConsentLogEntry[];
  } catch {
    return [];
  }
}

export async function getConsentStats(sinceDays = 30): Promise<{
  total: number;
  accepted_analytics: number;
  accepted_marketing: number;
  essential_only: number;
  acceptance_rate: number;
  unique_visitors: number;
}> {
  const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
  try {
    const {data, error} = await supabaseAdmin()
      .from('consent_log')
      .select('visitor_id,analytics,marketing,action')
      .gte('created_at', since)
      .eq('action', 'decide');
    if (error) throw error;
    const rows = (data ?? []) as Pick<ConsentLogEntry, 'visitor_id' | 'analytics' | 'marketing'>[];
    const total = rows.length;
    const acceptedAnalytics = rows.filter((r) => r.analytics).length;
    const acceptedMarketing = rows.filter((r) => r.marketing).length;
    const essentialOnly = rows.filter((r) => !r.analytics && !r.marketing).length;
    const uniqueVisitors = new Set(
      rows.map((r) => r.visitor_id).filter((v): v is string => !!v)
    ).size;
    return {
      total,
      accepted_analytics: acceptedAnalytics,
      accepted_marketing: acceptedMarketing,
      essential_only: essentialOnly,
      acceptance_rate: total === 0 ? 0 : Math.round((acceptedAnalytics / total) * 100),
      unique_visitors: uniqueVisitors
    };
  } catch {
    return {
      total: 0,
      accepted_analytics: 0,
      accepted_marketing: 0,
      essential_only: 0,
      acceptance_rate: 0,
      unique_visitors: 0
    };
  }
}
