import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';
import {
  generate4CharPassword,
  sendOnboardingEmail
} from '@/lib/tbc/otp-password';

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
      'id, username, email, display_name, role, is_static, active, created_at, created_by, last_login_at'
    )
    .order('created_at', {ascending: false});

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({users: res.data || []});
}

const CreateBody = z.object({
  username: z.string().min(3).max(64).regex(/^[a-z0-9_\-.]+$/),
  // Email is REQUIRED so the auto-generated password can be delivered.
  email: z.string().email().max(256),
  display_name: z.string().max(128).optional(),
  role: z.enum(['admin', 'user']).optional(),
  // Optional explicit password (bypasses auto-generation). Sent to user anyway.
  password: z.string().min(4).max(128).optional()
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

  const tempPassword = parsed.data.password || generate4CharPassword();
  const hash = await bcrypt.hash(tempPassword, 10);
  const email = parsed.data.email.trim().toLowerCase();

  const ins = await db
    .from('tbc_users')
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
    .select('id, username, email, display_name, role, active, created_at')
    .single();

  if (ins.error) {
    console.error('[tbc] user create', ins.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  // Fire onboarding email with the plaintext password + login link.
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host') || 'engineers.ge';
  const loginUrl = `${proto}://${host}/tbc`;

  const mail = await sendOnboardingEmail({
    to: email,
    username,
    displayName: parsed.data.display_name || null,
    tempPassword,
    loginUrl
  });

  await writeAudit({
    actor: session.username,
    action: 'user.create',
    targetType: 'user',
    targetId: ins.data.id as string,
    summary: `დაამატა მომხმარებელი "${ins.data.username}" (${ins.data.role}) + ${mail.ok ? 'onboarding email' : 'onboarding email FAILED'}`,
    metadata: {
      username: ins.data.username,
      role: ins.data.role,
      email: ins.data.email,
      display_name: ins.data.display_name,
      email_sent: mail.ok,
      email_stubbed: 'stubbed' in mail ? mail.stubbed : false
    }
  });

  return NextResponse.json({
    ok: true,
    user: ins.data,
    email_sent: mail.ok,
    stubbed: 'stubbed' in mail ? mail.stubbed : false,
    // Expose plaintext only when email stubbed (dev / no RESEND_API_KEY).
    temp_password: 'stubbed' in mail && mail.stubbed ? tempPassword : undefined
  });
}
