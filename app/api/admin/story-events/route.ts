import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {getIp, logAdminAction} from '@/lib/admin-audit';
import {
  deleteStoryEvent,
  getStoryEvents,
  reorderStoryEvents,
  upsertStoryEvent
} from '@/lib/story-timeline-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CURRENT_YEAR = new Date().getFullYear();

const UpsertBody = z.object({
  id: z.string().uuid().optional(),
  year: z.number().int().min(1900).max(CURRENT_YEAR + 5),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  image_url: z.string().max(2000).default(''),
  accent: z.string().max(32).default('#1f6fd4'),
  sort_order: z.number().int().min(0).max(9999).optional()
});

const ReorderBody = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int().min(0).max(9999)
    })
  )
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  try {
    const events = await getStoryEvents();
    return NextResponse.json({events});
  } catch (error) {
    console.error('[admin/story-events] list failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: z.infer<typeof UpsertBody>;
  try {
    body = UpsertBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({error: 'bad body', detail: String(e)}, {status: 400});
  }

  try {
    const event = await upsertStoryEvent(body);
    await logAdminAction({
      actor: session.user,
      action: body.id ? 'story_event.update' : 'story_event.create',
      target_type: 'hero_owner_story_events',
      target_id: event.id,
      metadata: {year: event.year, title: event.title},
      ip: getIp(req.headers)
    });
    return NextResponse.json({event});
  } catch (error) {
    console.error('[admin/story-events] upsert failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({error: 'missing id'}, {status: 400});

  try {
    await deleteStoryEvent(id);
    await logAdminAction({
      actor: session.user,
      action: 'story_event.delete',
      target_type: 'hero_owner_story_events',
      target_id: id,
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('[admin/story-events] delete failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: z.infer<typeof ReorderBody>;
  try {
    body = ReorderBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({error: 'bad body', detail: String(e)}, {status: 400});
  }

  try {
    await reorderStoryEvents(body.orders);
    await logAdminAction({
      actor: session.user,
      action: 'story_event.reorder',
      target_type: 'hero_owner_story_events',
      metadata: {count: body.orders.length},
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('[admin/story-events] reorder failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}
