import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {HERO_SLOT_KEYS} from '@/lib/hero-ads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SlotKey = z.enum(HERO_SLOT_KEYS);

const SlotSchema = z.object({
  slot_key: SlotKey,
  display_name: z.string().min(1).max(120),
  label: z.string().max(120).default(''),
  sublabel: z.string().max(160).default(''),
  image_url: z.string().max(2000).default(''),
  link_url: z.string().max(2000).default(''),
  client_name: z.string().max(160).default(''),
  price_gel: z.number().min(0).max(100000).default(0),
  occupied_until: z.string().nullable().optional().default(null),
  is_ad_slot: z.boolean().default(true),
  format_hint: z.string().max(120).default(''),
  size_hint: z.string().max(120).default('')
});

const Body = z.object({
  slots: z.array(SlotSchema).min(1).max(HERO_SLOT_KEYS.length)
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

  try {
    const {error} = await supabaseAdmin()
      .from('hero_ad_slots')
      .upsert(
        body.slots.map((slot) => ({
          ...slot,
          occupied_until: slot.occupied_until || null,
          updated_at: new Date().toISOString()
        })),
        {onConflict: 'slot_key'}
      );

    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('[admin/tiles] upsert failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}
