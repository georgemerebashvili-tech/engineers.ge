import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'archived';

export type BugReport = {
  id: string;
  feature_key: string | null;
  pathname: string;
  message: string;
  email: string | null;
  user_agent: string | null;
  viewport: string | null;
  status: BugStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type NewBugReport = {
  feature_key?: string | null;
  pathname: string;
  message: string;
  email?: string | null;
  user_agent?: string | null;
  viewport?: string | null;
};

export async function createBugReport(input: NewBugReport): Promise<BugReport> {
  const {data, error} = await supabaseAdmin()
    .from('bug_reports')
    .insert({
      feature_key: input.feature_key ?? null,
      pathname: input.pathname,
      message: input.message,
      email: input.email ?? null,
      user_agent: input.user_agent ?? null,
      viewport: input.viewport ?? null
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as BugReport;
}

export async function listBugReports(opts?: {
  status?: BugStatus | 'all';
  limit?: number;
}): Promise<BugReport[]> {
  try {
    let q = supabaseAdmin()
      .from('bug_reports')
      .select('*')
      .order('created_at', {ascending: false})
      .limit(opts?.limit ?? 200);
    if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status);
    const {data, error} = await q;
    if (error) throw error;
    return (data ?? []) as BugReport[];
  } catch {
    return [];
  }
}

export async function updateBugReport(
  id: string,
  patch: Partial<Pick<BugReport, 'status' | 'admin_note'>>
): Promise<BugReport> {
  const {data, error} = await supabaseAdmin()
    .from('bug_reports')
    .update({...patch, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as BugReport;
}

export async function countOpenBugReports(): Promise<number> {
  try {
    const {count, error} = await supabaseAdmin()
      .from('bug_reports')
      .select('*', {count: 'exact', head: true})
      .in('status', ['open', 'in_progress']);
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}
