import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type Redirect = {
  id: number;
  source: string;
  destination: string;
  status_code: 301 | 302 | 307 | 308;
  note: string | null;
  hit_count: number;
  enabled: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
};

export type NewRedirect = {
  source: string;
  destination: string;
  status_code?: 301 | 302 | 307 | 308;
  note?: string | null;
  enabled?: boolean;
  created_by?: string;
};

export function normalizeSource(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // Ensure leading slash + strip trailing slash (except root)
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

export async function listRedirects(): Promise<Redirect[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('redirects')
      .select('*')
      .order('updated_at', {ascending: false})
      .limit(500);
    if (error) throw error;
    return (data ?? []) as Redirect[];
  } catch {
    return [];
  }
}

/** Map of enabled redirects, used by proxy. Returns empty map on any failure. */
export async function getEnabledRedirectMap(): Promise<
  Map<string, {destination: string; status_code: number; id: number}>
> {
  const map = new Map<string, {destination: string; status_code: number; id: number}>();
  try {
    const {data, error} = await supabaseAdmin()
      .from('redirects')
      .select('id,source,destination,status_code')
      .eq('enabled', true);
    if (error) throw error;
    for (const row of (data ?? []) as {
      id: number;
      source: string;
      destination: string;
      status_code: number;
    }[]) {
      map.set(row.source, {
        destination: row.destination,
        status_code: row.status_code,
        id: row.id
      });
    }
  } catch {
    // Table not present or DB offline — return empty (no redirects active).
  }
  return map;
}

export async function createRedirect(input: NewRedirect): Promise<Redirect> {
  const {data, error} = await supabaseAdmin()
    .from('redirects')
    .insert({
      source: normalizeSource(input.source),
      destination: input.destination.trim(),
      status_code: input.status_code ?? 308,
      note: input.note ?? null,
      enabled: input.enabled ?? true,
      created_by: input.created_by ?? null
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Redirect;
}

export async function updateRedirect(
  id: number,
  patch: Partial<Pick<Redirect, 'destination' | 'status_code' | 'note' | 'enabled'>>
): Promise<Redirect> {
  const {data, error} = await supabaseAdmin()
    .from('redirects')
    .update({...patch, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Redirect;
}

export async function deleteRedirect(id: number): Promise<void> {
  const {error} = await supabaseAdmin()
    .from('redirects')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function incrementRedirectHit(id: number): Promise<void> {
  try {
    // Atomic increment via RPC would be ideal; fall back to two-step read/write.
    const {data} = await supabaseAdmin()
      .from('redirects')
      .select('hit_count')
      .eq('id', id)
      .maybeSingle();
    if (!data) return;
    await supabaseAdmin()
      .from('redirects')
      .update({hit_count: (data.hit_count ?? 0) + 1})
      .eq('id', id);
  } catch {
    // swallow
  }
}
