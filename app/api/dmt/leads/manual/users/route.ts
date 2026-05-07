import {NextResponse} from 'next/server';
import {z} from 'zod';
import {
  DMT_MANUAL_LEADS_TAB_COLORS,
  getCurrentDmtUser,
  listDmtUsers,
  updateDmtUserSettings
} from '@/lib/dmt/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  manualLeadsTabColor: z.enum(DMT_MANUAL_LEADS_TAB_COLORS)
});

export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const users = (await listDmtUsers())
    .filter((user) => user.status === 'active')
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      settings: user.settings
    }));

  return NextResponse.json({
    users,
    me: {
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role,
      settings: me.settings
    }
  });
}

export async function PATCH(req: Request) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  try {
    const settings = await updateDmtUserSettings(me.id, parsed.data);
    return NextResponse.json({ok: true, settings});
  } catch (error) {
    return NextResponse.json(
      {
        error: 'settings_update_failed',
        message: error instanceof Error ? error.message : 'unknown'
      },
      {status: 500}
    );
  }
}
