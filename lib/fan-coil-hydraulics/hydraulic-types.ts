export type SystemType = "TWO_PIPE" | "FOUR_PIPE";

export type HydraulicNodeType =
  | "CHILLER"
  | "HOT_WATER_SOURCE"
  | "PUMP"
  | "HEADER"
  | "TEE"
  | "FAN_COIL";

export type CircuitType =
  | "COMMON_SUPPLY"
  | "COMMON_RETURN"
  | "CHW_SUPPLY"
  | "CHW_RETURN"
  | "HHW_SUPPLY"
  | "HHW_RETURN";

export type PipeMaterial = "STEEL" | "PLASTIC";

export interface FanCoilData {
  tag: string;
  coolingCapacityKw: number;
  heatingCapacityKw: number;
  chwSupplyTempC: number;
  chwReturnTempC: number;
  hhwSupplyTempC: number;
  hhwReturnTempC: number;
  coolingCoilPressureDropKpa: number;
  heatingCoilPressureDropKpa: number;
  valvePressureDropKpa: number;
  accessoryPressureDropKpa: number;
}

export interface FittingData {
  id: string;
  name: string;
  zeta: number;
  count: number;
}

export interface PipeData {
  tag: string;
  circuitType: CircuitType;
  material: PipeMaterial;
  dn: string;
  innerDiameterMm: number;
  lengthM: number;
  fittings: FittingData[];
}

// Index signatures satisfy @xyflow/react's Record<string,unknown> constraint
export interface HydraulicNodeData {
  [key: string]: unknown;
  nodeType: HydraulicNodeType;
  label: string;
  fcu?: FanCoilData;
}

export interface HydraulicEdgeData {
  [key: string]: unknown;
  pipe: PipeData;
}

// Simple graph types — independent of React Flow for pure calculation
export interface GraphNode {
  id: string;
  data: HydraulicNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data: { pipe: PipeData };
}

// ─── Calculation Result Types ────────────────────────────────────────────────

export interface FCUFlowResult {
  nodeId: string;
  tag: string;
  coolingFlowM3h: number;
  heatingFlowM3h: number;
  designFlowM3h: number;
  chilledWaterFlowM3h: number;
  hotWaterFlowM3h: number;
  // 2-pipe path breakdown
  supplyPathKpa: number;
  internalKpa: number;
  returnPathKpa: number;
  totalPathKpa: number;
  // 4-pipe circuit paths
  chwPathKpa: number;
  hhwPathKpa: number;
  // critical flags
  isCriticalPath: boolean;
  isCriticalCHW: boolean;
  isCriticalHHW: boolean;
}

export interface PipeFlowResult {
  edgeId: string;
  tag: string;
  circuitType: CircuitType;
  dn: string;
  innerDiameterMm: number;
  lengthM: number;
  flowM3h: number;
  velocityMs: number;
  reynoldsNumber: number;
  frictionFactor: number;
  pipePressureDropKpa: number;
  fittingPressureDropKpa: number;
  totalPressureDropKpa: number;
  pressureDropPerMeterPaM: number;
  servedFCUIds: string[];
}

export interface PumpDutyResult {
  label: string;
  circuitType: string;
  flowM3h: number;
  pressureKpa: number;
  headM: number;
  headWithSafetyM: number;
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationMessage {
  severity: ValidationSeverity;
  message: string;
  entityId?: string;
}

export interface CalculationResult {
  systemType: SystemType;
  fcuResults: FCUFlowResult[];
  pipeResults: PipeFlowResult[];
  pumpResults: PumpDutyResult[];
  validationMessages: ValidationMessage[];
  criticalFCUId: string | null;
  criticalCHWFCUId: string | null;
  criticalHHWFCUId: string | null;
}
