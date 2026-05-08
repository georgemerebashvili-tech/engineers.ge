// AHU Selection Tool — Type Definitions
// ASHRAE Fundamentals 2021 + ASHRAE Systems & Equipment

// ─── AHU Type / Heat Recovery Configuration ───────────────────────────────────

export type AhuType =
  | 'supply_only'          // Single-direction supply (no recovery, no coils)
  | 'hrv'                  // Energy recovery ventilator: supply + exhaust + recuperator only
  | 'crossflow_plate'      // Full AHU with cross-flow plate HX
  | 'counterflow_plate'    // Full AHU with counter-flow plate HX
  | 'direct_flow_rotor'    // Full AHU with sensible rotary wheel
  | 'run_around_coil';     // Full AHU with glycol run-around loop

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

export interface DesignConditions {
  // Summer (cooling) — outdoor + indoor
  summerOutdoorDB: number;   // °C dry bulb
  summerOutdoorWB: number;   // °C mean coincident wet bulb
  summerIndoorDB: number;    // °C
  summerIndoorRH: number;    // %
  // Winter (heating) — outdoor + indoor
  winterOutdoorDB: number;   // °C dry bulb
  winterOutdoorRH: number;   // %
  winterIndoorDB: number;    // °C
  winterIndoorRH: number;    // %
  // Atmospheric
  pressure: number;          // kPa
}

// ─── Airflow ──────────────────────────────────────────────────────────────────

export interface AirflowInputs {
  supplyAirflow: number;      // m³/h total supply
  /** m³/h total exhaust/return — used only for balanced AHUs (HRV + recovery types).
   *  Undefined means "track supply" (default = supplyAirflow). Supply-only AHUs
   *  ignore this field. */
  exhaustAirflow?: number;
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
  externalStaticPressure: number;  // Pa — supply duct system resistance (user-provided)
  /** Pa — exhaust duct system resistance. Only relevant for balanced AHUs (HRV + recovery).
   *  Undefined → treated as same as externalStaticPressure. */
  exhaustExternalStaticPressure?: number;
  // Component pressure drops (calculated)
  filterDeltaP: number;     // Pa
  coolingCoilDeltaP: number; // Pa
  heatingCoilDeltaP: number; // Pa
  hrDeltaP: number;          // Pa (heat recovery)
  ductDeltaP: number;        // Pa
  fanEfficiency: number;     // 0–1 (default 0.65)
  motorEfficiency: number;   // 0–1 (default 0.90)
}

export interface AflFanSelection {
  id: number;
  model: string;
  diameterMm: number;
  powerRatedW: number;
  speedRpm: number;
  voltageV: number;
  weightKg: number;
  /** Computed at the system design Q from the 10 V (max) curve polynomial */
  fanEff: number;            // 0–1
  pressureAtDesignPa: number;
  powerAtDesignW: number;
  graphId: number;
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

// ─── System Design Intent ────────────────────────────────────────────────────

export type CoolingSystemType = 'chilled_water' | 'dx' | 'none';
export type HeatingSystemType = 'hot_water' | 'electric' | 'steam' | 'none';
export type FilterStageKey = 'G2' | 'G4' | 'F7' | 'F9' | 'H14' | 'UVC';
export type HumidifierType = 'steam' | 'evaporative' | 'ultrasonic' | 'none';

/** High-level system intent captured in Step 1 — tells later steps what is
 *  physically installed so they can compute the right ΔP, capacity, and stages. */
export interface SystemDesignIntent {
  coolingSystem: CoolingSystemType;
  heatingSystem: HeatingSystemType;
  // Chilled-water fluid temps (used when coolingSystem = 'chilled_water')
  chwSupplyT: number;  // °C  default 6
  chwReturnT: number;  // °C  default 12
  // Hot-water fluid temps (used when heatingSystem = 'hot_water')
  hwSupplyT: number;   // °C  default 80
  hwReturnT: number;   // °C  default 60
  // Electric heater rated capacity (used when heatingSystem = 'electric')
  electricKw: number;  // kW
  // Ordered filtration stages (e.g. G2 pre + F7 main + H14 final)
  filterStages: FilterStageKey[];
  humidifier: HumidifierType;
}

// ─── Full AHU Wizard State ────────────────────────────────────────────────────

export type WizardStep =
  | 'ahu_type'    // AHU სქემა — first, defines what airflow inputs make sense
  | 'inputs'      // პარამეტრები (climate, indoor, airflow, loads) — depends on schema
  | 'components'  // სექციების შერჩევა + STL 3D viewer (catalog-driven)
  | 'psychro'     // ფსიქრომეტრიული პროცესი (drag-able points)
  | 'sizing'      // სექციების სიზინგი (cool/heat/filter/HR + ΔP)
  | 'fan'         // ფანის შერჩევა (total ΔP → kW, SFP)
  | 'summary'     // სრული შეჯამება (totals, energy, dimensions)
  | 'report';     // PDF report export

// ─── Top-level View / Screen Router ───────────────────────────────────────────

export type AhuView =
  | 'landing'           // welcome screen — no project selected
  | 'register_project'  // create new project form
  | 'project_overview'  // selected project: AHU list
  | 'register_ahu'      // create new AHU within project
  | 'wizard';           // step wizard for active AHU

export interface AhuWizardState {
  currentStep: WizardStep;
  /** Furthest step the user has unlocked (sequential progression).
   *  Forward jumps allowed only up to this step; everything beyond is locked. */
  furthestReachedStep?: WizardStep;
  /** When the user edits a setting in step N, all steps > N become "dirty"
   *  and must be re-walked. This holds the earliest dirty step id. */
  dirtyFromStep?: WizardStep;
  selectedCity: CityClimate | null;
  design: DesignConditions;
  airflow: AirflowInputs;
  /** @deprecated Loads are computed from the section chain (Step 2+); kept
   *  optional only for legacy localStorage rows that still carry the field. */
  loads?: ThermalLoads;
  coolingCoilInputs: CoolingCoilInputs;
  heatingCoilInputs: HeatingCoilInputs;
  fanInputs: FanInputs;
  filterInputs: FilterInputs;
  hrInputs: HeatRecoveryInputs;
  /**
   * Section pipeline (ordered). Source of truth for the new section-based calc.
   * Legacy single-coil/-filter inputs above are kept until the legacy UI is
   * fully removed. Storage migration backfills this from a default preset.
   */
  sections?: import('./sections').SectionConfig[];
  /** Housing sections — the 3-slot UI data model. Source of truth for StepComponents.
   *  Synced to `sections` via flattenHousings() on every change. */
  housingSections?: import('./sections').HousingSection[];
  /**
   * Selected preset id used to build the default sections array — kept so the
   * UI can offer "reset to preset" without losing user customization on demand.
   */
  sectionPresetId?: import('./section-presets').PresetId;
  /** KAYA casing model selected from catalog (e.g. "KAYA-4") */
  kayaModelId?: string;
  /** AFL fan selected from the cloudair.tech catalog */
  aflFan?: AflFanSelection;
  /** System design intent — set in Step 1, consumed by all later steps. */
  systemDesign?: SystemDesignIntent;
  // Calculated results
  psychro?: PsychrometricResults;
  coolingCoil?: CoolingCoilResult;
  heatingCoil?: HeatingCoilResult;
  fan?: FanResult;
  filter?: FilterResult;
  heatRecovery?: HeatRecoveryResult;
}
