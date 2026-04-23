import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeConstructionAudit} from '@/lib/construction/audit';
import {
  generateConstructionPassword,
  sendConstructionOnboardingEmail
} from '@/lib/construction/otp-password';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const res = await db
    .from('construction_users')
    .select('id, username, email, display_name, role, is_static, active, created_at, created_by, last_login_at')
    .order('created_at', {ascending: false});

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({users: res.data || []});
}

const CreateBody = z.object({
  username: z.string().min(3).max(64).regex(/^[a-z0-9_\-.]+$/),
  email: z.string().email().max(256),
  display_name: z.string().max(128).optional(),
  role: z.enum(['admin', 'user']).optional(),
  password: z.string().min(4).max(128).optional()
});

export async function POST(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request', details: parsed.error.flatten()}, {status: 400});
  }

  const db = supabaseAdmin();
  const username = parsed.data.username.trim().toLowerCase();

  const existing = await db.from('construction_users').select('id').eq('username', username).maybeSingle();
  if (existing.data) return NextResponse.json({error: 'username_taken'}, {status: 409});

  const tempPassword = parsed.data.password || generateConstructionPassword();
  const hash = await bcrypt.hash(tempPassword, 10);
  const email = parsed.data.email.trim().toLowerCase();

  const ins = await db
    .from('construction_users')
    .insert({
      username,
      password_hash: hash,
      display_name: parsed.data.display_name || null,
      email,
      role: parsed.data.role || 'user',
      is_static: false,
      active: true,
      created_by: session.username
    })
    .select('id, username, display_name')
    .single();

  if (ins.error || !ins.data) return NextResponse.json({error: 'db_error'}, {status: 500});

  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || 'engineers.ge';
  const loginUrl = `${proto}://${host}/construction`;

  const mail = await sendConstructionOnboardingEmail({
    to: email,
    username,
    displayName: parsed.data.display_name || null,
    tempPassword,
    loginUrl
  });

  await writeConstructionAudit({
    actor: session.username,
    action: 'user.create',
    targetType: 'user',
    targetId: ins.data.id as string,
    summary: `შექმნა მომხმარებელი "${username}" + ${mail.ok ? 'მეილი გაიგზავნა' : 'მეილი ვერ გაიგზავნა'}`,
    metadata: {username, role: parsed.data.role || 'user', email_sent: mail.ok}
  });

  return NextResponse.json({
    ok: true,
    user: ins.data,
    email_sent: mail.ok,
    stubbed: 'stubbed' in mail ? mail.stubbed : false,
    temp_password: 'stubbed' in mail && mail.stubbed ? tempPassword : undefined
  });
}
