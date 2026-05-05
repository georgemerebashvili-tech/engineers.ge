import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {offerFromDb} from '@/lib/dmt/shared-state-server';

type Db = ReturnType<typeof supabaseAdmin>;

export type OfferAuditAction = 'create' | 'update' | 'send' | 'approve' | 'reject' | 'delete' | 'generate_pdf';

export async function manualLeadExists(db: Db, leadId: string) {
  const {data, error} = await db
    .from('dmt_manual_leads')
    .select('id')
    .eq('id', leadId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function nextOfferId(db: Db) {
  const {data, error} = await db
    .from('dmt_offers')
    .select('id')
    .like('id', 'O-%');
  if (error) throw error;

  const max = (data ?? []).reduce((current, row) => {
    const match = String(row.id ?? '').match(/^O-(\d+)$/);
    if (!match) return current;
    return Math.max(current, Number(match[1]));
  }, 1000);

  return `O-${max + 1}`;
}

export async function insertOfferAudit(
  db: Db,
  input: {
    actor: string;
    action: OfferAuditAction;
    offerId: string;
    leadId?: string | null;
    before?: unknown;
    after?: unknown;
    notes?: string;
  }
) {
  const {data, error} = await db
    .from('dmt_offers_audit')
    .insert({
      by: input.actor,
      action: input.action,
      offer_id: input.offerId,
      lead_id: input.leadId ?? null,
      before_val: input.before ?? null,
      after_val: input.after ?? null,
      notes: input.notes ?? ''
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOfferOrNull(db: Db, id: string) {
  const {data, error} = await db
    .from('dmt_offers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? offerFromDb(data) : null;
}
