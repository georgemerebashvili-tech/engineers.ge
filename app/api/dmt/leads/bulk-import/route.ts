import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {auditFromDb, dmtActor, jsonError, leadFromDb, leadToDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const leads = Array.isArray(body) ? body : Array.isArray(body?.leads) ? body.leads : [];
  const audit = Array.isArray(body?.audit) ? body.audit : [];
  const actor = dmtActor(auth.me);
  const db = supabaseAdmin();

  let importedLeads: unknown[] = [];
  if (leads.length) {
    const {data, error} = await db
      .from('dmt_leads')
      .upsert(leads.map((lead: Record<string, unknown>) => leadToDb(lead, actor)), {onConflict: 'id', ignoreDuplicates: true})
      .select();
    if (error) return jsonError(error);
    importedLeads = data ?? [];
  }

  let importedAudit: unknown[] = [];
  if (audit.length) {
    const {data, error} = await db
      .from('dmt_leads_audit')
      .insert(audit.map((row: Record<string, unknown>) => ({
        at: String(row.at ?? new Date().toISOString()),
        by: String(row.by ?? actor),
        action: String(row.action ?? 'update'),
        lead_id: String(row.leadId ?? row.lead_id ?? ''),
        lead_label: String(row.leadLabel ?? row.lead_label ?? ''),
        column_key: row.column ? String(row.column) : null,
        column_label: row.columnLabel ? String(row.columnLabel) : null,
        before_val: row.before === undefined ? null : String(row.before),
        after_val: row.after === undefined ? null : String(row.after),
      })))
      .select();
    if (error) return jsonError(error);
    importedAudit = data ?? [];
  }

  return NextResponse.json({
    leads: importedLeads.map((row) => leadFromDb(row as Record<string, unknown>)),
    audit: importedAudit.map((row) => auditFromDb(row as Record<string, unknown>)),
  }, {status: 201});
}
