// ASHRAE Climate Data — Chapter 14 (Climatic Design Information)
// Outdoor Design Conditions by City
// Summer: 0.4% DB/MCWB  |  Winter: 99% / 99.6% DB

import { pressureFromElevation } from './psychrometrics';
import type { CityClimate } from './types';

function city(
  id: string,
  name: string,
  nameEn: string,
  country: string,
  elevation: number,
  summerDB: number,
  summerMCWB: number,
  winterDB99: number,
  winterDB996: number,
): CityClimate {
  return {
    id,
    name,
    nameEn,
    country,
    elevation,
    pressure: pressureFromElevation(elevation),
    summerDB,
    summerMCWB,
    winterDB99,
    winterDB996,
  };
}

// ─── Georgia ──────────────────────────────────────────────────────────────────

export const GE_CITIES: CityClimate[] = [
  city('tbilisi',  'თბილისი',  'Tbilisi',  'GE', 490,  35.4, 21.9, -9.4,  -13.1),
  city('batumi',   'ბათუმი',   'Batumi',   'GE',  10,  32.5, 25.6,  2.2,    0.6),
  city('kutaisi',  'ქუთაისი',  'Kutaisi',  'GE', 114,  35.8, 21.5, -4.9,   -7.5),
  city('rustavi',  'რუსთავი',  'Rustavi',  'GE', 330,  36.2, 21.8, -9.0,  -12.8),
  city('gori',     'გორი',     'Gori',     'GE', 595,  36.0, 21.2, -9.8,  -13.5),
  city('zugdidi',  'ზუგდიდი',  'Zugdidi',  'GE',  40,  34.0, 24.5, -1.5,   -3.5),
  city('poti',     'ფოთი',     'Poti',     'GE',   0,  31.5, 25.8,  0.5,   -1.2),
  city('telavi',   'თელავი',   'Telavi',   'GE', 520,  34.5, 21.2, -8.5,  -12.0),
  city('akhaltsikhe', 'ახალციხე', 'Akhaltsikhe', 'GE', 1030, 32.5, 19.5, -14.5, -18.0),
  city('borjomi',  'ბორჯომი',  'Borjomi',  'GE', 800,  31.0, 18.8, -12.0, -15.5),
  city('mestia',   'მესტია',   'Mestia',   'GE', 1440, 26.5, 17.5, -14.0, -18.5),
];

// ─── Europe ───────────────────────────────────────────────────────────────────

export const EU_CITIES: CityClimate[] = [
  city('athens',      'Athens',     'Athens',     'GR',  27,  36.7, 22.8,  2.1,  0.2),
  city('berlin',      'Berlin',     'Berlin',     'DE',  36,  31.6, 19.5, -10.4, -13.2),
  city('london',      'London',     'London',     'GB',  18,  28.9, 20.3,  -2.3,  -4.3),
  city('paris',       'Paris',      'Paris',      'FR',  75,  31.8, 21.2,  -4.3,  -6.4),
  city('rome',        'Rome',       'Rome',       'IT',  21,  34.3, 23.5,   0.9,  -1.0),
  city('madrid',      'Madrid',     'Madrid',     'ES', 631,  36.6, 20.5,  -3.1,  -5.5),
  city('amsterdam',   'Amsterdam',  'Amsterdam',  'NL',   0,  27.9, 20.2,  -5.3,  -7.7),
  city('vienna',      'Vienna',     'Vienna',     'AT', 156,  31.9, 21.6,  -9.7, -12.4),
  city('warsaw',      'Warsaw',     'Warsaw',     'PL', 107,  29.8, 19.8, -16.4, -19.7),
  city('bucharest',   'Bucharest',  'Bucharest',  'RO',  80,  35.0, 22.2, -14.4, -17.9),
  city('istanbul',    'Istanbul',   'Istanbul',   'TR',  60,  32.8, 24.3,  -0.3,  -2.3),
  city('ankara',      'Ankara',     'Ankara',     'TR', 891,  34.5, 18.8, -11.0, -14.5),
  city('moscow',      'Moscow',     'Moscow',     'RU', 156,  27.6, 19.4, -24.9, -28.5),
  city('kyiv',        'Kyiv',       'Kyiv',       'UA', 166,  30.3, 20.9, -19.8, -22.6),
  city('baku',        'Baku',       'Baku',       'AZ',  27,  36.2, 24.4,  -3.0,  -5.0),
  city('yerevan',     'Yerevan',    'Yerevan',    'AM', 994,  37.0, 19.2, -10.7, -13.4),
];

// ─── USA / Canada ─────────────────────────────────────────────────────────────

export const NA_CITIES: CityClimate[] = [
  city('new_york',    'New York',   'New York',   'US',  10,  33.2, 23.6, -10.7, -14.0),
  city('los_angeles', 'Los Angeles','Los Angeles','US',  32,  35.5, 19.3,   2.3,   0.8),
  city('chicago',     'Chicago',    'Chicago',    'US', 189,  33.3, 23.9, -19.3, -22.5),
  city('houston',     'Houston',    'Houston',    'US',  10,  36.6, 27.0,   1.1,  -1.5),
  city('miami',       'Miami',      'Miami',      'US',   2,  33.7, 26.9,   6.2,   4.9),
  city('toronto',     'Toronto',    'Toronto',    'CA', 116,  30.6, 22.8, -19.7, -22.8),
];

