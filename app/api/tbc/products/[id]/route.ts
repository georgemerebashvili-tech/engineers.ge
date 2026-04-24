import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const cleaned = v.trim().replace(/^#+/, '').trim();
    if (!cleaned) continue;
    const tag = cleaned.slice(0, 48);
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 16) break;
  }
  return out;
}

const PatchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(64).nullable().optional().or(z.literal('')),
  dimension: z.string().max(64).nullable().optional().or(z.literal('')),
  price: z.coerce.number().finite().nonnegative().nullable().optional(),
  tags: z.array(z.string().max(48)).max(16).optional()
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
    if (k === 'tags') {
      update.tags = normalizeTags(v);
      continue;
    }
    update[k] = typeof v === 'string' && v === '' ? null : typeof v === 'string' ? v.trim() : v;
  }

  const res = await supabaseAdmin()
    .from('tbc_products')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  await writeAudit({
    actor: session.username,
    action: 'product.update',
    targetType: 'product',
    targetId: id,
    summary: `განაახლა პროდუქტი "${res.data.name}"`,
    metadata: {changes: update, name: res.data.name}
  });

  return NextResponse.json({ok: true, product: res.data});
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
    .from('tbc_products')
    .select('id, name, code')
    .eq('id', id)
    .maybeSingle();
  if (!target.data)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const del = await db.from('tbc_products').delete().eq('id', id);
  if (del.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  await writeAudit({
    actor: session.username,
    action: 'product.delete',
    targetType: 'product',
    targetId: id,
    summary: `წაშალა პროდუქტი "${target.data.name}"`,
    metadata: target.data
  });

  return NextResponse.json({ok: true});
}
