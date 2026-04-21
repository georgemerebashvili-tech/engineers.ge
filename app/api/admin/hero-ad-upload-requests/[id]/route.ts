import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {getIp, logAdminAction} from '@/lib/admin-audit';
import {HERO_AD_UPLOAD_REQUEST_STATUSES} from '@/lib/hero-ads';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(HERO_AD_UPLOAD_REQUEST_STATUSES).refine((value) => value !== 'pending'),
  review_note: z.string().max(500).default('')
});

export async function PATCH(
  req: NextRequest,
  ctx: {params: Promise<{id: string}>}
) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id: rawId} = await ctx.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({error: 'bad id'}, {status: 400});
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    return NextResponse.json({error: 'bad body', detail: String(error)}, {status: 400});
  }

  try {
    const client = supabaseAdmin();
    const {data: existing, error: existingError} = await client
      .from('hero_ad_upload_requests')
      .select(
        'id,slot_key,company_name,contact_name,contact_email,contact_phone,note,asset_url,asset_path,status,review_note,reviewed_by,reviewed_at,created_at,updated_at'
      )
      .eq('id', id)
      .single();

    if (existingError || !existing) throw existingError ?? new Error('not found');

    const now = new Date().toISOString();
    const {data, error} = await client
      .from('hero_ad_upload_requests')
      .update({
        status: body.status,
        review_note: body.review_note,
        reviewed_by: session.user,
        reviewed_at: now,
        updated_at: now
      })
      .eq('id', id)
      .select(
        'id,slot_key,company_name,contact_name,contact_email,contact_phone,note,asset_url,asset_path,status,review_note,reviewed_by,reviewed_at,created_at,updated_at'
      )
      .single();

    if (error) throw error;

    if (body.status === 'approved') {
      const {error: slotError} = await client
        .from('hero_ad_slots')
        .update({
          image_url: existing.asset_url,
          client_name: existing.company_name,
          contact_phone: existing.contact_phone || '',
          updated_at: now
        })
        .eq('slot_key', existing.slot_key);
      if (slotError) throw slotError;
    }

    await logAdminAction({
      actor: session.user,
      action: 'tile.upload_review',
      target_type: 'hero_ad_upload_requests',
      target_id: String(id),
      metadata: {
        slot_key: existing.slot_key,
        company_name: existing.company_name,
        status: body.status,
        published: body.status === 'approved',
        review_note: body.review_note || null
      },
      ip: getIp(req.headers)
    });

    return NextResponse.json({ok: true, request: data});
  } catch (error) {
    console.error('[admin/hero-ad-upload-requests] review failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}
