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

// ─── All cities combined ──────────────────────────────────────────────────────

export const ALL_CITIES: CityClimate[] = [...GE_CITIES];

export const CITY_GROUPS = [
  { label: 'საქართველო', cities: GE_CITIES },
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
