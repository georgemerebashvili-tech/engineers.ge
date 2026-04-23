import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {cleanIban} from '@/lib/construction/bog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const {data} = await db.from('construction_bog_config').select('*').order('id').limit(1).maybeSingle();

  if (!data) return NextResponse.json({configured: false});

  return NextResponse.json({
    configured: true,
    client_id: data.client_id,
    client_secret_masked: '••••' + data.client_secret.slice(-4),
    account_iban: data.account_iban,
    account_currency: data.account_currency,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
  });
}

export async function POST(req: Request) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const body = await req.json();
  const {client_id, client_secret, account_iban, account_currency = 'GEL'} = body;

  if (!client_id?.trim() || !client_secret?.trim() || !account_iban?.trim()) {
    return NextResponse.json({error: 'client_id, client_secret, account_iban სავალდებულოა'}, {status: 400});
  }

  const safeIban = cleanIban(account_iban);

  const db = supabaseAdmin();
  const existing = await db.from('construction_bog_config').select('id').limit(1).maybeSingle();

  let err;
  if (existing.data) {
    ({error: err} = await db.from('construction_bog_config').update({
      client_id: client_id.trim(),
      client_secret: client_secret.trim(),
      account_iban: safeIban,
      account_currency: account_currency.trim() || 'GEL',
      updated_at: new Date().toISOString(),
      updated_by: session.username,
    }).eq('id', existing.data.id));
  } else {
    ({error: err} = await db.from('construction_bog_config').insert({
      client_id: client_id.trim(),
      client_secret: client_secret.trim(),
      account_iban: safeIban,
      account_currency: account_currency.trim() || 'GEL',
      updated_by: session.username,
    }));
  }

  if (err) return NextResponse.json({error: err.message}, {status: 500});
  return NextResponse.json({ok: true});
}
