import {NextResponse, type NextRequest} from 'next/server';
import {createHash, randomBytes} from 'node:crypto';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('sazeo_developers')
    .select('id, name, email, notes, disabled_at, created_at')
    .order('created_at', {ascending: false});

  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({developers: data ?? []});
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: {name?: unknown; email?: unknown; notes?: unknown};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'invalid json'}, {status: 400});
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({error: 'name required'}, {status: 400});
  const email = typeof body.email === 'string' ? body.email.trim() || null : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;

  const token = `sz_${randomBytes(24).toString('hex')}`;
  const tokenHash = sha256Hex(token);

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('sazeo_developers')
    .insert({name, email, notes, token_hash: tokenHash})
    .select('id, name, email, notes, created_at')
    .single();

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({
    developer: data,
    token,
    note: 'store this token — it is only shown once. the developer uses it as CLAUDE_TRACKER_TOKEN.'
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: {id?: unknown; disabled?: unknown; notes?: unknown};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'invalid json'}, {status: 400});
  }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({error: 'id required'}, {status: 400});

  const patch: Record<string, unknown> = {};
  if (typeof body.disabled === 'boolean') {
    patch.disabled_at = body.disabled ? new Date().toISOString() : null;
  }
  if (typeof body.notes === 'string') patch.notes = body.notes.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({error: 'nothing to update'}, {status: 400});
  }

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('sazeo_developers')
    .update(patch)
    .eq('id', id)
    .select('id, name, email, notes, disabled_at, created_at')
    .single();

  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({developer: data});
}
