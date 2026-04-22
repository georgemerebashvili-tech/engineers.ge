import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

/**
 * Resolve which company ids a given user is allowed to see.
 * Admin callers bypass this check at the caller level.
 *
 * Semantics (role='user'):
 *   • no rows           → no visibility, returns []
 *   • row with null     → wildcard, returns null (= "all companies")
 *   • rows with ids     → returns that list of ids
 */
export async function getAllowedCompanyIds(
  userId: string
): Promise<number[] | null> {
  const res = await supabaseAdmin()
    .from('tbc_user_company_access')
    .select('company_id')
    .eq('user_id', userId);
  if (res.error) {
    console.error('[tbc company-access] fetch', res.error);
    return [];
  }
  const rows = res.data || [];
  if (rows.some((r) => r.company_id === null)) return null;
  return rows
    .map((r) => r.company_id)
    .filter((v): v is number => typeof v === 'number');
}
