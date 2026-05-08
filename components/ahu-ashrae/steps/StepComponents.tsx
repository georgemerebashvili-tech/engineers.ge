'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Box, AlertTriangle,
  Move3d, RectangleHorizontal, RectangleVertical, Square,
  type LucideIcon,
} from 'lucide-react';
import type { AhuWizardState, AhuUnit } from '@/lib/ahu-ashrae/types';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import type { SectionConfig, SectionType, HousingSection } from '@/lib/ahu-ashrae/sections';
import { flattenHousings } from '@/lib/ahu-ashrae/sections/types';
import { SECTION_VISUALS, CASING_KG_PER_M } from '@/lib/ahu-ashrae/section-visuals';
import { validateOrder, type OrderViolation } from '@/lib/ahu-ashrae/section-order-rules';
import { AhuOrthoSchematic, type AhuOrthoView } from '../AhuOrthoSchematic';
import { AhuCasingSchematic } from '../AhuCasingSchematic';
import { ComponentPalette } from '../ComponentPalette';

type AhuViewMode = 'persp' | AhuOrthoView;

const AhuStlViewer = dynamic(
  () => import('../AhuStlViewer').then((m) => m.AhuStlViewer),
  { ssr: false, loading: () => <ViewerLoading /> },
);

const VIEW_BUTTONS: Array<{ id: AhuViewMode; icon: LucideIcon; label: string; title: string }> = [
  { id: 'persp', icon: Move3d,              label: '3D',     title: 'პერსპექტივა — orbit' },
  { id: 'side',  icon: RectangleHorizontal, label: 'გვერდი', title: 'გვერდხედი' },
  { id: 'front', icon: Square,              label: 'წინა',   title: 'წინხედი' },
  { id: 'top',   icon: RectangleVertical,   label: 'ზემო',   title: 'ზედხედი' },
];

interface Props {
  state: AhuWizardState;
  unit: AhuUnit;
  onUpdate: (patch: Partial<AhuWizardState>) => void;
  chain?: ChainResult;
}

