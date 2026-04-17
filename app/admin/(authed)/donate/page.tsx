import {supabaseAdmin} from '@/lib/supabase/admin';
import {DonateSettingsForm} from './form';

export const dynamic = 'force-dynamic';

type Bank = {
  name: string;
  iban: string;
  account?: string | null;
  code?: 'bog' | 'tbc' | 'other' | null;
  pay_link?: string | null;
};

export default async function AdminDonatePage() {
  let initial = {
    recipient_name: '',
    recipient_surname: '',
    banks: [] as Bank[]
  };

  try {
    const {data} = await supabaseAdmin()
      .from('donation_settings')
      .select('recipient_name,recipient_surname,banks')
      .eq('id', 1)
      .maybeSingle();
    if (data) {
      initial = {
        recipient_name: data.recipient_name ?? '',
        recipient_surname: data.recipient_surname ?? '',
        banks: Array.isArray(data.banks) ? (data.banks as Bank[]) : []
      };
    }
  } catch {
    // Supabase not configured yet — form starts empty.
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Donate settings</h1>
        <p className="text-sm text-fg-muted">
          მიმღების მონაცემები და საბანკო რეკვიზიტები — მოჩანს public დონაციის
          ფანჯარაზე (NavBar → დონაცია).
        </p>
      </div>
      <DonateSettingsForm initial={initial} />
    </div>
  );
}
