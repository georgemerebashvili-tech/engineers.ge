export const HERO_OWNER_NAME = 'გიორგი მერებაშვილი';

export type HeroOwner = {
  image_url: string;
  name: string;
  title: string;
  bio: string;
};

export const HERO_OWNER_DEFAULTS: HeroOwner = {
  image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=75',
  name: HERO_OWNER_NAME,
  title: 'HVAC ინჟინერი · ენტერპრენერი',
  bio: 'გამარჯობა! მე ვარ გიორგი მერებაშვილი — HVAC ინჟინერი და engineers.ge-ის დამფუძნებელი. 10+ წელი ვმუშაობ საინჟინრო პროექტებზე — თბოდანაკარგების გაანგარიშება, ვენტილაციის სისტემის დიზაინი, შენობის ენერგოეფექტურობა. ეს პლატფორმა ქართველი ინჟინრების კოლექტიური ხელსაწყოა: უფასო კალკულატორები EN 12831, ISO 6946 და ASHRAE სტანდარტებით. ჩემი მიზანია გავხადო ქართული ენგინიერინგი უფრო სწრაფი, ზუსტი და ხელმისაწვდომი.'
};

export function normalizeHeroOwner(row: Partial<HeroOwner> | null | undefined): HeroOwner {
  return {
    image_url: row?.image_url?.trim() || HERO_OWNER_DEFAULTS.image_url,
    name: row?.name?.trim() || HERO_OWNER_DEFAULTS.name,
    title: row?.title?.trim() || HERO_OWNER_DEFAULTS.title,
    bio: row?.bio?.trim() || HERO_OWNER_DEFAULTS.bio
  };
}

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
  contact_phone: string;
  promo_badge: string;
  price_gel: number;
  occupied_until: string | null;
  is_ad_slot: boolean;
  format_hint: string;
  size_hint: string;
};

export const HERO_AD_PAYMENT_STATUSES = [
  'draft',
  'sent',
  'paid',
  'cancelled'
] as const;

export type HeroAdPaymentStatus = (typeof HERO_AD_PAYMENT_STATUSES)[number];

export type HeroAdPaymentViewStatus =
  | HeroAdPaymentStatus
  | 'overdue';

export type HeroAdPayment = {
  id: number;
  slot_key: HeroSlotKey;
  client_name: string;
  invoice_no: string;
  amount_gel: number;
  status: HeroAdPaymentStatus;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export const HERO_AD_UPLOAD_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected'
] as const;

export type HeroAdUploadRequestStatus = (typeof HERO_AD_UPLOAD_REQUEST_STATUSES)[number];

