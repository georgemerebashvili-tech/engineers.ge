import {NextRequest, NextResponse} from 'next/server';
import {getCurrentDmtUser} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'dmt-inventory';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const form = await req.formData().catch(() => null);
  const file = form?.get('file') as File | null;

  if (!file) return NextResponse.json({error: 'no file'}, {status: 400});
  if (!ALLOWED.has(file.type))
    return NextResponse.json({error: 'მხოლოდ JPEG / PNG / WebP'}, {status: 400});
  if (file.size > MAX_BYTES)
    return NextResponse.json({error: 'ფაილი 5 MB-ზე მეტია'}, {status: 400});

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const {error} = await supabaseAdmin().storage
    .from(BUCKET)
    .upload(path, buf, {contentType: file.type, upsert: false});

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  const {data} = supabaseAdmin().storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({url: data.publicUrl}, {status: 201});
}
