import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {contactFromDb, contactToDb, dmtActor, jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const contacts = Array.isArray(body) ? body : Array.isArray(body?.contacts) ? body.contacts : [];
  if (!contacts.length) return NextResponse.json({contacts: []}, {status: 201});

  const {data, error} = await supabaseAdmin()
    .from('dmt_contacts')
    .upsert(contacts.map((contact: Record<string, unknown>) => contactToDb(contact, dmtActor(auth.me))), {
      onConflict: 'id',
      ignoreDuplicates: true,
    })
    .select();

  if (error) return jsonError(error);
  return NextResponse.json({contacts: (data ?? []).map(contactFromDb)}, {status: 201});
}
