import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {getIp, logAdminAction} from '@/lib/admin-audit';
import {HERO_AD_PAYMENT_STATUSES, HERO_SLOT_KEYS} from '@/lib/hero-ads';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SlotKey = z.enum(HERO_SLOT_KEYS);
const PaymentStatus = z.enum(HERO_AD_PAYMENT_STATUSES);

const PaymentSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  slot_key: SlotKey,
  client_name: z.string().max(160).default(''),
  invoice_no: z.string().max(80).default(''),
  amount_gel: z.coerce.number().min(0).max(100000).default(0),
  status: PaymentStatus.default('sent'),
  period_start: z.string().nullable().optional().default(null),
  period_end: z.string().nullable().optional().default(null),
  due_date: z.string().nullable().optional().default(null),
  paid_at: z.string().nullable().optional().default(null),
  note: z.string().max(500).default('')
});

function sanitizeDate(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: z.infer<typeof PaymentSchema>;
  try {
    body = PaymentSchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({error: 'bad body', detail: String(error)}, {status: 400});
  }

  try {
    const payload = {
      slot_key: body.slot_key,
      client_name: body.client_name,
      invoice_no: body.invoice_no,
      amount_gel: body.amount_gel,
      status: body.status,
      period_start: sanitizeDate(body.period_start),
      period_end: sanitizeDate(body.period_end),
      due_date: sanitizeDate(body.due_date),
      paid_at: sanitizeDate(body.paid_at),
      note: body.note,
      updated_at: new Date().toISOString()
    };

    const {data, error} = await supabaseAdmin()
      .from('hero_ad_payments')
      .insert(payload)
      .select(
        'id,slot_key,client_name,invoice_no,amount_gel,status,period_start,period_end,due_date,paid_at,note,created_at,updated_at'
      )
      .single();

    if (error) throw error;

    await logAdminAction({
      actor: session.user,
      action: 'tile.payment_upsert',
      target_type: 'hero_ad_payments',
      target_id: String(data.id),
      metadata: {
        mode: 'create',
        slot_key: body.slot_key,
        invoice_no: body.invoice_no,
        amount_gel: body.amount_gel,
        status: body.status,
        due_date: sanitizeDate(body.due_date),
        paid_at: sanitizeDate(body.paid_at)
      },
      ip: getIp(req.headers)
    });

    return NextResponse.json({ok: true, payment: data});
  } catch (error) {
    console.error('[admin/hero-ad-payments] create failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: z.infer<typeof PaymentSchema>;
  try {
    body = PaymentSchema.extend({
      id: z.coerce.number().int().positive()
    }).parse(await req.json());
  } catch (error) {
    return NextResponse.json({error: 'bad body', detail: String(error)}, {status: 400});
  }

  try {
    const payload = {
      slot_key: body.slot_key,
      client_name: body.client_name,
      invoice_no: body.invoice_no,
      amount_gel: body.amount_gel,
      status: body.status,
      period_start: sanitizeDate(body.period_start),
      period_end: sanitizeDate(body.period_end),
      due_date: sanitizeDate(body.due_date),
      paid_at: sanitizeDate(body.paid_at),
      note: body.note,
      updated_at: new Date().toISOString()
    };

    const {data, error} = await supabaseAdmin()
      .from('hero_ad_payments')
      .update(payload)
      .eq('id', body.id)
      .select(
        'id,slot_key,client_name,invoice_no,amount_gel,status,period_start,period_end,due_date,paid_at,note,created_at,updated_at'
      )
      .single();

    if (error) throw error;

    await logAdminAction({
      actor: session.user,
      action: 'tile.payment_upsert',
      target_type: 'hero_ad_payments',
      target_id: String(body.id),
      metadata: {
        mode: 'update',
        slot_key: body.slot_key,
        invoice_no: body.invoice_no,
        amount_gel: body.amount_gel,
        status: body.status,
        due_date: sanitizeDate(body.due_date),
        paid_at: sanitizeDate(body.paid_at)
      },
      ip: getIp(req.headers)
    });

    return NextResponse.json({ok: true, payment: data});
  } catch (error) {
    console.error('[admin/hero-ad-payments] update failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const rawId = req.nextUrl.searchParams.get('id');
  const id = Number(rawId);
  if (!rawId || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({error: 'bad id'}, {status: 400});
  }

  try {
    const {error} = await supabaseAdmin()
      .from('hero_ad_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAdminAction({
      actor: session.user,
      action: 'tile.payment_delete',
      target_type: 'hero_ad_payments',
      target_id: String(id),
      metadata: {id},
      ip: getIp(req.headers)
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('[admin/hero-ad-payments] delete failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}
