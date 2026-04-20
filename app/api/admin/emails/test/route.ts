import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {EMAIL_TEMPLATES, type EmailTemplateKey} from '@/lib/email-templates';
import {sendEmail} from '@/lib/email-admin';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  template: z.enum(['welcome', 'bug-report', 'verify-email'])
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const templateKey: EmailTemplateKey = parsed.data.template;
  const {subject, html} = EMAIL_TEMPLATES[templateKey].render();

  const to = process.env.ADMIN_EMAIL;
  const hasKey = !!process.env.RESEND_API_KEY;
  const stubbed = !to || !hasKey;

  await sendEmail({
    to,
    subject: `[TEST] ${subject}`,
    html,
    context: `email-test:${templateKey}`
  });

  await logAdminAction({
    actor: session.user,
    action: 'email.test_send',
    target_type: 'email_template',
    target_id: templateKey,
    metadata: {stubbed, to: stubbed ? null : to},
    ip: getIp(req.headers)
  });

  return NextResponse.json({ok: true, stubbed});
}
