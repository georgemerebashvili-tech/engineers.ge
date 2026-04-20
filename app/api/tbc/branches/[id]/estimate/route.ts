import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

async function ensureBranchVisible(
  db: ReturnType<typeof supabaseAdmin>,
  session: {uid: string; role: 'admin' | 'user'},
  branchId: number
) {
  if (session.role === 'admin') return true;
  const perms = await db
    .from('tbc_branch_permissions')
    .select('branch_id')
    .eq('user_id', session.uid);
  const rows = perms.data || [];
  if (rows.some((r) => r.branch_id == null)) return true;
  return rows.some((r) => r.branch_id === branchId);
}

export async function GET(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await ensureBranchVisible(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const branch = await db
    .from('tbc_branches')
    .select('id, alias, name, city, address, tbc_manager, dmt_manager')
    .eq('id', branchId)
    .maybeSingle();
  if (!branch.data)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const rows = await db
    .from('tbc_estimate_items')
    .select('id, sort_order, name, item_type, unit, qty, price, total, note, updated_at, updated_by')
    .eq('branch_id', branchId)
    .order('sort_order', {ascending: true});

  if (rows.error)
    return NextResponse.json({error: 'db_error'}, {status: 500});

  return NextResponse.json({
    branch: branch.data,
    items: rows.data || []
  });
}

const ItemSchema = z.object({
  sort_order: z.number().int().min(0).max(100000).optional(),
  name: z.string().min(1).max(500),
  item_type: z.string().max(64).nullable().optional(),
  unit: z.string().max(32).nullable().optional(),
  qty: z.number().min(0).max(1_000_000).default(0),
  price: z.number().min(0).max(100_000_000).default(0),
  note: z.string().max(2000).nullable().optional()
});

const PutBody = z.object({
  items: z.array(ItemSchema).max(500)
});

export async function PUT(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = PutBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', details: parsed.error.flatten()},
      {status: 400}
    );
  }

  const db = supabaseAdmin();
  if (!(await ensureBranchVisible(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  // Only admins and users with edit permission (phase: admin only for now)
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  // Replace-all strategy: delete then bulk insert (consistent snapshot).
  await db.from('tbc_estimate_items').delete().eq('branch_id', branchId);

  if (parsed.data.items.length === 0) {
    return NextResponse.json({ok: true, items: []});
  }

  const now = new Date().toISOString();
  const rows = parsed.data.items.map((item, idx) => ({
    branch_id: branchId,
    sort_order: item.sort_order ?? idx,
    name: item.name,
    item_type: item.item_type || null,
    unit: item.unit || null,
    qty: item.qty,
    price: item.price,
    note: item.note || null,
    updated_at: now,
    updated_by: session.username
  }));

  const ins = await db
    .from('tbc_estimate_items')
    .insert(rows)
    .select('id, sort_order, name, item_type, unit, qty, price, total, note');

  if (ins.error) {
    console.error('[tbc] estimate insert', ins.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  const total = (ins.data || []).reduce(
    (s, r) => s + Number((r as {total?: number}).total || 0),
    0
  );
  await writeAudit({
    actor: session.username,
    action: 'estimate.save',
    targetType: 'branch',
    targetId: branchId,
    summary: `განაახლა ხარჯთაღრიცხვა ფილიალი #${branchId}: ${ins.data?.length || 0} პოზიცია, ჯამი ₾${total.toFixed(2)}`,
    metadata: {
      branch_id: branchId,
      count: ins.data?.length || 0,
      total,
      items: (ins.data || []).map((r) => {
        const row = r as {
          name: string;
          item_type: string | null;
          unit: string | null;
          qty: number;
          price: number;
          total: number;
        };
        return {
          name: row.name,
          item_type: row.item_type,
          unit: row.unit,
          qty: row.qty,
          price: row.price,
          total: row.total
        };
      })
    }
  });

  return NextResponse.json({ok: true, items: ins.data || []});
}
