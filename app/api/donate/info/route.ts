import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Bank = {
  name: string;
  iban: string;
  account?: string | null;
  code?: 'bog' | 'tbc' | 'other' | null;
  pay_link?: string | null;
};

const FALLBACK = {
  recipient_name: '',
  recipient_surname: '',
  banks: [] as Bank[]
};

function normalizeBanks(raw: unknown): Bank[] {
  if (!Array.isArray(raw)) return [];
  const out: Bank[] = [];
  for (const b of raw) {
    if (typeof b !== 'object' || b === null) continue;
    const x = b as Record<string, unknown>;
    const name = typeof x.name === 'string' ? x.name : '';
    const iban = typeof x.iban === 'string' ? x.iban : '';
    if (!name || !iban) continue;
    const account = typeof x.account === 'string' ? x.account : null;
    let code: Bank['code'] = null;
    if (x.code === 'bog' || x.code === 'tbc' || x.code === 'other') {
      code = x.code;
    }
    const pay_link = typeof x.pay_link === 'string' ? x.pay_link : null;
    out.push({name, iban, account, code, pay_link});
  }
  return out;
}

export async function GET() {
  try {
    const {data, error} = await supabaseAdmin()
      .from('donation_settings')
      .select('recipient_name,recipient_surname,banks')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json(FALLBACK);
    return NextResponse.json({
      recipient_name: data.recipient_name ?? '',
      recipient_surname: data.recipient_surname ?? '',
      banks: normalizeBanks(data.banks)
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
