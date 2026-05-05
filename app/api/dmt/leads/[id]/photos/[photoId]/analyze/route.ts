import {NextRequest, NextResponse} from 'next/server';
import {jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';
import {analyzeLeadInventoryPhoto} from '@/lib/dmt/photos-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string; photoId: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id, photoId} = await params;
  const hint = req.nextUrl.searchParams.get('model') === 'sonnet' ? 'sonnet' : 'haiku';
  try {
    const photo = await analyzeLeadInventoryPhoto({leadId: id, photoId, modelHint: hint});
    return NextResponse.json({photo});
  } catch (error) {
    if (error instanceof Error && error.message === 'photo not found') {
      return NextResponse.json({error: 'photo not found'}, {status: 404});
    }
    return jsonError(error);
  }
}
