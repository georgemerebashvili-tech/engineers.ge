import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ShareSettings = {
  visible: boolean;
  intro_text: string;
  facebook: boolean;
  x: boolean;
  linkedin: boolean;
  telegram: boolean;
  whatsapp: boolean;
  copy_link: boolean;
  facebook_url: string;
  x_url: string;
  linkedin_url: string;
  telegram_url: string;
  whatsapp_url: string;
};

const DEFAULTS: ShareSettings = {
  visible: true,
  intro_text: 'აცნობე ყველას 👉',
  facebook: true,
  x: true,
  linkedin: true,
  telegram: true,
  whatsapp: true,
  copy_link: true,
  facebook_url: '',
  x_url: '',
  linkedin_url: '',
  telegram_url: '',
  whatsapp_url: ''
};

export async function GET() {
  try {
    const {data, error} = await supabaseAdmin()
      .from('share_settings')
      .select(
        'visible,intro_text,facebook,x,linkedin,telegram,whatsapp,copy_link,facebook_url,x_url,linkedin_url,telegram_url,whatsapp_url'
      )
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json(DEFAULTS);
    return NextResponse.json({
      visible: data.visible ?? true,
      intro_text: data.intro_text ?? DEFAULTS.intro_text,
      facebook: data.facebook ?? true,
      x: data.x ?? true,
      linkedin: data.linkedin ?? true,
      telegram: data.telegram ?? true,
      whatsapp: data.whatsapp ?? true,
      copy_link: data.copy_link ?? true,
      facebook_url: data.facebook_url ?? '',
      x_url: data.x_url ?? '',
      linkedin_url: data.linkedin_url ?? '',
      telegram_url: data.telegram_url ?? '',
      whatsapp_url: data.whatsapp_url ?? ''
    });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}
