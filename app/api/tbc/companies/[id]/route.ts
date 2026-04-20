import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['client', 'contractor', 'supplier', 'other']).optional(),
  contact_person: z.string().max(128).nullable().optional().or(z.literal('')),
  phone: z.string().max(64).nullable().optional().or(z.literal('')),
  email: z.string().email().max(256).nullable().optional().or(z.literal('')),
  address: z.string().max(500).nullable().optional().or(z.literal('')),
  tax_id: z.string().max(64).nullable().optional().or(z.literal('')),
  notes: z.string().max(2000).nullable().optional().or(z.literal('')),
  active: z.boolean().optional()
});

export async function PATCH(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: session.username
  };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    update[k] =
      typeof v === 'string' && v === ''
        ? null
        : typeof v === 'string'
          ? v.trim()
          : v;
  }

  const res = await supabaseAdmin()
    .from('tbc_companies')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  await writeAudit({
    actor: session.username,
    action: 'company.update',
    targetType: 'company',
    targetId: id,
    summary: `განაახლა კომპანია "${res.data.name}"`,
    metadata: {changes: update, name: res.data.name}
  });

  return NextResponse.json({ok: true, company: res.data});
}

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  const db = supabaseAdmin();

  const target = await db
    .from('tbc_companies')
    .select('id, name, type')
    .eq('id', id)
    .maybeSingle();
  if (!target.data)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const del = await db.from('tbc_companies').delete().eq('id', id);
  if (del.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  await writeAudit({
    actor: session.username,
    action: 'company.delete',
    targetType: 'company',
    targetId: id,
    summary: `წაშალა კომპანია "${target.data.name}"`,
    metadata: target.data
  });

  return NextResponse.json({ok: true});
}
