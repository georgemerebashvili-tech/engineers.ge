import type {
  SystemType,
  CircuitType,
  PipeMaterial,
  FanCoilData,
  PipeData,
  GraphNode,
  GraphEdge,
  FCUFlowResult,
  PipeFlowResult,
  PumpDutyResult,
  ValidationMessage,
  CalculationResult,
} from "./hydraulic-types";

// ─── Physical constants ───────────────────────────────────────────────────────
const RHO = 998; // water density, kg/m³
const MU = 0.001; // dynamic viscosity, Pa·s
const EPS_STEEL = 0.000045; // roughness, m
const EPS_PLASTIC = 0.000007;
const G = 9.81; // m/s²

// ─── Pure hydraulic functions ─────────────────────────────────────────────────

export function calcFCUFlows(fcu: FanCoilData): {
  cooling: number;
  heating: number;
} {
  const chwDt = Math.abs(fcu.chwReturnTempC - fcu.chwSupplyTempC);
  const hhwDt = Math.abs(fcu.hhwReturnTempC - fcu.hhwSupplyTempC);
  return {
    cooling: chwDt > 0 ? (fcu.coolingCapacityKw * 0.86) / chwDt : 0,
    heating: hhwDt > 0 ? (fcu.heatingCapacityKw * 0.86) / hhwDt : 0,
  };
}

export function calcVelocity(flowM3h: number, dMm: number): number {
  if (dMm <= 0 || flowM3h <= 0) return 0;
  const d = dMm / 1000;
  return flowM3h / 3600 / ((Math.PI * d * d) / 4);
}

export function calcReynolds(v: number, dMm: number): number {
  return (RHO * v * (dMm / 1000)) / MU;
}

export function calcFrictionFactor(
  re: number,
  dMm: number,
  material: PipeMaterial
): number {
  if (re <= 0) return 0;
  if (re < 2300) return 64 / re; // Hagen-Poiseuille (laminar)
  const d = dMm / 1000;
  const eps = material === "STEEL" ? EPS_STEEL : EPS_PLASTIC;
  // Swamee-Jain approximation for turbulent flow
  return 0.25 / Math.pow(Math.log10(eps / (3.7 * d) + 5.74 / Math.pow(re, 0.9)), 2);
}

function calcPipeDrop(
  pipe: PipeData,
  flowM3h: number
): { pipeKpa: number; fittingKpa: number; v: number; re: number; f: number } {
  if (flowM3h <= 0 || pipe.innerDiameterMm <= 0 || pipe.lengthM <= 0) {
    return { pipeKpa: 0, fittingKpa: 0, v: 0, re: 0, f: 0 };
  }
  const v = calcVelocity(flowM3h, pipe.innerDiameterMm);
  const re = calcReynolds(v, pipe.innerDiameterMm);
  const f = calcFrictionFactor(re, pipe.innerDiameterMm, pipe.material);
  const d = pipe.innerDiameterMm / 1000;
  const dyn = (RHO * v * v) / 2;

  // Darcy-Weisbach: ΔP = f × (L/D) × ρv²/2
  const pipePa = f * (pipe.lengthM / d) * dyn;

  // Local losses: ΔP = Σζ × ρv²/2
  const totalZeta = pipe.fittings.reduce((s, ft) => s + ft.zeta * ft.count, 0);
  const fittingPa = totalZeta * dyn;

  return { pipeKpa: pipePa / 1000, fittingKpa: fittingPa / 1000, v, re, f };
}

// ─── Graph topology helpers ───────────────────────────────────────────────────

function reachableFCUs(
  startId: string,
  excludeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] {
  const result: string[] = [];
  const visited = new Set<string>([excludeId]);
  const queue = [startId];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);

    if (nodes.find((n) => n.id === cur)?.data.nodeType === "FAN_COIL") {
      result.push(cur);
    }
    for (const e of edges) {
      if (e.source === cur && !visited.has(e.target)) queue.push(e.target);
      if (e.target === cur && !visited.has(e.source)) queue.push(e.source);
    }
  }
  return result;
}