export type HeroAdUploadRequest = {
  id: number;
  slot_key: HeroSlotKey;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  note: string;
  asset_url: string;
  asset_path: string;
  status: HeroAdUploadRequestStatus;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SlotSpec = Omit<
  HeroAdSlot,
  'client_name' | 'contact_phone' | 'promo_badge' | 'price_gel' | 'occupied_until' | 'link_url'
> & {
  default_client_name: string;
  default_contact_phone: string;
  default_promo_badge: string;
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
    default_contact_phone: '',
    default_promo_badge: '',
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
    default_contact_phone: '+995599000001',
    default_promo_badge: 'SALE',
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
    default_contact_phone: '+995599000002',
    default_promo_badge: '-10%',
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
    default_contact_phone: '+995599000003',
    default_promo_badge: '',
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
    default_contact_phone: '+995599000004',
    default_promo_badge: 'NEW',
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
    default_contact_phone: '+995599000005',
    default_promo_badge: '',
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
    default_contact_phone: '+995599000006',
    default_promo_badge: 'TOP',
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
    default_contact_phone: '+995599000007',
    default_promo_badge: '',
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
      contact_phone: spec.default_contact_phone,
      promo_badge: spec.default_promo_badge,
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
      contact_phone: row?.contact_phone?.trim() || '',
      promo_badge: row?.promo_badge?.trim() || '',
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

export function isHeroSlotExpired(
  slot: Pick<HeroAdSlot, 'occupied_until' | 'is_ad_slot'>,
  now: Date = new Date()
): boolean {
  if (!slot.is_ad_slot) return false;
  if (!slot.occupied_until) return false;
  const until = new Date(slot.occupied_until);
  if (Number.isNaN(until.getTime())) return false;
  // Treat end-of-day as still valid — expire at 00:00 of the following day
  const endOfDay = new Date(
    Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate(), 23, 59, 59)
  );
  return now.getTime() > endOfDay.getTime();
}

export function toWhatsAppHref(phone: string | null | undefined): string | null {
  const normalized = (phone ?? '').replace(/[^\d+]/g, '');
  const digitsOnly = normalized.replace(/\D/g, '');
  if (!digitsOnly) return null;
  const target = normalized.startsWith('+') ? digitsOnly : digitsOnly;
  return `https://wa.me/${target}`;
}

export function normalizeHeroAdPayments(
  rows: Partial<HeroAdPayment>[] | null | undefined
): HeroAdPayment[] {
  const list: HeroAdPayment[] = [];

  for (const row of rows ?? []) {
    const key = row.slot_key;
    if (!key || !HERO_SLOT_KEYS.includes(key)) continue;

    const rawStatus = row.status;
    const status = HERO_AD_PAYMENT_STATUSES.includes(rawStatus as HeroAdPaymentStatus)
      ? (rawStatus as HeroAdPaymentStatus)
      : 'draft';

    list.push({
      id:
        typeof row.id === 'number' && Number.isFinite(row.id)
          ? row.id
          : Number(row.id ?? 0) || 0,
      slot_key: key,
      client_name: row.client_name?.trim() || '',
      invoice_no: row.invoice_no?.trim() || '',
      amount_gel:
        typeof row.amount_gel === 'number' && Number.isFinite(row.amount_gel)
          ? row.amount_gel
          : Number(row.amount_gel ?? 0) || 0,
      status,
      period_start: normalizeDateValue(row.period_start),
      period_end: normalizeDateValue(row.period_end),
      due_date: normalizeDateValue(row.due_date),
      paid_at: normalizeDateValue(row.paid_at),
      note: row.note?.trim() || '',
      created_at: row.created_at || new Date(0).toISOString(),
      updated_at: row.updated_at || new Date(0).toISOString()
    });
  }

  return list.sort((a, b) => {
    const aTime = dateSortValue(a.period_end ?? a.due_date ?? a.created_at);
    const bTime = dateSortValue(b.period_end ?? b.due_date ?? b.created_at);
    return bTime - aTime;
  });
}

export function getHeroAdPaymentStatus(
  payment: HeroAdPayment,
  now: Date = new Date()
): HeroAdPaymentViewStatus {
  if (payment.status === 'paid' || payment.status === 'cancelled' || payment.status === 'draft') {
    return payment.status;
  }

  const due = parseIsoDate(payment.due_date);
  if (!due) return payment.status;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return due.getTime() < today ? 'overdue' : payment.status;
}

export function summarizeHeroAdPayments(
  payments: HeroAdPayment[],
  now: Date = new Date()
) {
  const paidUntilBySlot: Partial<Record<HeroSlotKey, string | null>> = {};
  let outstandingAmount = 0;
  let outstandingCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let paidAmount = 0;
  let paidCount = 0;
  const soonLimit = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7);

  for (const payment of payments) {
    const status = getHeroAdPaymentStatus(payment, now);
    const due = parseIsoDate(payment.due_date);
    const dueTime = due?.getTime() ?? null;

    if (status === 'paid') {
      paidAmount += payment.amount_gel;
      paidCount += 1;
      const currentPaidUntil = paidUntilBySlot[payment.slot_key];
      if (!currentPaidUntil || dateSortValue(payment.period_end) > dateSortValue(currentPaidUntil)) {
        paidUntilBySlot[payment.slot_key] = payment.period_end;
      }
      continue;
    }

    if (status === 'cancelled') continue;

    outstandingAmount += payment.amount_gel;
    outstandingCount += 1;

    if (status === 'overdue') {
      overdueAmount += payment.amount_gel;
      overdueCount += 1;
    } else if (dueTime !== null && dueTime <= soonLimit) {
      dueSoonCount += 1;
    }
  }

  return {
    outstandingAmount,
    outstandingCount,
    overdueAmount,
    overdueCount,
    dueSoonCount,
    paidAmount,
    paidCount,
    paidUntilBySlot
  };
}

export function normalizeHeroAdUploadRequests(
  rows: Partial<HeroAdUploadRequest>[] | null | undefined
): HeroAdUploadRequest[] {
  const list: HeroAdUploadRequest[] = [];

  for (const row of rows ?? []) {
    const key = row.slot_key;
    if (!key || !HERO_SLOT_KEYS.includes(key)) continue;

    const rawStatus = row.status;
    const status = HERO_AD_UPLOAD_REQUEST_STATUSES.includes(
      rawStatus as HeroAdUploadRequestStatus
    )
      ? (rawStatus as HeroAdUploadRequestStatus)
      : 'pending';

    list.push({
      id:
        typeof row.id === 'number' && Number.isFinite(row.id)
          ? row.id
          : Number(row.id ?? 0) || 0,
      slot_key: key,
      company_name: row.company_name?.trim() || '',
      contact_name: row.contact_name?.trim() || '',
      contact_email: row.contact_email?.trim() || '',
      contact_phone: row.contact_phone?.trim() || '',
      note: row.note?.trim() || '',
      asset_url: row.asset_url?.trim() || '',
      asset_path: row.asset_path?.trim() || '',
      status,
      review_note: row.review_note?.trim() || '',
      reviewed_by: row.reviewed_by?.trim() || null,
      reviewed_at: row.reviewed_at || null,
      created_at: row.created_at || new Date(0).toISOString(),
      updated_at: row.updated_at || new Date(0).toISOString()
    });
  }

  return list.sort((a, b) => dateSortValue(b.created_at) - dateSortValue(a.created_at));
}

function normalizeDateValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateSortValue(value: string | null | undefined): number {
  const date = parseIsoDate(value);
  if (date) return date.getTime();
  const fallback = new Date(value ?? '');
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}
