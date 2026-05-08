import type { SectionType, SlotKey } from './sections/types';

export type DragPayload =
  | { source: 'palette'; sectionType: SectionType; defaultParams?: unknown; paletteId: string }
  | { source: 'slot'; housingId: string; slotKey: SlotKey; sectionType: SectionType };

let _active: DragPayload | null = null;

export function setActiveDrag(p: DragPayload | null): void { _active = p; }
export function getActiveDrag(): DragPayload | null        { return _active; }