// For each pipe edge, find which FCUs it serves based on circuit direction:
// Supply pipes: FCUs reachable from edge.target (flow goes toward FCU)
// Return pipes: FCUs reachable from edge.source (flow comes FROM FCU)
function edgeServedFCUs(
  edge: GraphEdge,
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] {
  const ct = edge.data.pipe.circuitType;
  const isReturn =
    ct === "COMMON_RETURN" || ct === "CHW_RETURN" || ct === "HHW_RETURN";
  return isReturn
    ? reachableFCUs(edge.source, edge.target, nodes, edges)
    : reachableFCUs(edge.target, edge.source, nodes, edges);
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function runCalculation(
  systemType: SystemType,
  nodes: GraphNode[],
  edges: GraphEdge[]
): CalculationResult {
  const msgs: ValidationMessage[] = [];

  const fcuNodes = nodes.filter((n) => n.data.nodeType === "FAN_COIL");
  const pumpNodes = nodes.filter((n) => n.data.nodeType === "PUMP");
  const chillerNodes = nodes.filter((n) => n.data.nodeType === "CHILLER");
  const hwsNodes = nodes.filter((n) => n.data.nodeType === "HOT_WATER_SOURCE");

  if (pumpNodes.length === 0)
    msgs.push({ severity: "error", message: "სისტემა მოითხოვს მინიმუმ 1 PUMP ნოდს." });
  if (fcuNodes.length === 0)
    msgs.push({ severity: "error", message: "სისტემა მოითხოვს მინიმუმ 1 FAN_COIL ნოდს." });
  if (chillerNodes.length === 0 && hwsNodes.length === 0)
    msgs.push({ severity: "error", message: "სისტემა მოითხოვს CHILLER ან HOT_WATER_SOURCE." });

  // ── Step 1: FCU flows ──────────────────────────────────────────────────────
  const fcuFlowCache = new Map<string, { cooling: number; heating: number }>();

  for (const n of fcuNodes) {
    const fcu = n.data.fcu;
    if (!fcu) continue;

    const flows = calcFCUFlows(fcu);
    fcuFlowCache.set(n.id, flows);

    if (fcu.coolingCapacityKw < 0 || fcu.heatingCapacityKw < 0)
      msgs.push({ severity: "error", message: `FCU "${fcu.tag}": სიმძლავრე < 0.`, entityId: n.id });

    const chwDt = Math.abs(fcu.chwReturnTempC - fcu.chwSupplyTempC);
    const hhwDt = Math.abs(fcu.hhwReturnTempC - fcu.hhwSupplyTempC);
    if (fcu.coolingCapacityKw > 0 && chwDt <= 0)
      msgs.push({ severity: "error", message: `FCU "${fcu.tag}": CHW ΔT=0 — შეამოწმე ტემპერატურები.`, entityId: n.id });
    if (fcu.heatingCapacityKw > 0 && hhwDt <= 0)
      msgs.push({ severity: "error", message: `FCU "${fcu.tag}": HHW ΔT=0 — შეამოწმე ტემპერატურები.`, entityId: n.id });
    if (fcu.valvePressureDropKpa === 0)
      msgs.push({ severity: "warning", message: `FCU "${fcu.tag}": valve ΔP=0 — სარქველი შეყვანილი არ არის.`, entityId: n.id });
    if (fcu.coolingCoilPressureDropKpa === 0 && fcu.coolingCapacityKw > 0)
      msgs.push({ severity: "warning", message: `FCU "${fcu.tag}": cooling coil ΔP=0.`, entityId: n.id });
    if (
      systemType === "FOUR_PIPE" &&
      fcu.heatingCapacityKw > 0 &&
      hwsNodes.length === 0
    )
      msgs.push({
        severity: "warning",
        message: `FCU "${fcu.tag}": 4-pipe სისტემაში გათბობა, მაგრამ HOT_WATER_SOURCE არ არის.`,
      });
  }

  // ── Step 2: Pipe flows and pressure drops ──────────────────────────────────
  const pipeResults: PipeFlowResult[] = [];

  for (const edge of edges) {
    const pipe = edge.data.pipe;

    if (pipe.lengthM <= 0)
      msgs.push({ severity: "error", message: `Pipe "${pipe.tag}": სიგრძე ≤ 0.`, entityId: edge.id });
    if (pipe.innerDiameterMm <= 0)
      msgs.push({ severity: "error", message: `Pipe "${pipe.tag}": შიდა დიამეტრი ≤ 0.`, entityId: edge.id });

    if (
      systemType === "TWO_PIPE" &&
      (pipe.circuitType === "CHW_SUPPLY" ||
        pipe.circuitType === "CHW_RETURN" ||
        pipe.circuitType === "HHW_SUPPLY" ||
        pipe.circuitType === "HHW_RETURN")
    )
      msgs.push({
        severity: "error",
        message: `Pipe "${pipe.tag}": 2-pipe სისტემაში CHW/HHW circuit type არ გამოიყენება.`,
        entityId: edge.id,
      });

    if (
      systemType === "FOUR_PIPE" &&
      (pipe.circuitType === "COMMON_SUPPLY" || pipe.circuitType === "COMMON_RETURN")
    )
      msgs.push({
        severity: "error",
        message: `Pipe "${pipe.tag}": 4-pipe სისტემაში COMMON circuit type არ გამოიყენება.`,
        entityId: edge.id,
      });

    const servedFCUIds = edgeServedFCUs(edge, nodes, edges);

    let flowM3h = 0;
    for (const fcuId of servedFCUIds) {
      const flows = fcuFlowCache.get(fcuId);
      if (!flows) continue;
      if (systemType === "TWO_PIPE") {
        flowM3h += Math.max(flows.cooling, flows.heating);
      } else {
        if (pipe.circuitType === "CHW_SUPPLY" || pipe.circuitType === "CHW_RETURN")
          flowM3h += flows.cooling;
        else if (pipe.circuitType === "HHW_SUPPLY" || pipe.circuitType === "HHW_RETURN")
          flowM3h += flows.heating;
      }
    }

    const { pipeKpa, fittingKpa, v, re, f } = calcPipeDrop(pipe, flowM3h);
    const totalKpa = pipeKpa + fittingKpa;
    const dpPerM = pipe.lengthM > 0 ? (pipeKpa * 1000) / pipe.lengthM : 0;

    if (v > 0 && v < 0.3)
      msgs.push({ severity: "warning", message: `Pipe "${pipe.tag}": v=${v.toFixed(2)} m/s < 0.3 m/s — ნალექის რისკი.`, entityId: edge.id });
    if (servedFCUIds.length <= 1 && v > 0.8)
      msgs.push({ severity: "warning", message: `Pipe "${pipe.tag}": ტოტი v=${v.toFixed(2)} m/s > 0.8 m/s.`, entityId: edge.id });
    if (servedFCUIds.length > 1 && v > 1.8)
      msgs.push({ severity: "warning", message: `Pipe "${pipe.tag}": მაგისტრალი v=${v.toFixed(2)} m/s > 1.8 m/s.`, entityId: edge.id });
    if (dpPerM > 300)
      msgs.push({ severity: "warning", message: `Pipe "${pipe.tag}": ΔP/m=${dpPerM.toFixed(0)} Pa/m > 300 Pa/m.`, entityId: edge.id });

    pipeResults.push({
      edgeId: edge.id,
      tag: pipe.tag || edge.id,
      circuitType: pipe.circuitType,
      dn: pipe.dn,
      innerDiameterMm: pipe.innerDiameterMm,
      lengthM: pipe.lengthM,
      flowM3h,
      velocityMs: v,
      reynoldsNumber: re,
      frictionFactor: f,
      pipePressureDropKpa: pipeKpa,
      fittingPressureDropKpa: fittingKpa,
      totalPressureDropKpa: totalKpa,
      pressureDropPerMeterPaM: dpPerM,
      servedFCUIds,
    });
  }

  // ── Step 3: FCU path pressures ─────────────────────────────────────────────
  const fcuResults: FCUFlowResult[] = [];
  let maxTwoPath = -Infinity;
  let maxCHW = -Infinity;
  let maxHHW = -Infinity;
  let criticalFCUId: string | null = null;
  let criticalCHWFCUId: string | null = null;
  let criticalHHWFCUId: string | null = null;

  for (const n of fcuNodes) {
    const fcu = n.data.fcu;
    const flows = fcuFlowCache.get(n.id);
    if (!fcu || !flows) continue;

    let commonS = 0, commonR = 0, chwS = 0, chwR = 0, hhwS = 0, hhwR = 0;

    for (const pr of pipeResults) {
      if (!pr.servedFCUIds.includes(n.id)) continue;
      const dp = pr.totalPressureDropKpa;
      switch (pr.circuitType) {
        case "COMMON_SUPPLY": commonS += dp; break;
        case "COMMON_RETURN": commonR += dp; break;
        case "CHW_SUPPLY":   chwS   += dp; break;
        case "CHW_RETURN":   chwR   += dp; break;
        case "HHW_SUPPLY":   hhwS   += dp; break;
        case "HHW_RETURN":   hhwR   += dp; break;
      }
    }

    const internal2Kpa =
      Math.max(fcu.coolingCoilPressureDropKpa, fcu.heatingCoilPressureDropKpa) +
      fcu.valvePressureDropKpa +
      fcu.accessoryPressureDropKpa;
    const totalTwoKpa = commonS + internal2Kpa + commonR;

    const internalCHW = fcu.coolingCoilPressureDropKpa + fcu.valvePressureDropKpa + fcu.accessoryPressureDropKpa;
    const chwPathKpa = flows.cooling > 0 ? chwS + internalCHW + chwR : 0;

    const internalHHW = fcu.heatingCoilPressureDropKpa + fcu.valvePressureDropKpa + fcu.accessoryPressureDropKpa;
    const hhwPathKpa = flows.heating > 0 ? hhwS + internalHHW + hhwR : 0;

    const totalPathKpa =
      systemType === "TWO_PIPE" ? totalTwoKpa : Math.max(chwPathKpa, hhwPathKpa);

    if (systemType === "TWO_PIPE" && totalTwoKpa > maxTwoPath) {
      maxTwoPath = totalTwoKpa;
      criticalFCUId = n.id;
    }
    if (chwPathKpa > maxCHW) { maxCHW = chwPathKpa; criticalCHWFCUId = n.id; }
    if (hhwPathKpa > maxHHW) { maxHHW = hhwPathKpa; criticalHHWFCUId = n.id; }

    fcuResults.push({
      nodeId: n.id,
      tag: fcu.tag || n.id,
      coolingFlowM3h: flows.cooling,
      heatingFlowM3h: flows.heating,
      designFlowM3h: Math.max(flows.cooling, flows.heating),
      chilledWaterFlowM3h: flows.cooling,
      hotWaterFlowM3h: flows.heating,
      supplyPathKpa: systemType === "TWO_PIPE" ? commonS : chwS,
      internalKpa: systemType === "TWO_PIPE" ? internal2Kpa : internalCHW,
      returnPathKpa: systemType === "TWO_PIPE" ? commonR : chwR,
      totalPathKpa,
      chwPathKpa,
      hhwPathKpa,
      isCriticalPath: false,
      isCriticalCHW: false,
      isCriticalHHW: false,
    });
  }

  for (const r of fcuResults) {
    if (r.nodeId === criticalFCUId) r.isCriticalPath = true;
    if (r.nodeId === criticalCHWFCUId) r.isCriticalCHW = true;
    if (r.nodeId === criticalHHWFCUId) r.isCriticalHHW = true;
  }

  // ── Step 4: Pump duty ──────────────────────────────────────────────────────
  const pumpResults: PumpDutyResult[] = [];

  if (systemType === "TWO_PIPE") {
    const totalFlow = fcuResults.reduce((s, r) => s + r.designFlowM3h, 0);
    const pressure = Math.max(maxTwoPath, 0);
    const headM = pressure / G;
    if (headM > 30)
      msgs.push({ severity: "warning", message: `ტუმბოს სათავე ${headM.toFixed(1)} m > 30 m — შეამოწმე ΔP მნიშვნელობები.` });
    pumpResults.push({
      label: "Common Pump",
      circuitType: "COMMON SUPPLY / RETURN",
      flowM3h: totalFlow,
      pressureKpa: pressure,
      headM,
      headWithSafetyM: headM * 1.1,
    });
  } else {
    const totalCHW = fcuResults.reduce((s, r) => s + r.chilledWaterFlowM3h, 0);
    const totalHHW = fcuResults.reduce((s, r) => s + r.hotWaterFlowM3h, 0);
    const chwP = Math.max(maxCHW, 0);
    const hhwP = Math.max(maxHHW, 0);
    const chwH = chwP / G;
    const hhwH = hhwP / G;
    pumpResults.push({
      label: "CHW Pump",
      circuitType: "CHW SUPPLY / CHW RETURN",
      flowM3h: totalCHW,
      pressureKpa: chwP,
      headM: chwH,
      headWithSafetyM: chwH * 1.1,
    });
    pumpResults.push({
      label: "HHW Pump",
      circuitType: "HHW SUPPLY / HHW RETURN",
      flowM3h: totalHHW,
      pressureKpa: hhwP,
      headM: hhwH,
      headWithSafetyM: hhwH * 1.1,
    });
  }

  return {
    systemType,
    fcuResults,
    pipeResults,
    pumpResults,
    validationMessages: msgs,
    criticalFCUId,
    criticalCHWFCUId,
    criticalHHWFCUId,
  };
}
