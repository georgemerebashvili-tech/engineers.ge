// AHU Selection Tool — Type Definitions
// ASHRAE Fundamentals 2021 + ASHRAE Systems & Equipment

// ─── AHU Type / Heat Recovery Configuration ───────────────────────────────────

export type AhuType =
  | 'crossflow_plate'      // Cross-flow plate HX (recuperator)
  | 'counterflow_plate'    // Counter-flow plate HX (recuperator)
  | 'direct_flow_rotor'    // Sensible rotary wheel
  | 'enthalpy_rotor'       // Total energy / enthalpy wheel
  | 'run_around_coil'      // Glycol run-around loop
  | 'heat_pipe';           // Phase-change refrigerant heat pipe

// ─── Project / AHU Unit ───────────────────────────────────────────────────────

/**
 * Project = building / facility / object — container for 1..N AHU units.
 * (e.g. "ბანკის ფილიალი N3", "ბიზნეს-ცენტრი ფლორა II")
 */
export interface AhuProject {
  id: string;             // unique project id
  name: string;
  location: string;       // city id (default for all units), or 'custom'
  customCity?: CityClimate; // when location === 'custom'
  engineer: string;
  date: string;           // YYYY-MM-DD created
  modified: string;       // YYYY-MM-DD last modified
  description?: string;
  units: AhuUnit[];       // 1..N AHUs in this project
}

/**
 * AhuUnit = single AHU within a project (e.g. "AHU-01", "AHU-02 / Lobby").
 * Wizard state lives here — each unit has its own design.
 */
export interface AhuUnit {
  id: string;
  name: string;           // e.g. "AHU-01"
  description?: string;   // optional area / zone served
  ahuType?: AhuType;      // selected AHU style
  date: string;           // YYYY-MM-DD created
  modified: string;       // YYYY-MM-DD last modified
}

// ─── Climate Data ─────────────────────────────────────────────────────────────

export interface CityClimate {
  id: string;
  name: string;       // Georgian name
  nameEn: string;
  country: string;
  elevation: number;  // m above sea level
  pressure: number;   // kPa (calc from elevation)
  // Summer cooling design — ASHRAE 0.4% DB / MCWB
  summerDB: number;   // °C dry bulb
  summerMCWB: number; // °C mean coincident wet bulb
  // Winter heating design — ASHRAE 99%
  winterDB99: number;  // °C
  winterDB996: number; // °C (99.6%)
}

// ─── Design Conditions ────────────────────────────────────────────────────────

export type DesignMode = 'cooling' | 'heating';

export interface DesignConditions {
  mode: DesignMode;
  // Outdoor — summer (cooling)
  summerDB: number;    // °C dry bulb
  summerWB: number;    // °C mean coincident wet bulb
  // Outdoor — winter (heating)
  winterDB: number;    // °C dry bulb
  winterRH: number;    // % relative humidity
  // Indoor
  indoorDB: number;    // °C
  indoorRH: number;    // % (0–100)
  // Atmospheric
  pressure: number;    // kPa
}

// ─── Airflow ──────────────────────────────────────────────────────────────────

export interface AirflowInputs {
  supplyAirflow: number;      // m³/h total supply
  oaFraction: number;         // 0–1 (outdoor air fraction)
  // ASHRAE 62.1 ventilation method
  ventilationMethod: 'fraction' | 'ashrae621';
  // ASHRAE 62.1 inputs (if ventilationMethod = ashrae621)
  occupants?: number;
  floorArea?: number;         // m²
  spaceCategory?: string;     // e.g. 'office', 'classroom'
}

// ─── Thermal Loads ────────────────────────────────────────────────────────────

export interface ThermalLoads {
  sensibleCooling: number;   // kW
  latentCooling: number;     // kW
  heatingLoad: number;       // kW
}

// ─── Psychrometric State Point ────────────────────────────────────────────────

export interface PsychoPoint {
  label: string;
  description: string;
  tdb: number;    // °C dry bulb
  twb: number;    // °C wet bulb
  tdp: number;    // °C dew point
  w: number;      // kg/kg humidity ratio
  h: number;      // kJ/kg enthalpy
  rh: number;     // % relative humidity
  v: number;      // m³/kg dry air specific volume
}

export interface PsychrometricResults {
  outdoor: PsychoPoint;       // O — outdoor air
  mixed: PsychoPoint;         // M — mixed air (OA + RA)
  supplyAir: PsychoPoint;     // S — supply air (off coil)
  roomAir: PsychoPoint;       // R — room / return air
  adp: PsychoPoint;           // ADP — apparatus dew point
  shr: number;                // 0–1 sensible heat ratio
  contactFactor: number;      // 0–1 (1 − bypass factor)
  coolingCapacity: {
    sensible: number;         // kW
    latent: number;           // kW
    total: number;            // kW
  };
  airDensity: number;         // kg/m³ at mixed air condition
}

// ─── Cooling Coil ─────────────────────────────────────────────────────────────

