import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';
import {getAllowedCompanyIds} from '@/lib/tbc/company-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  let query = db
    .from('tbc_companies')
    .select(
      'id, name, type, contact_person, phone, email, address, tax_id, notes, active, created_at, created_by, updated_at, updated_by'
    )
    .is('archived_at', null)
    .order('name');

  // Admins see everything. Non-admins: filter to their allowed set.
  if (session.role !== 'admin') {
    const allowed = await getAllowedCompanyIds(session.uid);
    if (allowed === null) {
      // wildcard — no filter applied
    } else if (allowed.length === 0) {
      return NextResponse.json({companies: []});
    } else {
      query = query.in('id', allowed);
    }
  }

  const res = await query;
  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({companies: res.data || []});
}

const CreateBody = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['client', 'contractor', 'supplier', 'other']).default('contractor'),
  contact_person: z.string().max(128).optional().or(z.literal('')),
  phone: z.string().max(64).optional().or(z.literal('')),
  email: z.string().email().max(256).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  tax_id: z.string().max(64).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal(''))
});

export async function POST(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', details: parsed.error.flatten()},
      {status: 400}
    );
  }

  const row = {
    name: parsed.data.name.trim(),
    type: parsed.data.type,
    contact_person: parsed.data.contact_person || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    tax_id: parsed.data.tax_id || null,
    notes: parsed.data.notes || null,
    active: true,
    archived_at: null,
    archived_by: null,
    archive_expires_at: null,
    archive_reason: null,
    created_by: session.username,
    updated_by: session.username
  };

  const ins = await supabaseAdmin()
    .from('tbc_companies')
    .insert(row)
    .select('*')
    .single();

  if (ins.error) {
    console.error('[tbc companies] insert', ins.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeAudit({
    actor: session.username,
    action: 'company.create',
    targetType: 'company',
    targetId: ins.data.id as number,
    summary: `დაამატა კომპანია "${row.name}" (${row.type})`,
    metadata: row
  });

  return NextResponse.json({ok: true, company: ins.data});
}
