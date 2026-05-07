/**
 * Narrative types — every section process emits a NarrativeBullet describing
 * what it did to the air state. Bullets are aggregated by the chain runner and
 * displayed live in StepSummary and the final report in StepReport.
 */

export interface NarrativeBullet {
  /** sectionId from SectionConfig — links bullet back to the chain step */
  sectionId: string;
  /** Human label of the section, e.g. "G4 ფილტრი" */
  sectionLabel: string;
  /** Localized one-line summary in Georgian */
  summary: string;
  /** Detail bullets — equations applied, deltas, units */
  details: string[];
  /** Standard reference, e.g. "ASHRAE HOF 2021 Ch.1 Eq.30" */
  reference?: string;
  /** Severity flag for compliance */
  severity?: 'ok' | 'warn' | 'fail';
}

export interface ChainJournal {
  bullets: NarrativeBullet[];
  /** Aggregated headline summary in Georgian, written by the chain runner */
  headline: string;
}

// ─── Formatting helpers used by section processors ────────────────────────────

export function fmtT(c: number): string {
  return `${c.toFixed(1)}°C`;
}

export function fmtW(w: number): string {
  return `${(w * 1000).toFixed(2)} g/kg`;
}

export function fmtRh(rh: number): string {
  return `${(rh * 100).toFixed(0)}%`;
}

export function fmtKw(kw: number): string {
  return `${kw.toFixed(2)} kW`;
}

export function fmtPa(pa: number): string {
  return `${pa.toFixed(0)} Pa`;
}

/** "32°C / 50% RH" canonical state-label */
export function fmtState(tdb: number, rh: number): string {
  return `${fmtT(tdb)} / ${fmtRh(rh)}`;
}