// ─── Asia / Middle East ───────────────────────────────────────────────────────

export const ASIA_CITIES: CityClimate[] = [
  city('dubai',    'Dubai',     'Dubai',     'AE',   5,  43.9, 24.3,   9.2,  7.4),
  city('riyadh',   'Riyadh',    'Riyadh',    'SA', 620,  43.3, 17.7,   2.8,  0.4),
  city('tehran',   'Tehran',    'Tehran',    'IR', 1191, 38.2, 16.5,  -4.4, -7.3),
  city('delhi',    'Delhi',     'Delhi',     'IN', 212,  41.6, 25.5,   4.7,  2.7),
  city('beijing',  'Beijing',   'Beijing',   'CN',  54,  35.0, 26.3,  -8.7, -11.4),
  city('tokyo',    'Tokyo',     'Tokyo',     'JP',  22,  34.4, 27.5,  -0.6,  -2.4),
  city('singapore','Singapore', 'Singapore', 'SG',  15,  33.3, 27.9,  21.5,  21.0),
];

// ─── All cities combined ──────────────────────────────────────────────────────

export const ALL_CITIES: CityClimate[] = [
  ...GE_CITIES,
  ...EU_CITIES,
  ...NA_CITIES,
  ...ASIA_CITIES,
];

export const CITY_GROUPS = [
  { label: 'საქართველო', cities: GE_CITIES },
  { label: 'ევროპა', cities: EU_CITIES },
  { label: 'ჩრდ. ამერიკა', cities: NA_CITIES },
  { label: 'აზია / შ. აღმოსავლეთი', cities: ASIA_CITIES },
];

export function getCityById(id: string): CityClimate | null {
  return ALL_CITIES.find((c) => c.id === id) ?? null;
}

// ─── ASHRAE 62.1 Ventilation Rates ───────────────────────────────────────────

export interface Ashrae621Space {
  id: string;
  name: string;
  rp: number;   // L/s per person
  ra: number;   // L/s per m²
}

export const ASHRAE_621_SPACES: Ashrae621Space[] = [
  { id: 'office',        name: 'ოფისი',              rp: 2.5, ra: 0.30 },
  { id: 'conf_room',     name: 'კონფერენც-დარბაზი',  rp: 2.5, ra: 0.30 },
  { id: 'lobby',         name: 'ლობი',               rp: 3.8, ra: 0.30 },
  { id: 'classroom',     name: 'საკლასო ოთახი',      rp: 3.8, ra: 0.55 },
  { id: 'lecture',       name: 'ლექციის დარბაზი',    rp: 3.8, ra: 0.55 },
  { id: 'retail',        name: 'სავაჭრო (retail)',   rp: 3.8, ra: 0.87 },
  { id: 'restaurant',    name: 'რესტორანი',          rp: 3.8, ra: 0.87 },
  { id: 'hotel_room',    name: 'სასტუმრო ოთახი',    rp: 2.5, ra: 0.30 },
  { id: 'hospital_room', name: 'საავადმყოფო პალატა', rp: 5.0, ra: 0.60 },
  { id: 'gym',           name: 'სპორტდარბაზი',      rp: 7.0, ra: 0.30 },
  { id: 'lab',           name: 'ლაბორატორია',        rp: 5.0, ra: 0.50 },
  { id: 'parking',       name: 'პარკინგი',           rp: 0.0, ra: 0.75 },
  { id: 'custom',        name: 'სხვა (ხელით)',       rp: 2.5, ra: 0.30 },
];

/**
 * Minimum outdoor airflow per ASHRAE 62.1-2022 Eq. 6-1
 * Vbz = Rp × Pz + Ra × Az
 */
export function ashrae621MinOA(
  spaceId: string,
  occupants: number,
  floorAreaM2: number,
): number {
  const sp = ASHRAE_621_SPACES.find((s) => s.id === spaceId);
  if (!sp) return 0;
  const vbzLs = sp.rp * occupants + sp.ra * floorAreaM2;
  return vbzLs * 3.6; // L/s → m³/h
}

// ─── Filter Data ──────────────────────────────────────────────────────────────

export interface MervData {
  merv: number;
  iso: string;             // ISO 16890 equivalent
  description: string;
  initialDP: number;       // Pa at 2.5 m/s face velocity
  finalDP: number;         // Pa at end-of-life
  application: string;
}

export const MERV_TABLE: MervData[] = [
  { merv: 8,  iso: 'ePM10 50%', description: 'Standard + (grains, pollen)',     initialDP: 50,  finalDP: 120, application: 'commercial prefilter'   },
  { merv: 11, iso: 'ePM2.5 60%',description: 'Superior (auto & general hosp.)', initialDP: 80,  finalDP: 175, application: 'offices, hospitals'       },
  { merv: 13, iso: 'ePM1 50%',  description: 'Superior+ (bacteria, smoke)',     initialDP: 100, finalDP: 200, application: 'surgery, labs, clean'     },
  { merv: 14, iso: 'ePM1 75%',  description: 'HEPA-class (0.3µm particles)',    initialDP: 130, finalDP: 240, application: 'pharma, IC, ISO 6 rooms'  },
  { merv: 16, iso: 'ePM1 95%',  description: 'HEPA-equivalent (virus/virus)',   initialDP: 160, finalDP: 300, application: 'BSL-3, IC, microelect.'   },
];
