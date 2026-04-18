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

const DEFAULT_HEADING = 'მხარდაჭერა';
const DEFAULT_DESCRIPTION =
  'engineers.ge უფასოა ყველასთვის. ყოველი ლარი გვეხმარება ახალი ინსტრუმენტების და ქართული საინჟინრო კონტენტის აშენებაში.';
const DEFAULT_AD_LONG = 'იშოვე 3000 ლარამდე';
const DEFAULT_AD_SHORT = '3000 ₾';

const FALLBACK = {
  recipient_name: '',
  recipient_surname: '',
  banks: [] as Bank[],
  heading_text: DEFAULT_HEADING,
  description_text: DEFAULT_DESCRIPTION,
  ad_visible: true,
  ad_text_long: DEFAULT_AD_LONG,
  ad_text_short: DEFAULT_AD_SHORT
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
      .select(
        'recipient_name,recipient_surname,banks,heading_text,description_text,ad_visible,ad_text_long,ad_text_short'
      )
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json(FALLBACK);
    return NextResponse.json({
      recipient_name: data.recipient_name ?? '',
      recipient_surname: data.recipient_surname ?? '',
      banks: normalizeBanks(data.banks),
      heading_text: data.heading_text ?? DEFAULT_HEADING,
      description_text: data.description_text ?? DEFAULT_DESCRIPTION,
      ad_visible: data.ad_visible ?? true,
      ad_text_long: data.ad_text_long ?? DEFAULT_AD_LONG,
      ad_text_short: data.ad_text_short ?? DEFAULT_AD_SHORT
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
