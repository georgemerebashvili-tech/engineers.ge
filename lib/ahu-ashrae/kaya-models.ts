/**
 * KAYA AHU casing model catalog.
 *
 * Model N = N × standard 595 mm filter panels.
 * Face area = filterCols × filterRows × PANEL_MM² (nominal).
 * Max airflow at Eurovent-rated face velocity (m/s column in catalog).
 *
 * Source: KAYA catalog table (2025).
 */

/** Nominal filter panel side length (mm) — EU standard EN 15805 */
export const KAYA_PANEL_MM = 595;

/** Eurovent 6/3 / EN 13053 recommended max face velocity per ISO 16890 group */
export const EUROVENT_MAX_VEL: Record<string, number> = {
  G4:       2.5,
  M5:       2.5,
  F7:       2.0,
  F9:       1.75,
  H13:      1.5,
  H14:      1.5,
  carbon:   2.5,
  electric: 2.5,
};

export interface KayaModel {
  id: string;
  /** Short display label */
  displayName: string;
  /** Full encoded catalog name */
  fullName: string;
  /** External casing height (m) */
  casingH: number;
  /** External casing width (m) */
  casingW: number;
  /** Max airflow (m³/h) per Eurovent rating */
  maxFlowM3h: number;
  /** Rated face velocity (m/s) at max flow */
  ratedFaceVel: number;
  /** Total filter bank face width (m) */
  filterFaceW: number;
  /** Total filter bank face height (m) */
  filterFaceH: number;
  /** Total filter panel count = filterCols × filterRows */
  filterCount: number;
  filterCols: number;
  filterRows: number;
}

export const KAYA_MODELS: KayaModel[] = [
  {
    id: 'KAYA-1', displayName: 'Model 1',
    fullName: 'KAYA Model 1-H-0.8-W-0.96-2550-2.5-CW-0.7-CH-0.40',
    casingH: 0.80, casingW: 0.96, maxFlowM3h: 2550,  ratedFaceVel: 2.50,
    filterFaceW: 0.70, filterFaceH: 0.40, filterCount: 1,  filterCols: 1, filterRows: 1,
  },
  {
    id: 'KAYA-2', displayName: 'Model 2',
    fullName: 'KAYA Model 2-H-0.8-W-1.36-5100-2.35-CW-1.2-CH-0.50',
    casingH: 0.80, casingW: 1.36, maxFlowM3h: 5100,  ratedFaceVel: 2.35,
    filterFaceW: 1.20, filterFaceH: 0.50, filterCount: 2,  filterCols: 2, filterRows: 1,
  },
  {
    id: 'KAYA-3', displayName: 'Model 3',
    fullName: 'KAYA Model 3-H-0.8-W-1.97-7650-2.5-CW-1.7-CH-0.5',
    casingH: 0.80, casingW: 1.97, maxFlowM3h: 7650,  ratedFaceVel: 2.50,
    filterFaceW: 1.70, filterFaceH: 0.50, filterCount: 3,  filterCols: 3, filterRows: 1,
  },
  {
    id: 'KAYA-4', displayName: 'Model 4',
    fullName: 'KAYA Model 4-H-1.36-W-1.36-10200-2.5-CW-1.1-CH-1.03',
    casingH: 1.36, casingW: 1.36, maxFlowM3h: 10200, ratedFaceVel: 2.50,
    filterFaceW: 1.10, filterFaceH: 1.03, filterCount: 4,  filterCols: 2, filterRows: 2,
  },
  {
    id: 'KAYA-6', displayName: 'Model 6',
    fullName: 'KAYA Model 6-H-1.36-W-1.97-15300-2.5-CW-1.5-CH-1.13',
    casingH: 1.36, casingW: 1.97, maxFlowM3h: 15300, ratedFaceVel: 2.50,
    filterFaceW: 1.50, filterFaceH: 1.13, filterCount: 6,  filterCols: 3, filterRows: 2,
  },
  {
    id: 'KAYA-8', displayName: 'Model 8',
    fullName: 'KAYA Model 8-H-1.36-W-2.58-20400-2.4-CW-2.35-CH-1.00',
    casingH: 1.36, casingW: 2.58, maxFlowM3h: 20400, ratedFaceVel: 2.40,
    filterFaceW: 2.35, filterFaceH: 1.00, filterCount: 8,  filterCols: 4, filterRows: 2,
  },
  {
    id: 'KAYA-12', displayName: 'Model 12',
    fullName: 'KAYA Model 12-H-1.98-W-2.58-30600-2.4-CW-2.3-CH-1.53',
    casingH: 1.98, casingW: 2.58, maxFlowM3h: 30600, ratedFaceVel: 2.40,
    filterFaceW: 2.30, filterFaceH: 1.53, filterCount: 12, filterCols: 4, filterRows: 3,
  },
  {
    id: 'KAYA-16', displayName: 'Model 16',
    fullName: 'KAYA Model 16-H-2.6-W-2.58-40800-2.46-CW-2-CH-2.30',
    casingH: 2.60, casingW: 2.58, maxFlowM3h: 40800, ratedFaceVel: 2.46,
    filterFaceW: 2.00, filterFaceH: 2.30, filterCount: 16, filterCols: 4, filterRows: 4,
  },
];

/** Return models that can handle at least `flowM3h` m³/h */
export function modelsForFlow(flowM3h: number): KayaModel[] {
  return KAYA_MODELS.filter((m) => m.maxFlowM3h >= flowM3h);
}

export function getKayaModel(id: string): KayaModel | undefined {
  return KAYA_MODELS.find((m) => m.id === id);
}

/**
 * Actual face velocity at the given flow.
 * Uses total filter bank area (filterFaceW × filterFaceH).
 */
export function faceVelocity(model: KayaModel, flowM3h: number): number {
  const areaM2 = model.filterFaceW * model.filterFaceH;
  return flowM3h / 3600 / areaM2;
}

/**
 * Eurovent 6/3 compliance result for a given filter class and design flow.
 */
export function euroventCheck(
  model: KayaModel,
  flowM3h: number,
  filterClass: string,
): { vel: number; limit: number; pass: boolean; utilisationPct: number } {
  const vel   = faceVelocity(model, flowM3h);
  const limit = EUROVENT_MAX_VEL[filterClass] ?? 2.5;
  return { vel, limit, pass: vel <= limit, utilisationPct: (vel / limit) * 100 };
}
