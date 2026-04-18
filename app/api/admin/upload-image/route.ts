import {NextResponse, type NextRequest} from 'next/server';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'public-assets';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

function safeFolder(v: string | null): string {
  const clean = (v ?? 'misc').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  return clean || 'misc';
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  return map[mime] ?? 'bin';
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

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
      {error: 'bad_mime', message: 'მხოლოდ JPG / PNG / WEBP / GIF / SVG'},
      {status: 415}
    );
  }

  const folder = safeFolder(String(form.get('folder') ?? 'misc'));
  const ext = extFromMime(file.type);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${folder}/${ts}-${rand}.${ext}`;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const client = supabaseAdmin();

    // Ensure bucket exists (idempotent — ignore 'already exists' error)
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
    if (upErr) {
      console.error('[upload-image] upload failed', upErr);
      return NextResponse.json(
        {error: 'upload_failed', message: upErr.message},
        {status: 500}
      );
    }

    const {data: publicUrl} = client.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({
      ok: true,
      url: publicUrl.publicUrl,
      path,
      bucket: BUCKET
    });
  } catch (e) {
    console.error('[upload-image] failed', e);
    return NextResponse.json(
      {error: 'server', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
