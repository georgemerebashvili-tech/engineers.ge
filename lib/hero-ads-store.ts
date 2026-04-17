import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/admin';
import {getDefaultHeroAdSlots, normalizeHeroAdSlots, type HeroAdSlot} from './hero-ads';

export async function getHeroAdSlots(): Promise<HeroAdSlot[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('hero_ad_slots')
      .select(
        'slot_key,display_name,label,sublabel,image_url,client_name,price_gel,occupied_until,is_ad_slot,format_hint,size_hint'
      );

    if (error) throw error;
    return normalizeHeroAdSlots((data ?? []) as Partial<HeroAdSlot>[]);
  } catch {
    return getDefaultHeroAdSlots();
  }
}
