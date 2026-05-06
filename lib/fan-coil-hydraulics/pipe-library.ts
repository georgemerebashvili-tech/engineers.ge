import type { PipeMaterial } from "./hydraulic-types";

export interface PipeSpec {
  dn: string;
  innerDiameterMm: number;
}

export const STEEL_PIPES: PipeSpec[] = [
  { dn: "DN15", innerDiameterMm: 16 },
  { dn: "DN20", innerDiameterMm: 21 },
  { dn: "DN25", innerDiameterMm: 27 },
  { dn: "DN32", innerDiameterMm: 35 },
  { dn: "DN40", innerDiameterMm: 41 },
  { dn: "DN50", innerDiameterMm: 53 },
  { dn: "DN65", innerDiameterMm: 68 },
  { dn: "DN80", innerDiameterMm: 80 },
  { dn: "DN100", innerDiameterMm: 102 },
];

export const PLASTIC_PIPES: PipeSpec[] = [
  { dn: "DN16", innerDiameterMm: 12 },
  { dn: "DN20", innerDiameterMm: 16 },
  { dn: "DN25", innerDiameterMm: 20 },
  { dn: "DN32", innerDiameterMm: 26 },
  { dn: "DN40", innerDiameterMm: 32 },
  { dn: "DN50", innerDiameterMm: 40 },
  { dn: "DN63", innerDiameterMm: 51 },
  { dn: "DN75", innerDiameterMm: 61 },
  { dn: "DN90", innerDiameterMm: 73 },
];

export const DEFAULT_FITTINGS: { name: string; zeta: number }[] = [
  { name: "Elbow 90°", zeta: 1.5 },
  { name: "Elbow 45°", zeta: 0.6 },
  { name: "Tee (branch flow)", zeta: 1.5 },
  { name: "Tee (straight flow)", zeta: 0.5 },
  { name: "Gate valve (full open)", zeta: 0.1 },
  { name: "Ball valve (full open)", zeta: 0.05 },
  { name: "Globe valve", zeta: 8.0 },
  { name: "Check valve (swing)", zeta: 2.5 },
  { name: "Reducer / expander", zeta: 0.3 },
  { name: "Expansion joint", zeta: 0.5 },
];

export function getPipeLibrary(material: PipeMaterial): PipeSpec[] {
  return material === "STEEL" ? STEEL_PIPES : PLASTIC_PIPES;
}

export function getDefaultInnerDiameter(
  material: PipeMaterial,
  dn: string
): number | undefined {
  return getPipeLibrary(material).find((p) => p.dn === dn)?.innerDiameterMm;
}
