export const HERO_OWNER_NAME = 'გიორგი მერებაშვილი';

export const HERO_SLOT_KEYS = [
  'site',
  'cta',
  'slogan',
  'business',
  'childhood',
  'b1',
  'b2',
  'b3'
] as const;

export type HeroSlotKey = (typeof HERO_SLOT_KEYS)[number];

export type HeroAdSlot = {
  slot_key: HeroSlotKey;
  display_name: string;
  label: string;
  sublabel: string;
  image_url: string;
  link_url: string;
  client_name: string;
  price_gel: number;
  occupied_until: string | null;
  is_ad_slot: boolean;
  format_hint: string;
  size_hint: string;
};

type SlotSpec = Omit<
  HeroAdSlot,
  'client_name' | 'price_gel' | 'occupied_until' | 'link_url'
> & {
  default_client_name: string;
  default_price_gel: number;
  default_occupied_until: string | null;
  default_link_url: string;
};

/*
Upload guidance table
| slot      | format              | recommended size |
|-----------|---------------------|------------------|
| site      | JPG / PNG / WEBP    | 544 x 280 px     |
| cta       | JPG / PNG / WEBP    | 532 x 712 px     |
| slogan    | JPG / PNG / WEBP    | 488 x 200 px     |
| business  | JPG / PNG / WEBP    | 488 x 232 px     |
| childhood | JPG / PNG / WEBP    | 488 x 280 px     |
| b1        | JPG / PNG / WEBP    | 340 x 432 px     |
| b2        | JPG / PNG / WEBP    | 296 x 712 px     |
| b3        | JPG / PNG / WEBP    | 340 x 280 px     |
*/
export const HERO_SLOT_SPECS: Record<HeroSlotKey, SlotSpec> = {
  site: {
    slot_key: 'site',
    display_name: 'კომპანია 1',
    label: 'კომპანია 1',
    sublabel: 'კომენტარი 1',
    image_url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=70',
    is_ad_slot: false,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '544 × 280 px',
    default_client_name: 'კომპანია 1',
    default_price_gel: 0,
    default_occupied_until: null,
    default_link_url: ''
  },
  cta: {
    slot_key: 'cta',
    display_name: 'კომპანია 2',
    label: 'კომპანია 2',
    sublabel: 'კომენტარი 2',
    image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=70',
    is_ad_slot: true,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '532 × 712 px',
    default_client_name: 'კომპანია 2',
    default_price_gel: 300,
    default_occupied_until: '2026-05-30',
    default_link_url: 'https://example.com'
  },
  slogan: {
    slot_key: 'slogan',
    display_name: 'კომპანია 3',
    label: 'კომპანია 3',
    sublabel: 'კომენტარი 3',
    image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=70',
    is_ad_slot: true,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '488 × 200 px',
    default_client_name: 'კომპანია 3',
    default_price_gel: 300,
    default_occupied_until: '2026-05-12',
    default_link_url: ''
  },
  business: {
    slot_key: 'business',
    display_name: 'კომპანია 4',
    label: 'კომპანია 4',
    sublabel: 'კომენტარი 4',
    image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&q=70',
    is_ad_slot: true,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '488 × 232 px',
    default_client_name: 'კომპანია 4',
    default_price_gel: 300,
    default_occupied_until: '2026-06-08',
    default_link_url: ''
  },
  childhood: {
    slot_key: 'childhood',
    display_name: 'კომპანია 5',
    label: 'კომპანია 5',
    sublabel: 'კომენტარი 5',
    image_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=70',
    is_ad_slot: true,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '488 × 280 px',
    default_client_name: 'კომპანია 5',
    default_price_gel: 300,
    default_occupied_until: '2026-06-20',
    default_link_url: ''
  },
  b1: {
    slot_key: 'b1',
    display_name: 'კომპანია 6',
    label: 'კომპანია 6',
    sublabel: 'კომენტარი 6',
    image_url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=900&q=70',
    is_ad_slot: true,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '340 × 432 px',
    default_client_name: 'კომპანია 6',
    default_price_gel: 300,
    default_occupied_until: '2026-05-25',
    default_link_url: ''
  },
  b2: {
    slot_key: 'b2',
    display_name: 'კომპანია 7',
    label: 'კომპანია 7',
    sublabel: 'კომენტარი 7',
    image_url: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=900&q=70',
    is_ad_slot: true,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '296 × 712 px',
    default_client_name: 'კომპანია 7',
    default_price_gel: 300,
    default_occupied_until: '2026-07-01',
    default_link_url: ''
  },
  b3: {
    slot_key: 'b3',
    display_name: 'კომპანია 8',
    label: 'კომპანია 8',
    sublabel: 'კომენტარი 8',
    image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=70',
    is_ad_slot: true,
    format_hint: 'JPG / PNG / WEBP',
    size_hint: '340 × 280 px',
    default_client_name: 'კომპანია 8',
    default_price_gel: 300,
    default_occupied_until: '2026-05-18',
    default_link_url: ''
  }
};

export function getDefaultHeroAdSlots(): HeroAdSlot[] {
  return HERO_SLOT_KEYS.map((key) => {
    const spec = HERO_SLOT_SPECS[key];
    return {
      slot_key: key,
      display_name: spec.display_name,
      label: spec.label,
      sublabel: spec.sublabel,
      image_url: spec.image_url,
      link_url: spec.default_link_url,
      client_name: spec.default_client_name,
      price_gel: spec.default_price_gel,
      occupied_until: spec.default_occupied_until,
      is_ad_slot: spec.is_ad_slot,
      format_hint: spec.format_hint,
      size_hint: spec.size_hint
    };
  });
}

export function normalizeHeroAdSlots(rows: Partial<HeroAdSlot>[] | null | undefined): HeroAdSlot[] {
  const fallback = getDefaultHeroAdSlots();
  const byKey = new Map<HeroSlotKey, Partial<HeroAdSlot>>();

  for (const row of rows ?? []) {
    const key = row.slot_key;
    if (key && HERO_SLOT_KEYS.includes(key)) {
      byKey.set(key, row);
    }
  }

  return fallback.map((slot) => {
    const row = byKey.get(slot.slot_key);
    return {
      ...slot,
      ...row,
      slot_key: slot.slot_key,
      display_name: row?.display_name?.trim() || slot.display_name,
      label: row?.label?.trim() || slot.label,
      sublabel: row?.sublabel?.trim() || slot.sublabel,
      image_url: row?.image_url?.trim() || slot.image_url,
      link_url: row?.link_url?.trim() || slot.link_url,
      client_name: row?.client_name?.trim() || '',
      price_gel:
        typeof row?.price_gel === 'number' && Number.isFinite(row.price_gel)
          ? row.price_gel
          : slot.price_gel,
      occupied_until: row?.occupied_until || null,
      is_ad_slot: typeof row?.is_ad_slot === 'boolean' ? row.is_ad_slot : slot.is_ad_slot,
      format_hint: row?.format_hint?.trim() || slot.format_hint,
      size_hint: row?.size_hint?.trim() || slot.size_hint
    };
  });
}

export function formatGel(n: number): string {
  const value = Math.max(0, Math.trunc(n));
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatOccupiedUntil(value: string | null | undefined) {
  if (!value) return 'თავისუფალია';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
