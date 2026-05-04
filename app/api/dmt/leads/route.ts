import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  auditFromDb,
  dmtActor,
  jsonError,
  leadFromDb,
  leadToDb,
  requireDmtUser,
} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function leadLabel(lead: Record<string, unknown>) {
  return String(lead.name || lead.company || lead.email || lead.phone || 'Lead');
}

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_leads')
    .select('*')
    .order('created_at', {ascending: false});

  if (error) return jsonError(error);
  return NextResponse.json({leads: (data ?? []).map(leadFromDb)});
}

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({error: 'invalid body'}, {status: 400});

  const actor = dmtActor(auth.me);
  const db = supabaseAdmin();
  const {data, error} = await db
    .from('dmt_leads')
    .insert(leadToDb(body, actor))
    .select()
    .single();

  if (error) return jsonError(error);

  const {data: auditRow} = await db
    .from('dmt_leads_audit')
    .insert({
      at: new Date().toISOString(),
      by: actor,
      action: 'create',
      lead_id: data.id,
      lead_label: leadLabel(data),
    })
    .select()
    .single();

  return NextResponse.json(
    {lead: leadFromDb(data), auditEntry: auditRow ? auditFromDb(auditRow) : null},
    {status: 201},
  );
}
