import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), schema);

const BankSchema = z.object({
  name: z.string().min(1).max(120),
  iban: z.string().min(1).max(64),
  account: emptyToNull(z.string().max(64).nullable().optional().default(null)),
  code: emptyToNull(z.enum(['bog', 'tbc', 'other']).nullable().optional().default(null)),
  pay_link: emptyToNull(z.string().url().max(300).nullable().optional().default(null))
});

const Body = z.object({
  recipient_name: z.string().max(120).default(''),
  recipient_surname: z.string().max(120).default(''),
  banks: z.array(BankSchema).max(10).default([])
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({error: 'bad body', detail: String(e)}, {status: 400});
  }

  const {error} = await supabaseAdmin()
    .from('donation_settings')
    .upsert({
      id: 1,
      recipient_name: body.recipient_name,
      recipient_surname: body.recipient_surname,
      banks: body.banks,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('[admin/donate] upsert failed', error.message);
    return NextResponse.json({error: 'db'}, {status: 500});
  }

  return NextResponse.json({ok: true});
}
