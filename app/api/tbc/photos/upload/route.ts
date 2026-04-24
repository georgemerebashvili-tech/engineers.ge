import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {uploadPhotoPair, uploadSingle} from '@/lib/tbc/photo-storage';

export const dynamic = 'force-dynamic';

const DATA_URL = z.string().regex(/^data:image\/[a-z+]+;base64,/i).max(15_000_000);

const Body = z.object({
  full_b64: DATA_URL,
  thumb_b64: DATA_URL.optional(),
  kind: z.enum(['device', 'situational', 'catalog']).default('device'),
  branch_id: z.union([z.number().int(), z.string()]).optional()
});

export async function POST(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', details: parsed.error.flatten()},
      {status: 400}
    );
  }

  const folderParts: string[] = [parsed.data.kind];
  if (parsed.data.branch_id != null) folderParts.push(`b${parsed.data.branch_id}`);
  const folder = folderParts.join('/');

  if (parsed.data.thumb_b64) {
    const ref = await uploadPhotoPair(parsed.data.full_b64, parsed.data.thumb_b64, folder);
    if (!ref) return NextResponse.json({error: 'upload_failed'}, {status: 500});
    return NextResponse.json({ok: true, ...ref});
  }

  const url = await uploadSingle(parsed.data.full_b64, folder);
  if (!url) return NextResponse.json({error: 'upload_failed'}, {status: 500});
  return NextResponse.json({ok: true, url, thumb_url: url});
}
