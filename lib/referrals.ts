export type ReferralStatus = 'draft' | 'sent' | 'registered' | 'rewarded';

export type ReferralCategory =
  | 'electrical'
  | 'low-voltage'
  | 'mechanical'
  | 'hvac'
  | 'architect'
  | 'student'
  | 'other';

export const CATEGORY_LABELS: Record<ReferralCategory, string> = {
  electrical: 'ელექტრო ინჟინერი',
  'low-voltage': 'სუსტი დენების ინჟინერი',
  mechanical: 'მექანიკური ინჟინერი',
  hvac: 'HVAC ინჟინერი',
  architect: 'არქიტექტორი',
  student: 'სტუდენტი',
  other: 'სხვა'
};

export const HASHTAG_SUGGESTIONS = [
  'ventilation',
  'hvac',
  'electrical',
  'fire-safety',
  'plumbing',
  'bim',
  'cad',
  'bms',
  'energy',
  'heat-load'
];

export type ReferralContact = {
  id: string;
  firstName: string;
  lastName: string;
  category: ReferralCategory;
  tags: string[];
  phone: string;
  phoneDisposable: boolean;
  email: string;
  linkedinUrl: string;
  facebookUrl: string;
  status: ReferralStatus;
  createdAt: number;
  sentAt: number | null;
  registeredAt: number | null;
};

const STORE_KEY = 'eng_referral_contacts_v1';
const REWARD_GEL = 10;
const CAP_GEL = 3000;

export const REWARD_PER_CONTACT_GEL = REWARD_GEL;
export const REWARD_CAP_GEL = CAP_GEL;

export function loadContacts(): ReferralContact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ReferralContact[];
  } catch {
    return [];
  }
}

export function saveContacts(list: ReferralContact[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {}
}

export function newContactId() {
  return `rc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function computeStats(list: ReferralContact[]) {
  const total = list.length;
  const sent = list.filter((c) => c.status === 'sent' || c.status === 'registered' || c.status === 'rewarded').length;
  const registered = list.filter((c) => c.status === 'registered' || c.status === 'rewarded').length;
  const rawReward = registered * REWARD_GEL;
  const reward = Math.min(rawReward, CAP_GEL);
  return {total, sent, registered, reward};
}

export function buildWhatsAppLink(contact: ReferralContact, refCode: string) {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://engineers.ge';
  const url = `${origin}/?ref=${encodeURIComponent(refCode)}&rc=${encodeURIComponent(contact.id)}`;
  const msg =
    `გამარჯობა, ${contact.firstName || ''}! ` +
    `engineers.ge-ზე უფასო საინჟინრო კალკულატორებს გთავაზობთ — ` +
    `დაარეგისტრირდი ამ ლინკზე: ${url}`;
  const phone = contact.phone.replace(/[^\d]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export function maskPhone(phone: string) {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length <= 4) return '***';
  return `+${digits.slice(0, 3)}***${digits.slice(-2)}`;
}
