/**
 * Section types + discriminated union of params.
 *
 * Each AHU section is a pure transformation of AirState. Adding a new section
 * type = (1) add to SectionType union, (2) add a Params interface,
 * (3) implement processX in sections/process-x.ts, (4) register in sections/index.ts.
 */

import type { AirState } from '../air-state';
import type { NarrativeBullet } from '../narrate';

export type SectionType =
  | 'damper'
  | 'filter'
  | 'mixing_box'
  | 'heat_recovery'
  | 'preheat'
  | 'cooling_coil'
  | 'reheat'
  | 'humidifier'
  | 'fan'
  | 'silencer';

export interface SectionResult {
  /** Outlet air state after this section's transformation */
  outlet: AirState;
  /** Pressure drop across this section (Pa) */
  deltaP: number;
  /** Energy added to (positive) or removed from (negative) the air (kW) */
  energy: number;
  /** Sensible component of energy (kW), for cooling/heating coil reporting */
  sensible?: number;
  /** Latent component of energy (kW), for humidification/dehumidification */
  latent?: number;
  /** Per-section narrative bullet for the journal */
  narrative: NarrativeBullet;
}

// ─── Per-type Params discriminated union ──────────────────────────────────────

export interface DamperParams {
  /** 0..1 open fraction; affects only ΔP */
  openFraction: number;
  /** ΔP at fully open at design airflow (Pa) — typically 15–30 Pa */
  baseDeltaP: number;
}

export type FilterClass =
  | 'G4' | 'M5' | 'F7' | 'F9' | 'H13' | 'H14' | 'carbon' | 'electric';

export interface FilterParams {
  filterClass: FilterClass;
  /** Use clean ΔP (false) or 0.5×(clean+dirty) average (true) */
  useAverageDeltaP: boolean;
}

export interface MixingBoxParams {
  /** Outside air fraction 0..1 (rest is recirculated room air) */
  outsideAirFraction: number;
  /** Return-air state — set by chain runner (snapshot of room conditions) */
  returnState?: AirState;
}

export type HeatRecoveryType =
  | 'crossflow_plate' | 'counterflow_plate'
  | 'rotary_sensible'
  | 'run_around_coil';

export interface HeatRecoveryParams {
  hrType: HeatRecoveryType;
  /** Sensible effectiveness 0..1 (typical 0.6–0.85) */
  sensibleEff: number;
  /** Latent effectiveness 0..1 (only enthalpy wheel; 0 for plates) */
  latentEff: number;
  /** Pressure drop on the supply side (Pa) */
  deltaP: number;
  /** Exhaust-side state — set by chain runner from room conditions */
  exhaustState?: AirState;
}

export interface PreheatParams {
  /** 'hot_water' | 'electric' | 'steam' */
  source: 'hot_water' | 'electric' | 'steam';
  /** Target outlet dry-bulb (°C) — coil heats up to this */
  targetTdb: number;
  /** Pressure drop (Pa) — typical 30–80 Pa */
  deltaP: number;
}

export interface CoolingCoilParams {
  /** 'chw' = chilled water, 'dx' = direct expansion */
  source: 'chw' | 'dx';
  /** Target supply dry-bulb (°C) */
  targetTdb: number;
  /** Bypass factor 0..1 — fraction of air that doesn't contact the coil
   *  (0.05–0.15 typical) */
  bypassFactor: number;
  /** Apparatus dew point (°C) — coil surface effective temperature */
  apparatusDewPoint: number;
  /** Pressure drop (Pa) — typical 100–200 Pa */
  deltaP: number;
}

export interface ReheatParams {
  source: 'hot_water' | 'electric' | 'steam';
  /** Target outlet dry-bulb (°C) */
  targetTdb: number;
  deltaP: number;
}

export type HumidifierType = 'steam' | 'adiabatic_spray' | 'evaporative_pad';

export interface HumidifierParams {
  humType: HumidifierType;
  /** Target outlet RH (0..1) */
  targetRh: number;
  /** Saturation efficiency for adiabatic types (0..1, typ 0.85–0.95) */
  saturationEff?: number;
  deltaP: number;
}

export interface FanParams {
  /** 'supply' or 'return' */
  position: 'supply' | 'return';
  /** Total static pressure to overcome (Pa) — chain sums other ΔP, fan reads it */
  externalDeltaP: number;
  /** 0..1 — fraction of fan power that becomes air heat (typical 0.85) */
  motorHeatFraction: number;
  /** Fan total efficiency 0..1 */
  fanEff: number;
  /** Motor electrical efficiency 0..1 */
  motorEff: number;
}

export interface SilencerParams {
  /** Pressure drop (Pa) — typical 20–50 Pa */
  deltaP: number;
}

// ─── Discriminated union ──────────────────────────────────────────────────────

export type SectionParams =
  | { type: 'damper';        params: DamperParams }
  | { type: 'filter';        params: FilterParams }
  | { type: 'mixing_box';    params: MixingBoxParams }
  | { type: 'heat_recovery'; params: HeatRecoveryParams }
  | { type: 'preheat';       params: PreheatParams }
  | { type: 'cooling_coil';  params: CoolingCoilParams }
  | { type: 'reheat';        params: ReheatParams }
  | { type: 'humidifier';    params: HumidifierParams }
  | { type: 'fan';           params: FanParams }
  | { type: 'silencer';      params: SilencerParams };

export interface SectionConfig {
  id: string;
  label: string;
  enabled: boolean;
  /** For drag-reorder; lower comes first in the air path */
  order: number;
  /** Discriminated union holds both type tag and params */
  spec: SectionParams;
}

export type SectionProcessor<P> = (inlet: AirState, params: P, sectionId: string, sectionLabel: string) => SectionResult;
