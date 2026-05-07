/**
 * Pre-defined section sequences for common AHU configurations.
 * Each preset returns a fresh sections array — caller can edit / reorder.
 */

import type { SectionConfig } from './sections';

let counter = 0;
function nid(): string {
  counter += 1;
  return `sec_${Date.now().toString(36)}_${counter}`;
}

export type PresetId =
  | 'mixing_with_hr'
  | '100_oa_with_hr'
  | 'simple_recirc'
  | 'cooling_only'
  | 'full_treatment';

export interface PresetSpec {
  id: PresetId;
  label: string;
  description: string;
  /** Default factory — reads optional inputs (e.g. supply target temp) */
  build: (opts?: PresetOptions) => SectionConfig[];
}

export interface PresetOptions {
  /** Target supply dry-bulb (°C). Defaults to 14°C summer, 22°C winter. */
  supplyTdb?: number;
  /** Outside air fraction 0..1. Defaults to 0.3. */
  oaFraction?: number;
}

const PRESETS: Record<PresetId, PresetSpec> = {
  mixing_with_hr: {
    id: 'mixing_with_hr',
    label: 'შერევით + რეკუპერატორი',
    description: 'Mixing box, ცვლადი OA fraction, cross-flow HR; ფართო-გავრცელებული ოფისი/მაღაზია',
    build: (opts = {}) => {
      const supplyTdb = opts.supplyTdb ?? 14;
      const oaF = opts.oaFraction ?? 0.3;
      return [
        section('damper', 0, 'OA Damper', { openFraction: 1, baseDeltaP: 20 }),
        section('filter', 1, 'წინა ფილტრი G4', { filterClass: 'G4', useAverageDeltaP: true }),
        section('mixing_box', 2, 'შერევის ყუთი', { outsideAirFraction: oaF }),
        section('heat_recovery', 3, 'რეკუპერატორი (cross-flow)', {
          hrType: 'crossflow_plate', sensibleEff: 0.65, latentEff: 0, deltaP: 100,
        }),
        section('filter', 4, 'წვრილი ფილტრი F7', { filterClass: 'F7', useAverageDeltaP: true }),
        section('cooling_coil', 5, 'გამაგრილებელი ხვია', {
          source: 'chw', targetTdb: supplyTdb, bypassFactor: 0.10, apparatusDewPoint: 10, deltaP: 150,
        }),
        section('reheat', 6, 'უკანა გათბობა', {
          source: 'hot_water', targetTdb: supplyTdb + 1, deltaP: 60,
        }),
        section('fan', 7, 'მიმწოდი ვენტილატორი', {
          position: 'supply', externalDeltaP: 200, motorHeatFraction: 0.85,
          fanEff: 0.65, motorEff: 0.92,
        }),
        section('silencer', 8, 'ხმოვანი დამცავი', { deltaP: 30 }),
      ];
    },
  },

  '100_oa_with_hr': {
    id: '100_oa_with_hr',
    label: '100% გარე ჰაერი + რეკუპერატორი',
    description: 'საავადმყოფო / ლაბორატორია — recirculation არ აქვს, მაღალი ηs',
    build: (opts = {}) => {
      const supplyTdb = opts.supplyTdb ?? 16;
      return [
        section('damper', 0, 'OA Damper', { openFraction: 1, baseDeltaP: 20 }),
        section('filter', 1, 'წინა ფილტრი G4', { filterClass: 'G4', useAverageDeltaP: true }),
        section('heat_recovery', 2, 'Counter-flow HR', {
          hrType: 'counterflow_plate', sensibleEff: 0.80, latentEff: 0, deltaP: 130,
        }),
        section('filter', 3, 'F9 ფილტრი', { filterClass: 'F9', useAverageDeltaP: true }),
        section('preheat', 4, 'წინა გათბობა', {
          source: 'hot_water', targetTdb: 5, deltaP: 50,
        }),
        section('cooling_coil', 5, 'გამაგრილებელი ხვია', {
          source: 'chw', targetTdb: supplyTdb - 2, bypassFactor: 0.08, apparatusDewPoint: 9, deltaP: 180,
        }),
        section('reheat', 6, 'უკანა გათბობა', {
          source: 'hot_water', targetTdb: supplyTdb, deltaP: 60,
        }),
        section('humidifier', 7, 'ორთქლის გამატენიანებელი', {
          humType: 'steam', targetRh: 0.45, deltaP: 25,
        }),
        section('fan', 8, 'მიმწოდი ვენტილატორი', {
          position: 'supply', externalDeltaP: 250, motorHeatFraction: 0.85,
          fanEff: 0.68, motorEff: 0.93,
        }),
      ];
    },
  },

  simple_recirc: {
    id: 'simple_recirc',
    label: 'მარტივი (recirc, HR-ის გარეშე)',
    description: 'ბაზური სქემა — damper, ფილტრი, ხვია, fan',
    build: (opts = {}) => {
      const supplyTdb = opts.supplyTdb ?? 14;
      const oaF = opts.oaFraction ?? 0.2;
      return [
        section('damper', 0, 'OA Damper', { openFraction: 1, baseDeltaP: 20 }),
        section('filter', 1, 'G4 ფილტრი', { filterClass: 'G4', useAverageDeltaP: true }),
        section('mixing_box', 2, 'შერევის ყუთი', { outsideAirFraction: oaF }),
        section('cooling_coil', 3, 'გამაგრილებელი ხვია', {
          source: 'chw', targetTdb: supplyTdb, bypassFactor: 0.12, apparatusDewPoint: 10, deltaP: 130,
        }),
        section('fan', 4, 'მიმწოდი ვენტილატორი', {
          position: 'supply', externalDeltaP: 150, motorHeatFraction: 0.85,
          fanEff: 0.62, motorEff: 0.90,
        }),
      ];
    },
  },

  cooling_only: {
    id: 'cooling_only',
    label: 'მხოლოდ გაგრილება (DX)',
    description: 'სპლიტ-ტიპის DX, ჰიდრაულიკის გარეშე',
    build: (opts = {}) => {
      const supplyTdb = opts.supplyTdb ?? 13;
      const oaF = opts.oaFraction ?? 0.15;
      return [
        section('damper', 0, 'OA Damper', { openFraction: 1, baseDeltaP: 15 }),
        section('filter', 1, 'G4 ფილტრი', { filterClass: 'G4', useAverageDeltaP: true }),
        section('mixing_box', 2, 'შერევის ყუთი', { outsideAirFraction: oaF }),
        section('cooling_coil', 3, 'DX evaporator', {
          source: 'dx', targetTdb: supplyTdb, bypassFactor: 0.10, apparatusDewPoint: 9, deltaP: 140,
        }),
        section('fan', 4, 'ვენტილატორი', {
          position: 'supply', externalDeltaP: 130, motorHeatFraction: 0.85,
          fanEff: 0.60, motorEff: 0.90,
        }),
      ];
    },
  },

  full_treatment: {
    id: 'full_treatment',
    label: 'სრული დამუშავება (ყველა სექცია)',
    description: 'ყველა შესაძლო სექცია — preheat, HR, cooling, reheat, humidifier',
    build: (opts = {}) => {
      const supplyTdb = opts.supplyTdb ?? 18;
      const oaF = opts.oaFraction ?? 0.4;
      return [
        section('damper', 0, 'OA Damper', { openFraction: 1, baseDeltaP: 20 }),
        section('filter', 1, 'წინა G4', { filterClass: 'G4', useAverageDeltaP: true }),
        section('mixing_box', 2, 'შერევის ყუთი', { outsideAirFraction: oaF }),
        section('heat_recovery', 3, 'Counter-flow HR', {
          hrType: 'counterflow_plate', sensibleEff: 0.80, latentEff: 0, deltaP: 130,
        }),
        section('filter', 4, 'F7', { filterClass: 'F7', useAverageDeltaP: true }),
        section('preheat', 5, 'წინა გათბობა', { source: 'hot_water', targetTdb: 5, deltaP: 50 }),
        section('cooling_coil', 6, 'CHW coil', {
          source: 'chw', targetTdb: supplyTdb - 3, bypassFactor: 0.08, apparatusDewPoint: 9, deltaP: 180,
        }),
        section('reheat', 7, 'უკანა გათბობა', { source: 'hot_water', targetTdb: supplyTdb, deltaP: 60 }),
        section('humidifier', 8, 'ორთქლი', { humType: 'steam', targetRh: 0.45, deltaP: 25 }),
        section('filter', 9, 'საბოლოო F9', { filterClass: 'F9', useAverageDeltaP: false }),
        section('fan', 10, 'მიმწოდი ვენტილატორი', {
          position: 'supply', externalDeltaP: 280, motorHeatFraction: 0.85,
          fanEff: 0.68, motorEff: 0.93,
        }),
        section('silencer', 11, 'ხმოვანი დამცავი', { deltaP: 30 }),
      ];
    },
  },
};

