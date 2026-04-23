import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {getCurrentDmtUser} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/dmt/inventory
export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {data, error} = await supabaseAdmin()
    .from('dmt_inventory')
    .select('*')
    .order('created_at', {ascending: false});

  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({items: data});
}

const CreateBody = z.object({
  sku:              z.string().trim().min(1).max(80),
  name:             z.string().trim().min(1).max(300),
  description:      z.string().trim().max(500).optional(),
  tags:             z.array(z.string().trim().max(60)).max(20).optional(),
  dimensions:       z.string().trim().max(100).optional(),
  qty:              z.number().int().min(0).optional(),
  price:            z.number().min(0).optional(),
  image_url:        z.string().url().optional().or(z.literal('')),
  reserve_lead_ids: z.array(z.string()).optional(),
});

// POST /api/dmt/inventory
export async function POST(req: NextRequest) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});

  const d = parsed.data;
  const db = supabaseAdmin();

  const {data: item, error} = await db
    .from('dmt_inventory')
    .insert({
      sku:              d.sku,
      name:             d.name,
      description:      d.description ?? null,
      tags:             d.tags ?? [],
      dimensions:       d.dimensions ?? null,
      qty:              d.qty ?? 0,
      price:            d.price ?? null,
      image_url:        d.image_url || null,
      reserve_lead_ids: d.reserve_lead_ids ?? [],
      created_by:       me.name || me.email,
    })
    .select()
    .single();

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  await db.from('dmt_inventory_logs').insert({
    item_id:  item.id,
    item_sku: item.sku,
    action:   'create',
    changes:  {snapshot: item},
    actor:    me.name || me.email,
  });

  return NextResponse.json({item}, {status: 201});
}
