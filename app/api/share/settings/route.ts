import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ShareSettings = {
  facebook: boolean;
  x: boolean;
  linkedin: boolean;
  telegram: boolean;
  whatsapp: boolean;
  copy_link: boolean;
};

const DEFAULTS: ShareSettings = {
  facebook: true,
  x: true,
  linkedin: true,
  telegram: true,
  whatsapp: true,
  copy_link: true
};

export async function GET() {
  try {
    const {data, error} = await supabaseAdmin()
      .from('share_settings')
      .select('facebook,x,linkedin,telegram,whatsapp,copy_link')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json(DEFAULTS);
    return NextResponse.json({
      facebook: data.facebook ?? true,
      x: data.x ?? true,
      linkedin: data.linkedin ?? true,
      telegram: data.telegram ?? true,
      whatsapp: data.whatsapp ?? true,
      copy_link: data.copy_link ?? true
    });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}
