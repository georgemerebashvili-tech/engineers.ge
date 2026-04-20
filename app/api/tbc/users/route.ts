import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const res = await db
    .from('tbc_users')
    .select(
      'id, username, display_name, role, is_static, active, created_at, created_by, last_login_at'
    )
    .order('created_at', {ascending: false});

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({users: res.data || []});
}

const CreateBody = z.object({
  username: z.string().min(3).max(64).regex(/^[a-z0-9_\-.]+$/),
  password: z.string().min(6).max(128),
  display_name: z.string().max(128).optional(),
  role: z.enum(['admin', 'user']).optional()
});

export async function POST(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', details: parsed.error.flatten()},
      {status: 400}
    );
  }

  const db = supabaseAdmin();
  const username = parsed.data.username.trim().toLowerCase();

  const existing = await db
    .from('tbc_users')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (existing.data) {
    return NextResponse.json({error: 'username_taken'}, {status: 409});
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const ins = await db
    .from('tbc_users')
    .insert({
      username,
      password_hash: hash,
      display_name: parsed.data.display_name || null,
      role: parsed.data.role || 'user',
      is_static: false,
      active: true,
      created_by: session.username
    })
    .select('id, username, display_name, role, active, created_at')
    .single();

  if (ins.error) {
    console.error('[tbc] user create', ins.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  return NextResponse.json({ok: true, user: ins.data});
}
