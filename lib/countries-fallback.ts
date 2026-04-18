// Static fallback list used when Supabase is unreachable.
// Keep in sync with the seed data in migration 0007_users_and_countries.sql.

import type {Country} from '@/lib/users';

export const FALLBACK_COUNTRIES: Country[] = [
  {id: -1, code: 'GE', name_ka: 'საქართველო', name_en: 'Georgia', flag_emoji: '🇬🇪'},
  {id: -2, code: 'US', name_ka: 'აშშ', name_en: 'United States', flag_emoji: '🇺🇸'},
  {id: -3, code: 'GB', name_ka: 'დიდი ბრიტანეთი', name_en: 'United Kingdom', flag_emoji: '🇬🇧'},
  {id: -4, code: 'DE', name_ka: 'გერმანია', name_en: 'Germany', flag_emoji: '🇩🇪'},
  {id: -5, code: 'FR', name_ka: 'საფრანგეთი', name_en: 'France', flag_emoji: '🇫🇷'},
  {id: -6, code: 'TR', name_ka: 'თურქეთი', name_en: 'Turkey', flag_emoji: '🇹🇷'},
  {id: -7, code: 'RU', name_ka: 'რუსეთი', name_en: 'Russia', flag_emoji: '🇷🇺'},
  {id: -8, code: 'AZ', name_ka: 'აზერბაიჯანი', name_en: 'Azerbaijan', flag_emoji: '🇦🇿'},
  {id: -9, code: 'AM', name_ka: 'სომხეთი', name_en: 'Armenia', flag_emoji: '🇦🇲'},
  {id: -10, code: 'UA', name_ka: 'უკრაინა', name_en: 'Ukraine', flag_emoji: '🇺🇦'},
  {id: -11, code: 'IT', name_ka: 'იტალია', name_en: 'Italy', flag_emoji: '🇮🇹'},
  {id: -12, code: 'ES', name_ka: 'ესპანეთი', name_en: 'Spain', flag_emoji: '🇪🇸'},
  {id: -13, code: 'PL', name_ka: 'პოლონეთი', name_en: 'Poland', flag_emoji: '🇵🇱'},
  {id: -14, code: 'NL', name_ka: 'ნიდერლანდები', name_en: 'Netherlands', flag_emoji: '🇳🇱'},
  {id: -15, code: 'GR', name_ka: 'საბერძნეთი', name_en: 'Greece', flag_emoji: '🇬🇷'},
  {id: -16, code: 'IL', name_ka: 'ისრაელი', name_en: 'Israel', flag_emoji: '🇮🇱'},
  {id: -17, code: 'AE', name_ka: 'არაბთა გაერთიანებული საამიროები', name_en: 'United Arab Emirates', flag_emoji: '🇦🇪'},
  {id: -18, code: 'CN', name_ka: 'ჩინეთი', name_en: 'China', flag_emoji: '🇨🇳'},
  {id: -19, code: 'IN', name_ka: 'ინდოეთი', name_en: 'India', flag_emoji: '🇮🇳'},
  {id: -20, code: 'JP', name_ka: 'იაპონია', name_en: 'Japan', flag_emoji: '🇯🇵'},
  {id: -21, code: 'CA', name_ka: 'კანადა', name_en: 'Canada', flag_emoji: '🇨🇦'},
  {id: -22, code: 'AU', name_ka: 'ავსტრალია', name_en: 'Australia', flag_emoji: '🇦🇺'},
  {id: -23, code: 'BR', name_ka: 'ბრაზილია', name_en: 'Brazil', flag_emoji: '🇧🇷'},
  {id: -24, code: 'MX', name_ka: 'მექსიკა', name_en: 'Mexico', flag_emoji: '🇲🇽'},
  {id: -25, code: 'EG', name_ka: 'ეგვიპტე', name_en: 'Egypt', flag_emoji: '🇪🇬'},
  {id: -26, code: 'SA', name_ka: 'საუდის არაბეთი', name_en: 'Saudi Arabia', flag_emoji: '🇸🇦'}
];
