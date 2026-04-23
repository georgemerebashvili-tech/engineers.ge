import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {getCurrentDmtUser} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  sku:              z.string().trim().min(1).max(80).optional(),
  name:             z.string().trim().min(1).max(300).optional(),
  description:      z.string().trim().max(500).optional(),
  tags:             z.array(z.string().trim().max(60)).max(20).optional(),
  dimensions:       z.string().trim().max(100).optional(),
  qty:              z.number().int().min(0).optional(),
  price:            z.number().min(0).nullable().optional(),
  image_url:        z.string().url().optional().or(z.literal('')).nullable(),
  reserve_lead_ids: z.array(z.string()).optional(),
});

// PATCH /api/dmt/inventory/[id]
export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const db = supabaseAdmin();

  const {data: existing} = await db
    .from('dmt_inventory')
    .select('*')
    .eq('id', id)
    .single();
  if (!existing) return NextResponse.json({error: 'not found'}, {status: 404});

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});

  const d = parsed.data;
  const changes: Record<string, {old: unknown; new: unknown}> = {};
  for (const [k, v] of Object.entries(d)) {
    const oldVal = (existing as Record<string, unknown>)[k];
    if (JSON.stringify(oldVal) !== JSON.stringify(v)) {
      changes[k] = {old: oldVal, new: v};
    }
  }

  const {data: item, error} = await db
    .from('dmt_inventory')
    .update({...d, updated_by: me.name || me.email, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  if (Object.keys(changes).length > 0) {
    await db.from('dmt_inventory_logs').insert({
      item_id:  id,
      item_sku: existing.sku,
      action:   'update',
      changes,
      actor:    me.name || me.email,
    });
  }

  return NextResponse.json({item});
}

// DELETE /api/dmt/inventory/[id]
export async function DELETE(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const db = supabaseAdmin();

  const {data: existing} = await db
    .from('dmt_inventory')
    .select('*')
    .eq('id', id)
    .single();
  if (!existing) return NextResponse.json({error: 'not found'}, {status: 404});

  await db.from('dmt_inventory_logs').insert({
    item_id:  null,
    item_sku: existing.sku,
    action:   'delete',
    changes:  {snapshot: existing},
    actor:    me.name || me.email,
  });

  const {error} = await db.from('dmt_inventory').delete().eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({ok: true});
}