export function StepComponents({ state, unit, onUpdate, chain }: Props) {
  const housings: HousingSection[] = state.housingSections ?? [];
  const sections: SectionConfig[] = useMemo(() => flattenHousings(housings), [housings]);

  const violations: OrderViolation[] = useMemo(
    () => validateOrder(sections, unit.ahuType ?? undefined),
    [sections, unit.ahuType],
  );

  // Set of section IDs that are part of a violation — passed to schematic for highlight
  const violatedIds: ReadonlySet<string> = useMemo(() => {
    const ids = new Set<string>();
    violations.forEach(v => {
      if (sections[v.index])       ids.add(sections[v.index].id);
      if (v.conflictWith >= 0 && sections[v.conflictWith]) ids.add(sections[v.conflictWith].id);
    });
    return ids;
  }, [violations, sections]);

  const [dropError, setDropError] = useState<{ msg: string; ts: number } | null>(null);
  useEffect(() => {
    if (!dropError) return;
    const t = setTimeout(() => setDropError(null), 5000);
    return () => clearTimeout(t);
  }, [dropError]);

  function handleHousingsChange(next: HousingSection[]) {
    onUpdate({
      housingSections: next,
      sections: flattenHousings(next).map((s, i) => ({ ...s, order: i })),
    });
  }

  // ── 3D viewer data ─────────────────────────────────────────────────────────

  const viewerSections = useMemo(
    () => sections.filter((s) => s.enabled).map((s, i) => {
      const v = SECTION_VISUALS[s.spec.type];
      const outletNode = chain?.states[i + 1];
      return {
        id: s.id, label: s.label, color: v.color, width: v.width3D, type: s.spec.type,
        outletTdb: outletNode?.state.tdb, outletRh: outletNode?.state.rh,
        outletW: outletNode?.state.w, energyKw: outletNode?.energy, deltaP: outletNode?.deltaP,
      };
    }),
    [sections, chain],
  );

  const inletState = chain?.states[0]
    ? { tdb: chain.states[0].state.tdb, rh: chain.states[0].state.rh, w: chain.states[0].state.w }
    : undefined;

  const totalWeightKg = useMemo(() => {
    if (viewerSections.length === 0) return 0;
    const totalLenM = viewerSections.reduce((s, x) => s + x.width, 0);
    const componentKg = sections.filter((s) => s.enabled).reduce((sum, s) => sum + (SECTION_VISUALS[s.spec.type]?.weightKg ?? 0), 0);
    return componentKg + totalLenM * CASING_KG_PER_M;
  }, [sections, viewerSections]);

  const [viewMode, setViewMode] = useState<AhuViewMode>('persp');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Drop error toast */}
      {dropError && (
        <div
          className="rounded-lg border p-3 text-[11px] flex items-start gap-2"
          style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}
          role="alert"
        >
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-bold mb-0.5">განთავსება შეუძლებელია</div>
            <div>{dropError.msg}</div>
          </div>
        </div>
      )}

      {/* ── Component palette ── */}
      <ComponentPalette />

      {/* ── AHU section schematic ── */}
      <section
        className="rounded-xl border p-4"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="3" width="13" height="9" rx="1" stroke="var(--blue)" strokeWidth="1.5" />
            <line x1="4" y1="3" x2="4" y2="12" stroke="var(--blue)" strokeWidth="1" />
            <line x1="8" y1="3" x2="8" y2="12" stroke="var(--blue)" strokeWidth="1" />
            <line x1="12" y1="3" x2="12" y2="12" stroke="var(--blue)" strokeWidth="1" />
          </svg>
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
            AHU კორპუსი
          </h2>
          <span className="ml-auto text-[9px]" style={{ color: 'var(--text-3)' }}>
            L = upstream · C = center · R = downstream
          </span>
          {violations.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#b45309' }}>
              <AlertTriangle size={11} />
              {violations.length}
            </div>
          )}
        </div>

        <AhuCasingSchematic
          housings={housings}
          violatedIds={violatedIds}
          onHousingsChange={handleHousingsChange}
          onDropError={(msg) => msg ? setDropError({ msg, ts: Date.now() }) : setDropError(null)}
        />

        {violations.length > 0 && (
          <ViolationBanner violations={violations} sections={sections} />
        )}
      </section>

      {/* ── 3D / Ortho viewer ── */}
      <section
        className="rounded-xl border p-4 flex flex-col"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Box size={16} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              {viewMode === 'persp' ? '3D ნახვა' : 'ორთოგრაფიული ხედი'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ViewModeToolbar value={viewMode} onChange={setViewMode} />
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              {viewerSections.length} სექცია
            </span>
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
          {viewMode === 'persp'
            ? 'orbit / zoom — მაუსით. სექციათა რიგი ცოცხლად აისახება.'
            : 'ორთოგრაფიული ხედი — ზომები მმ-ში, სრული გაბარიტი + წონა title block-ში.'}
        </p>

        <div
          className="rounded-lg overflow-hidden border"
          style={{
            borderColor: 'var(--bdr)',
            background: viewMode === 'persp'
              ? 'linear-gradient(180deg, #eef3f9 0%, #d8e2ee 100%)'
              : '#f7f9fc',
            minHeight: 480,
          }}
        >
          {viewerSections.length > 0 ? (
            viewMode === 'persp' ? (
              <AhuStlViewer sections={viewerSections} />
            ) : (
              <AhuOrthoSchematic
                sections={viewerSections}
                view={viewMode}
                weightKg={totalWeightKg}
                inletState={inletState}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-3)', minHeight: 480 }}>
              ჩართული სექცია არ არის — გადაიტანეთ კომპონენტი სქემაში
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── View mode toolbar ────────────────────────────────────────────────────────

function ViewModeToolbar({ value, onChange }: { value: AhuViewMode; onChange: (v: AhuViewMode) => void }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--bdr-2)' }}>
      {VIEW_BUTTONS.map((b) => {
        const Icon = b.icon;
        const active = value === b.id;
        return (
          <button key={b.id} type="button" onClick={() => onChange(b.id)} title={b.title}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-colors"
            style={active ? { background: 'var(--blue)', color: '#fff' } : { background: 'var(--sur)', color: 'var(--text-3)' }}
          >
            <Icon size={11} />
            <span>{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Violation detail banner ──────────────────────────────────────────────────

const TYPE_LABELS: Record<SectionType, string> = {
  damper: 'დემ.', filter: 'ფილ.', mixing_box: 'MBX', heat_recovery: 'HR',
  preheat: 'PHC', cooling_coil: 'CC', reheat: 'RHC', humidifier: 'HUM',
  fan: 'FAN', silencer: 'SIL',
};

function ViolationBanner({ violations, sections }: { violations: OrderViolation[]; sections: SectionConfig[] }) {
  const seen = new Set<string>();
  const top = violations.filter((v) => { if (seen.has(v.rule)) return false; seen.add(v.rule); return true; }).slice(0, 3);
  const more = violations.length - top.length;
  return (
    <div className="mt-3 rounded-lg border p-3 text-[11px]"
      style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#78350f' }}>
      <div className="flex items-center gap-1.5 mb-1.5 font-bold">
        <AlertTriangle size={12} /> სტანდარტის დარღვევა ({violations.length})
      </div>
      <ul className="space-y-1 list-disc pl-4">
        {top.map((v, i) => (
          <li key={i}>
            {v.conflictWith >= 0
              ? <><span className="font-mono opacity-70">#{v.conflictWith + 1}→#{v.index + 1}</span>{' '}
                  <span className="opacity-80">({TYPE_LABELS[sections[v.conflictWith]?.spec.type] ?? '—'} → {TYPE_LABELS[sections[v.index]?.spec.type] ?? '—'})</span>
                  : {v.message}</>
              : <><span className="font-mono opacity-70">#{v.index + 1}</span>{' '}
                  <span className="opacity-80">({TYPE_LABELS[sections[v.index]?.spec.type] ?? '—'})</span>
                  : {v.message}</>
            }
          </li>
        ))}
      </ul>
      {more > 0 && <div className="mt-1.5 opacity-70">… კიდევ {more} დარღვევა.</div>}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ViewerLoading() {
  return (
    <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-3)' }}>
      3D viewer იტვირთება…
    </div>
  );
}
