import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  try {
    const {data: offer, error} = await supabaseAdmin()
      .from('dmt_offers')
      .select('id, pdf_url, doc_number')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!offer?.pdf_url) return NextResponse.json({error: 'pdf not found'}, {status: 404});

    const res = await fetch(String(offer.pdf_url));
    if (!res.ok) return NextResponse.json({error: `pdf fetch failed: ${res.status}`}, {status: 502});
    const bytes = Buffer.from(await res.arrayBuffer());
    const filename = `DMT-${id}-${offer.doc_number ?? 'offer'}.pdf`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="${filename}"`,
        'cache-control': 'private, max-age=60'
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
