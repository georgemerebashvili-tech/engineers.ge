import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  HERO_OWNER_DEFAULTS,
  getDefaultHeroAdSlots,
  normalizeHeroAdUploadRequests,
  normalizeHeroAdPayments,
  normalizeHeroAdSlots,
  normalizeHeroOwner,
  type HeroAdUploadRequest,
  type HeroAdPayment,
  type HeroAdSlot,
  type HeroOwner
} from './hero-ads';

export async function getHeroOwner(): Promise<HeroOwner> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('hero_owner')
      .select('image_url,name,title,bio')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    return normalizeHeroOwner((data ?? null) as Partial<HeroOwner> | null);
  } catch {
    return HERO_OWNER_DEFAULTS;
  }
}

export async function getHeroAdSlots(): Promise<HeroAdSlot[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('hero_ad_slots')
      .select(
        'slot_key,display_name,label,sublabel,image_url,link_url,client_name,contact_phone,promo_badge,price_gel,occupied_until,is_ad_slot,format_hint,size_hint'
      );

    if (error) throw error;
    return normalizeHeroAdSlots((data ?? []) as Partial<HeroAdSlot>[]);
  } catch {
    return getDefaultHeroAdSlots();
  }
}

export async function listHeroAdPayments(): Promise<{
  payments: HeroAdPayment[];
  source: 'live' | 'unavailable';
}> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('hero_ad_payments')
      .select(
        'id,slot_key,client_name,invoice_no,amount_gel,status,period_start,period_end,due_date,paid_at,note,created_at,updated_at'
      )
      .order('created_at', {ascending: false});

    if (error) throw error;
    return {
      payments: normalizeHeroAdPayments((data ?? []) as Partial<HeroAdPayment>[]),
      source: 'live'
    };
  } catch {
    return {payments: [], source: 'unavailable'};
  }
}

export async function listHeroAdUploadRequests(): Promise<{
  requests: HeroAdUploadRequest[];
  source: 'live' | 'unavailable';
}> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('hero_ad_upload_requests')
      .select(
        'id,slot_key,company_name,contact_name,contact_email,contact_phone,note,asset_url,asset_path,status,review_note,reviewed_by,reviewed_at,created_at,updated_at'
      )
      .order('created_at', {ascending: false});

    if (error) throw error;
    return {
      requests: normalizeHeroAdUploadRequests((data ?? []) as Partial<HeroAdUploadRequest>[]),
      source: 'live'
    };
  } catch {
    return {requests: [], source: 'unavailable'};
  }
}
