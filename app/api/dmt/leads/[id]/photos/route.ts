import {randomBytes} from 'crypto';
import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, photoFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';
import {manualLeadExists} from '@/lib/dmt/offers-server';
import {analyzeLeadInventoryPhoto} from '@/lib/dmt/photos-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'dmt-lead-photos';
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fileExt(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function GET(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const {data, error} = await supabaseAdmin()
    .from('dmt_lead_inventory_photos')
    .select('*')
    .eq('lead_id', id)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) return jsonError(error);
  return NextResponse.json({photos: (data ?? []).map(photoFromDb)});
}

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const db = supabaseAdmin();

  try {
    if (!(await manualLeadExists(db, id))) {
      return NextResponse.json({error: 'lead not found'}, {status: 404});
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get('file') as File | null;
    if (!file) return NextResponse.json({error: 'no file'}, {status: 400});
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({error: 'Only JPEG, PNG, or WebP images are allowed'}, {status: 400});
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({error: 'File must be 8 MB or smaller'}, {status: 400});
    }

    const ext = fileExt(file.type);
    const now = new Date().toISOString();
    const photoId = `P-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
    const path = `leads/${id}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const {error: uploadError} = await db.storage
      .from(BUCKET)
      .upload(path, buf, {contentType: file.type, upsert: false});
    if (uploadError) throw uploadError;

    const {data: urlData} = db.storage.from(BUCKET).getPublicUrl(path);
    const actor = dmtActor(auth.me);
    const {data, error} = await db
      .from('dmt_lead_inventory_photos')
      .insert({
        id: photoId,
        lead_id: id,
        photo_url: urlData.publicUrl,
        thumbnail_url: null,
        ai_analyzed: false,
        user_notes: '',
        created_at: now,
        created_by: actor,
        updated_at: now,
        updated_by: actor
      })
      .select()
      .single();
    if (error) throw error;

    void analyzeLeadInventoryPhoto({leadId: id, photoId}).catch(() => undefined);
    return NextResponse.json({photo: photoFromDb(data)}, {status: 201});
  } catch (error) {
    return jsonError(error);
  }
}