export interface CoolingCoilInputs {
  chwSupplyT: number;      // °C chilled water supply (default 7)
  chwReturnT: number;      // °C chilled water return (default 12)
  faceVelocity: number;    // m/s (recommended 2.0–2.5)
  rows: number;            // coil rows (2, 4, 6, 8)
  fpi: number;             // fins per inch (8, 10, 12, 14)
}

export interface CoolingCoilResult {
  totalCapacity: number;        // kW
  sensibleCapacity: number;     // kW
  latentCapacity: number;       // kW
  shr: number;
  waterFlow: number;            // L/s
  waterFlowLph: number;         // L/h
  faceArea: number;             // m²
  coilWidth: number;            // mm (recommended)
  coilHeight: number;           // mm (recommended)
  enteringDB: number;           // °C
  enteringWB: number;           // °C
  leavingDB: number;            // °C
  leavingWB: number;            // °C
  chwDeltaT: number;            // °C
}

// ─── Heating Coil ─────────────────────────────────────────────────────────────

export type HeatingCoilType = 'hot_water' | 'electric' | 'steam';

export interface HeatingCoilInputs {
  type: HeatingCoilType;
  hwSupplyT: number;     // °C (for hot_water type, default 80)
  hwReturnT: number;     // °C (default 60)
}

export interface HeatingCoilResult {
  capacity: number;        // kW
  waterFlow?: number;      // L/s (for hot water)
  enteringDB: number;      // °C
  leavingDB: number;       // °C
  chwDeltaT?: number;
}

// ─── Fan ──────────────────────────────────────────────────────────────────────

export interface FanInputs {
  externalStaticPressure: number;  // Pa (user-provided system resistance)
  // Component pressure drops (calculated)
  filterDeltaP: number;     // Pa
  coolingCoilDeltaP: number; // Pa
  heatingCoilDeltaP: number; // Pa
  hrDeltaP: number;          // Pa (heat recovery)
  ductDeltaP: number;        // Pa
  fanEfficiency: number;     // 0–1 (default 0.65)
  motorEfficiency: number;   // 0–1 (default 0.90)
}

export interface FanResult {
  totalStaticPressure: number;  // Pa
  airPower: number;             // kW
  shaftPower: number;           // kW
  motorPower: number;           // kW (next standard size)
  specificFanPower: number;     // W/(m³/h)
  ashrae901Pass: boolean;       // meets ASHRAE 90.1 SFP limit
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export type MervRating = 8 | 11 | 13 | 14 | 16;

export interface FilterInputs {
  mervRating: MervRating;
  preFilter: boolean;          // secondary pre-filter (MERV 8)
  faceVelocity: number;        // m/s
}

export interface FilterResult {
  initialDP: number;            // Pa
  finalDP: number;              // Pa (at end of life)
  avgDP: number;                // Pa (for fan calc)
  mervDescription: string;
  isoEquivalent: string;        // ISO 16890 e.g. ePM1 50%
}

// ─── Heat Recovery ────────────────────────────────────────────────────────────

export type HeatRecoveryType = 'rotary_wheel' | 'plate_hx' | 'run_around' | 'none';

export interface HeatRecoveryInputs {
  type: HeatRecoveryType;
  sensibleEffectiveness: number;  // 0–1 (e.g. 0.75)
  latentEffectiveness: number;    // 0–1 (rotary wheel only)
}

export interface HeatRecoveryResult {
  preConditionedDB: number;       // °C (air entering main coil)
  preConditionedW: number;        // kg/kg
  sensibleEnergySaved: number;    // kW
  totalEnergySaved: number;       // kW
  pressureDrop: number;           // Pa per side
  ashrae901Required: boolean;     // ASHRAE 90.1 §6.5.6.1 mandate
}

// ─── Full AHU Wizard State ────────────────────────────────────────────────────

export type WizardStep =
  | 'inputs'
  | 'psychro'
  | 'ahu_type'
  | 'cool_coil'
  | 'heat_coil'
  | 'fan'
  | 'filter'
  | 'summary';

// ─── Top-level View / Screen Router ───────────────────────────────────────────

export type AhuView =
  | 'landing'           // welcome screen — no project selected
  | 'register_project'  // create new project form
  | 'project_overview'  // selected project: AHU list
  | 'register_ahu'      // create new AHU within project
  | 'wizard';           // step wizard for active AHU

export interface AhuWizardState {
  currentStep: WizardStep;
  selectedCity: CityClimate | null;
  design: DesignConditions;
  airflow: AirflowInputs;
  loads: ThermalLoads;
  coolingCoilInputs: CoolingCoilInputs;
  heatingCoilInputs: HeatingCoilInputs;
  fanInputs: FanInputs;
  filterInputs: FilterInputs;
  hrInputs: HeatRecoveryInputs;
  // Calculated results
  psychro?: PsychrometricResults;
  coolingCoil?: CoolingCoilResult;
  heatingCoil?: HeatingCoilResult;
  fan?: FanResult;
  filter?: FilterResult;
  heatRecovery?: HeatRecoveryResult;
}