export function listPresets(): PresetSpec[] {
  return Object.values(PRESETS);
}

export function buildPreset(id: PresetId, opts?: PresetOptions): SectionConfig[] {
  return PRESETS[id].build(opts);
}

// ─── helper ───────────────────────────────────────────────────────────────────

type AnySectionParams =
  | { type: 'damper';        params: import('./sections').DamperParams }
  | { type: 'filter';        params: import('./sections').FilterParams }
  | { type: 'mixing_box';    params: import('./sections').MixingBoxParams }
  | { type: 'heat_recovery'; params: import('./sections').HeatRecoveryParams }
  | { type: 'preheat';       params: import('./sections').PreheatParams }
  | { type: 'cooling_coil';  params: import('./sections').CoolingCoilParams }
  | { type: 'reheat';        params: import('./sections').ReheatParams }
  | { type: 'humidifier';    params: import('./sections').HumidifierParams }
  | { type: 'fan';           params: import('./sections').FanParams }
  | { type: 'silencer';      params: import('./sections').SilencerParams };

function section<T extends AnySectionParams['type']>(
  type: T,
  order: number,
  label: string,
  params: Extract<AnySectionParams, { type: T }>['params'],
): SectionConfig {
  return {
    id: nid(),
    label,
    enabled: true,
    order,
    spec: { type, params } as Extract<AnySectionParams, { type: T }>,
  };
}
