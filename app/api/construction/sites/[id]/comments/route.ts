import {NextResponse} from 'next/server';
import {getConstructionSession, canAccessConstructionSite} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const VALID_KINDS = new Set(['note', 'blocker', 'info', 'done']);

export async function GET(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const siteId = parseInt(id, 10);
  if (isNaN(siteId)) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessConstructionSite(db, session, siteId))) {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }

  const {data, error} = await db
    .from('construction_site_comments')
    .select('id, site_id, author, kind, body, created_at')
    .eq('site_id', siteId)
    .order('created_at', {ascending: false});

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({comments: data || []});
}

export async function POST(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const siteId = parseInt(id, 10);
  if (isNaN(siteId)) return NextResponse.json({error: 'bad_request'}, {status: 400});

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const {kind, body: text} = body as {kind?: string; body?: string};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const safeKind = VALID_KINDS.has(kind || '') ? (kind as string) : 'note';

  const db = supabaseAdmin();
  if (!(await canAccessConstructionSite(db, session, siteId))) {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }

  const {data, error} = await db
    .from('construction_site_comments')
    .insert({
      site_id: siteId,
      author: session.displayName || session.username,
      kind: safeKind,
      body: text.trim()
    })
    .select('id, site_id, author, kind, body, created_at')
    .single();

  if (error || !data) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true, comment: data});
}
