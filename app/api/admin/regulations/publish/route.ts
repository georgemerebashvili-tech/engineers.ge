import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {getIp, logAdminAction} from '@/lib/admin-audit';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  source_id: z.coerce.number().int().positive(),
  snapshot_id: z.coerce.number().int().positive(),
  review_note: z.string().max(500).default('')
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    return NextResponse.json({error: 'bad body', detail: String(error)}, {status: 400});
  }

  try {
    const admin = supabaseAdmin();
    const {data: snapshot, error: snapshotError} = await admin
      .from('regulation_source_snapshots')
      .select('id,source_id,content_hash,excerpt')
      .eq('id', body.snapshot_id)
      .eq('source_id', body.source_id)
      .single();

    if (snapshotError || !snapshot) throw snapshotError ?? new Error('snapshot not found');

    const now = new Date().toISOString();

    const {error: sourceError} = await admin
      .from('regulation_sources')
      .update({
        published_hash: snapshot.content_hash,
        published_excerpt: snapshot.excerpt,
        published_snapshot_id: snapshot.id,
        published_at: now,
        updated_at: now
      })
      .eq('id', body.source_id);
    if (sourceError) throw sourceError;

    const {error: clearPublishedError} = await admin
      .from('regulation_source_snapshots')
      .update({published: false})
      .eq('source_id', body.source_id)
      .eq('published', true);
    if (clearPublishedError) throw clearPublishedError;

    const {error: markSnapshotError} = await admin
      .from('regulation_source_snapshots')
      .update({
        approved_at: now,
        approved_by: session.user,
        published: true,
        published_at: now,
        review_note: body.review_note
      })
      .eq('id', body.snapshot_id)
      .eq('source_id', body.source_id);
    if (markSnapshotError) throw markSnapshotError;

    await logAdminAction({
      actor: session.user,
      action: 'regulation.publish',
      target_type: 'regulation_sources',
      target_id: String(body.source_id),
      metadata: {
        snapshot_id: body.snapshot_id,
        review_note: body.review_note || null
      },
      ip: getIp(req.headers)
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('[admin/regulations/publish] failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}
