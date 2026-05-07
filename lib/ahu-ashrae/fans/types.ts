// Fan datasheet — types
// Source: AFL (cloudair.tech) public API, transformed to project shape.
// Curves are 3rd-degree polynomials of volume V (m³/h):
//   y(V) = a0 + a1·V + a2·V² + a3·V³

export type Coefficients = [number, number, number, number] | number[];

export interface FanCurveSet {
  pressureStatic: Coefficients; // Pa
  power:          Coefficients; // W
  speed:          Coefficients; // RPM
  current:        Coefficients; // A
}

export interface FanSamplePoint {
  volume: number;         // m³/h
  pressureStatic: number; // Pa
  power: number;          // W
  speed: number;          // RPM
  current: number;        // A
}

export interface FanAcousticBand {
  '65Hz'?:   number;
  '125Hz'?:  number;
  '250Hz'?:  number;
  '500Hz'?:  number;
  '1000Hz'?: number;
  '2000Hz'?: number;
  '4000Hz'?: number;
  '8000Hz'?: number;
}

export interface FanAcousticPoint {
  name?: string;          // working point label
  volume?: number;        // m³/h
  Lwa2?: number;  Lwa2_band?: FanAcousticBand;  // sound power, A-weighted, inlet
  Lwa5?: number;  Lwa5_band?: FanAcousticBand;  // … outlet
  Lwa6?: number;  Lwa6_band?: FanAcousticBand;  // … total / casing
}

export interface FanCurveStep {
  label: string;          // "10V", "7.5V", … (control voltage / speed step)
  main: boolean;          // is this the rated / max curve
  graphMin: number;       // m³/h — valid range start
  graphMax: number;       // m³/h — valid range end
  coefficients: FanCurveSet;
  samplePoints: FanSamplePoint[];
  acoustic: FanAcousticPoint[];
}

export interface FanDimensions {
  A?: number | string;
  B?: number | string;
  C?: number | string;
  D?: number | string;
  [k: string]: number | string | undefined;
}

export interface FanSpec {
  phase: number | null;
  voltageRated: number | null;          // V
  currentRated: number | null;          // A
  frequencyRated: number | null;        // Hz
  powerRated: number | null;            // W
  powerMaxConsumption: number | null;   // W
  speedRated: number | null;            // RPM
  speedMax: number | null;              // RPM
  volumeMax: number | null;             // m³/h
  pressureStaticMax: number | null;     // Pa
  motorType: string | null;
  motorTypeControl: string | null;      // 'EC' | 'rpm' | …
  motorInsulationClass: string | null;
  ipMotor: string | null;
  poles: string | null;                 // motor poles (e.g. "2", "4", "-")
  temperatureOperatingMin: number | null;
  temperatureOperatingMax: number | null;
  diameter: number | null;              // mm — impeller
  diameterCalculating: number | null;   // mm — used for dynamic pressure A2
  weight: number | null;                // kg
  dimensions: FanDimensions | null;
}

export interface FanModel {
  code: string;             // "B3P190-EC072-907"
  sourceId: number;         // AFL id_product
  familyId: number;
  family: string;           // family alias (e.g. "B9")
  alias: string;            // type, e.g. "centrifugalBackward"
  imageUrl: string;
  spec: FanSpec;
  acousticOverall: {
    Lwa2: number | null;
    Lwa5: number | null;
    Lwa6: number | null;
    Lpa2: number | null;
    Lpa2dist: number | null;
  };
  curves: FanCurveStep[];   // ordered, [0] = main / max
}

// ─── Operating point ────────────────────────────────────────────────────────

export interface OperatingPoint {
  volume: number;          // m³/h — Q
  pressureStatic: number;  // Pa — ΔPst
  pressureTotal: number;   // Pa — ΔPst + ΔPdyn
  pressureDynamic: number; // Pa — ½·ρ·v²  (using diameterCalculating)
  velocity: number;        // m/s — v at the calculating diameter
  speed: number;           // RPM — n
  power: number;           // W — P_abs at shaft / motor input
  current: number;         // A — I
  efficiencyStatic: number; // % — ηst = (Q · ΔPst) / P
  efficiencyTotal: number;  // % — ηtot = (Q · ΔPtot) / P
  sfp: number;             // W/(m³/s) — Specific Fan Power
  curveLabel: string;      // which step the point sits on
}

export interface MediumState {
  temperature: number;  // °C
  density: number;      // kg/m³ (default 1.204 @ 20°C, sea level)
}
