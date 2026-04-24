import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: string;
  name: string;
  code: string | null;
  dimension: string | null;
  price: number | string | null;
  tags: string[] | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};

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

function redactPriceForRole(rows: ProductRow[], role: string) {
  if (role === 'admin') return rows;
  return rows.map((r) => ({...r, price: null, price_hidden: true}));
}

export async function GET() {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const res = await supabaseAdmin()
    .from('tbc_products')
    .select('id, name, code, dimension, price, tags, created_at, created_by, updated_at, updated_by')
    .order('name');

  if (res.error) {
    console.error('[tbc products] list', res.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  return NextResponse.json({
    products: redactPriceForRole((res.data || []) as ProductRow[], session.role),
    is_admin: session.role === 'admin'
  });
}

const CreateBody = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(64).optional().or(z.literal('')),
  dimension: z.string().max(64).optional().or(z.literal('')),
  price: z.coerce.number().finite().nonnegative().optional().nullable(),
  tags: z.array(z.string().max(48)).max(16).optional()
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
    code: parsed.data.code ? parsed.data.code.trim() : null,
    dimension: parsed.data.dimension ? parsed.data.dimension.trim() : null,
    price: parsed.data.price ?? null,
    tags: normalizeTags(parsed.data.tags),
    created_by: session.username,
    updated_by: session.username
  };

  const ins = await supabaseAdmin()
    .from('tbc_products')
    .insert(row)
    .select('*')
    .single();

  if (ins.error) {
    console.error('[tbc products] insert', ins.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeAudit({
    actor: session.username,
    action: 'product.create',
    targetType: 'product',
    targetId: ins.data.id as string,
    summary: `დაამატა პროდუქტი "${row.name}"${row.code ? ' · ' + row.code : ''}`,
    metadata: row
  });

  return NextResponse.json({ok: true, product: ins.data});
}

// Bulk import (XLSX → rows). Admin only. Accepts {rows: [{name, code?, dimension?, price?, tags?}]}
const BulkBody = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        code: z.string().max(64).optional().nullable(),
        dimension: z.string().max(64).optional().nullable(),
        price: z.coerce.number().finite().nonnegative().optional().nullable(),
        tags: z.array(z.string().max(48)).max(16).optional()
      })
    )
    .min(1)
    .max(2000)
});

export async function PUT(req: Request) {
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
  const parsed = BulkBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', details: parsed.error.flatten()},
      {status: 400}
    );
  }

  const rows = parsed.data.rows.map((r) => ({
    name: r.name.trim(),
    code: r.code ? r.code.toString().trim() : null,
    dimension: r.dimension ? r.dimension.toString().trim() : null,
    price: r.price ?? null,
    tags: normalizeTags(r.tags),
    created_by: session.username,
    updated_by: session.username
  }));

  const ins = await supabaseAdmin()
    .from('tbc_products')
    .insert(rows)
    .select('id');

  if (ins.error) {
    console.error('[tbc products] bulk insert', ins.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeAudit({
    actor: session.username,
    action: 'product.bulk_import',
    targetType: 'product',
    summary: `XLSX იმპორტი — ${rows.length} პროდუქტი`,
    metadata: {count: rows.length}
  });

  return NextResponse.json({ok: true, inserted: (ins.data || []).length});
}
