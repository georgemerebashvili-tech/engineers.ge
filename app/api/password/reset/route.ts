import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {consumeResetToken} from '@/lib/password-reset';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(200)
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  try {
    const result = await consumeResetToken(body.token, body.password);
    if (!result.ok) {
      const msgMap: Record<string, string> = {
        not_found: 'ბმული არასწორია.',
        already_used: 'ეს ბმული უკვე გამოყენებულია.',
        expired: 'ბმული ვადაგასულია. მოითხოვე ახალი.',
        db: 'შეცდომა. სცადე კვლავ.'
      };
      return NextResponse.json(
        {error: result.reason, message: msgMap[result.reason]},
        {status: result.reason === 'db' ? 500 : 400}
      );
    }
    return NextResponse.json({ok: true, email: result.email});
  } catch (e) {
    return NextResponse.json(
      {error: 'server', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
