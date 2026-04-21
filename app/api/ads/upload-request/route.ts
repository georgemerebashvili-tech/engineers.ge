import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {checkRateLimit, clearRateLimit, recordFailure} from '@/lib/rate-limit';
import {HERO_SLOT_KEYS, HERO_SLOT_SPECS} from '@/lib/hero-ads';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'public-assets';
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SlotKey = z.enum(HERO_SLOT_KEYS);

const Body = z
  .object({
    slot_key: SlotKey,
    company_name: z.string().min(2).max(160),
    contact_name: z.string().max(160).default(''),
    contact_email: z
      .string()
      .email()
      .max(200)
      .optional()
      .nullable()
      .or(z.literal('').transform(() => null)),
    contact_phone: z.string().max(40).default(''),
    note: z.string().max(500).default('')
  })
  .refine((value) => {
    return Boolean(value.contact_email || value.contact_phone.trim());
  }, {message: 'ერთი საკონტაქტო მაინც საჭიროა', path: ['contact_email']});

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  return map[mime] ?? 'bin';
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() ?? 'anon';
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const gate = await checkRateLimit('generic', `ad-upload:${ip}`);
  if (gate.locked) {
    return NextResponse.json(
      {error: 'rate_limited', retry_after_seconds: gate.retry_after_seconds},
      {status: 429}
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({error: 'bad_form'}, {status: 400});

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({error: 'missing_file'}, {status: 400});
  }
  if (file.size === 0) {
    return NextResponse.json({error: 'empty_file'}, {status: 400});
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {error: 'too_large', message: 'მაქსიმუმი 5MB'},
      {status: 413}
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      {error: 'bad_mime', message: 'მხოლოდ JPG / PNG / WEBP'},
      {status: 415}
    );
  }

  const parsed = Body.safeParse({
    slot_key: String(form.get('slot_key') ?? ''),
    company_name: String(form.get('company_name') ?? ''),
    contact_name: String(form.get('contact_name') ?? ''),
    contact_email: String(form.get('contact_email') ?? ''),
    contact_phone: String(form.get('contact_phone') ?? ''),
    note: String(form.get('note') ?? '')
  });

  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', issues: parsed.error.flatten()},
      {status: 400}
    );
  }

  if (!HERO_SLOT_SPECS[parsed.data.slot_key].is_ad_slot) {
    return NextResponse.json({error: 'bad_slot'}, {status: 400});
  }

  const ext = extFromMime(file.type);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `hero-requests/${parsed.data.slot_key}/${ts}-${rand}.${ext}`;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const client = supabaseAdmin();

    try {
      await client.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE
      });
    } catch {
      /* bucket likely already exists */
    }

    const {error: upErr} = await client.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false
    });
    if (upErr) throw upErr;

    const {data: publicUrl} = client.storage.from(BUCKET).getPublicUrl(path);
    const {data, error} = await client
      .from('hero_ad_upload_requests')
      .insert({
        slot_key: parsed.data.slot_key,
        company_name: parsed.data.company_name,
        contact_name: parsed.data.contact_name,
        contact_email: parsed.data.contact_email ?? '',
        contact_phone: parsed.data.contact_phone,
        note: parsed.data.note,
        asset_url: publicUrl.publicUrl,
        asset_path: path,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    await clearRateLimit('generic', `ad-upload:${ip}`);
    return NextResponse.json({ok: true, id: data.id});
  } catch (error) {
    await recordFailure('generic', `ad-upload:${ip}`);
    console.error('[ads/upload-request] failed', error);
    return NextResponse.json(
      {error: 'failed', message: error instanceof Error ? error.message : 'error'},
      {status: 500}
    );
  }
}
