'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Wind, Thermometer, Fan, FileText, Download,
  ChevronRight, CheckCircle2, ArrowLeft,
  Layers, Boxes, Gauge, Maximize2, Minimize2,
  Lock, AlertTriangle,
} from 'lucide-react';
import type {
  AhuWizardState, WizardStep, AhuView, AhuProject, AhuUnit, AhuType,
  PsychrometricResults,
} from '@/lib/ahu-ashrae/types';
import { GE_CITIES, resolveCity } from '@/lib/ahu-ashrae/climate-data';
import {
  statePointFromWb, statePointFromRh, mixAir,
  apparatusDewPoint, contactFactor,
  airDensity,
} from '@/lib/ahu-ashrae/psychrometrics';
import {
  listProjects, saveProject, deleteProject,
  addUnit, updateUnit, deleteUnit, getUnit,
  loadWizardState, saveWizardState,
} from '@/lib/ahu-ashrae/storage';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';
import { buildPreset } from '@/lib/ahu-ashrae/section-presets';
import { fromDbWb, fromDbRh } from '@/lib/ahu-ashrae/air-state';
import { runChain, type ChainResult } from '@/lib/ahu-ashrae/chain';
import {
  computeStepStatuses, canNavigate, navigationPatch, dirtyAfterEdit,
  stepIndex as flowStepIndex, STEP_ORDER,
  type StepStatus,
} from '@/lib/ahu-ashrae/wizard-flow';

import { AhuProjectsRail } from './AhuProjectsRail';
import { AhuRegister } from './AhuRegister';
import { AhuRegisterUnit } from './AhuRegisterUnit';
import { AhuProjectOverview } from './AhuProjectOverview';
import { AhuLandingHint } from './AhuLandingHint';
import { AhuTypeSelector } from './AhuTypeSelector';
import { Step1Inputs } from './steps/Step1Inputs';
import { Step2Psychro } from './steps/Step2Psychro';
import { StepComponents } from './steps/StepComponents';
import { StepSizing } from './steps/StepSizing';
import { StepFan } from './steps/StepFan';
import { StepSummary } from './steps/StepSummary';
import { StepReport } from './steps/StepReport';

// ─── Step metadata ─────────────────────────────────────────────────────────────

const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{size?: number; strokeWidth?: number}> }[] = [
  { id: 'ahu_type',   label: 'AHU სქემა',     icon: Layers },
  { id: 'inputs',     label: 'პარამეტრები',   icon: Wind },
  { id: 'components', label: 'კომპონენტები + 3D', icon: Boxes },
  { id: 'psychro',    label: 'ფსიქრომეტრია',  icon: Thermometer },
  { id: 'sizing',     label: 'სიზინგი + ΔP',  icon: Gauge },
  { id: 'fan',        label: 'კომ. შერჩევა',  icon: Boxes },
  { id: 'summary',    label: 'შეჯამება',      icon: FileText },
  { id: 'report',     label: 'რეპორტი (PDF)', icon: Download },
];

// ─── Default wizard state for a fresh AHU unit ────────────────────────────────

export function makeDefaultWizardState(project: AhuProject): AhuWizardState {
  const city = resolveCity(project.location, project.customCity) ?? GE_CITIES[0];
  return {
    currentStep: 'ahu_type',
    furthestReachedStep: 'ahu_type',
    selectedCity: city,
    design: {
      summerOutdoorDB: city.summerDB,
      summerOutdoorWB: city.summerMCWB,
      summerIndoorDB: 24,
      summerIndoorRH: 50,
      winterOutdoorDB: city.winterDB99,
      winterOutdoorRH: 80,
      winterIndoorDB: 22,
      winterIndoorRH: 40,
      pressure: city.pressure,
    },
    airflow: {
      supplyAirflow: 5000,
      oaFraction: 0.30,
      ventilationMethod: 'fraction',
      occupants: 50,
      floorArea: 500,
      spaceCategory: 'office',
    },
    coolingCoilInputs: {
      chwSupplyT: 7, chwReturnT: 12, faceVelocity: 2.25, rows: 6, fpi: 10,
    },
    heatingCoilInputs: { type: 'hot_water', hwSupplyT: 80, hwReturnT: 60 },
    fanInputs: {
      externalStaticPressure: 200, filterDeltaP: 100,
      coolingCoilDeltaP: 150, heatingCoilDeltaP: 60, hrDeltaP: 100, ductDeltaP: 200,
      fanEfficiency: 0.65, motorEfficiency: 0.92,
    },
    filterInputs: { mervRating: 11, preFilter: true, faceVelocity: 2.5 },
    hrInputs: { type: 'rotary_wheel', sensibleEffectiveness: 0.75, latentEffectiveness: 0.70 },
    sectionPresetId: 'mixing_with_hr',
    sections: buildPreset('mixing_with_hr', { supplyTdb: 14, oaFraction: 0.30 }),
  };
}

// ─── Psychro calc ──────────────────────────────────────────────────────────────

/** Default supply air target when chain hasn't yet defined one — typical
 *  ASHRAE coil-leaving conditions: roomDB − 12 °C @ 90% RH off-coil. The
 *  section pipeline (Step 3+) overrides this with the real chain output. */
const DEFAULT_SUPPLY_DELTA_T = 12;
const DEFAULT_SUPPLY_OFF_COIL_RH = 90;

function calcPsychro(state: AhuWizardState): PsychrometricResults | undefined {
  const { design, airflow } = state;
  const p = design.pressure;
  try {
    // Cooling psychrometric chart uses summer design conditions
    const oaFlow = airflow.supplyAirflow * airflow.oaFraction;
    const raFlow = airflow.supplyAirflow - oaFlow;
    const outdoor = statePointFromWb(design.summerOutdoorDB, design.summerOutdoorWB, 'O', 'გარე ჰაერი', p);
    const roomAir = statePointFromRh(design.summerIndoorDB, design.summerIndoorRH, 'R', 'ოთახის ჰაერი', p);
    const mixed = mixAir(outdoor, oaFlow, roomAir, raFlow, 'M', 'შერეული ჰაერი', p);
    const density = airDensity(mixed.tdb, mixed.w, p);
    const supplyTdb = design.summerIndoorDB - DEFAULT_SUPPLY_DELTA_T;
    const supplyAir = statePointFromRh(supplyTdb, DEFAULT_SUPPLY_OFF_COIL_RH, 'S', 'მიწოდების ჰაერი', p);
    const adp = apparatusDewPoint(mixed, supplyAir, p);
    const cf = contactFactor(mixed, supplyAir, adp);
    const massFlow = (airflow.supplyAirflow / 3600) * density;
    const sensible = massFlow * 1.006 * (mixed.tdb - supplyAir.tdb);
    const latent = massFlow * 2501 * (mixed.w - supplyAir.w);
    const total = massFlow * (mixed.h - supplyAir.h);
    const shr = total > 0 ? sensible / total : 1;
    return {
      outdoor, mixed, supplyAir, roomAir, adp,
      shr: Math.max(0, Math.min(1, shr)),
      contactFactor: cf,
      coolingCapacity: {
        sensible: Math.max(0, sensible),
        latent: Math.max(0, latent),
        total: Math.max(0, total),
      },
      airDensity: density,
    };
  } catch {
    return undefined;
  }
}

// ─── Top-level Component ──────────────────────────────────────────────────────

export function AhuAshrae() {
  const [view, setView] = useState<AhuView>('landing');
  const [projects, setProjects] = useState<AhuProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [wizardState, setWizardState] = useState<AhuWizardState | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Load projects from localStorage on mount
  useEffect(() => {
    setProjects(listProjects());
  }, []);

  // ESC key exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const refreshProjects = useCallback(() => setProjects(listProjects()), []);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const activeUnit = useMemo(
    () => activeProject?.units.find((u) => u.id === activeUnitId) ?? null,
    [activeProject, activeUnitId],
  );

  // ── Project handlers ──
  const handleNewProject = useCallback(() => setView('register_project'), []);

  const handleCreateProject = useCallback((p: AhuProject) => {
    saveProject(p);
    refreshProjects();
    setActiveProjectId(p.id);
    setActiveUnitId(null);
    setExpandedProjects((prev) => new Set([...prev, p.id]));
    setView('project_overview');
  }, [refreshProjects]);

  const handleDeleteProject = useCallback((id: string) => {
    deleteProject(id);
    if (id === activeProjectId) {
      setActiveProjectId(null);
      setActiveUnitId(null);
      setView('landing');
    }
    refreshProjects();
  }, [activeProjectId, refreshProjects]);

  const handleOpenProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setActiveUnitId(null);
    setExpandedProjects((prev) => new Set([...prev, id]));
    setView('project_overview');
  }, []);

  const toggleProjectExpand = useCallback((id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Unit handlers ──
  const handleNewUnit = useCallback(() => {
    if (!activeProjectId) return;
    setView('register_ahu');
  }, [activeProjectId]);

  const handleCreateUnit = useCallback((unit: AhuUnit) => {
    if (!activeProjectId) return;
    addUnit(activeProjectId, unit);
    const project = projects.find((p) => p.id === activeProjectId);
    if (project) {
      const initial = makeDefaultWizardState(project);
      saveWizardState(activeProjectId, unit.id, initial);
    }
    refreshProjects();
    setActiveUnitId(unit.id);
    setExpandedProjects((prev) => new Set([...prev, activeProjectId]));
    // Open wizard immediately
    const fresh = projects.find((p) => p.id === activeProjectId);
    if (fresh) {
      setWizardState(makeDefaultWizardState(fresh));
    }
    setView('wizard');
  }, [activeProjectId, projects, refreshProjects]);

  const handleOpenUnit = useCallback((projectId: string, unitId: string) => {
    const project = listProjects().find((p) => p.id === projectId);
    const unit = project?.units.find((u) => u.id === unitId);
    if (!project || !unit) return;
    const w = loadWizardState(projectId, unitId) ?? makeDefaultWizardState(project);
    setActiveProjectId(projectId);
    setActiveUnitId(unitId);
    setWizardState(w);
    setExpandedProjects((prev) => new Set([...prev, projectId]));
    setView('wizard');
  }, []);

  const handleDeleteUnit = useCallback((projectId: string, unitId: string) => {
    deleteUnit(projectId, unitId);
    if (unitId === activeUnitId) {
      setActiveUnitId(null);
      setView('project_overview');
    }
    refreshProjects();
  }, [activeUnitId, refreshProjects]);

  // ── Wizard ──
  const updateWizard = useCallback((partial: Partial<AhuWizardState>) => {
    setWizardState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      if (activeProjectId && activeUnitId) {
        saveWizardState(activeProjectId, activeUnitId, next);
      }
      return next;
    });
  }, [activeProjectId, activeUnitId]);

  const handleSelectAhuType = useCallback((type: AhuType) => {
    if (!activeProjectId || !activeUnitId) return;
    const unit = getUnit(activeProjectId, activeUnitId);
    if (!unit) return;
    const wasSame = unit.ahuType === type;
    updateUnit(activeProjectId, { ...unit, ahuType: type });
    refreshProjects();
    // Schema change → mark all downstream steps dirty so user re-walks them.
    if (!wasSame) {
      setWizardState((prev) => {
        if (!prev) return prev;
        const next: AhuWizardState = { ...prev, dirtyFromStep: 'inputs' };
        saveWizardState(activeProjectId, activeUnitId, next);
        return next;
      });
    }
  }, [activeProjectId, activeUnitId, refreshProjects]);

  const handleBackToProject = useCallback(() => {
    setActiveUnitId(null);
    setWizardState(null);
    refreshProjects();
    setView('project_overview');
  }, [refreshProjects]);

  // ─── Render ───
  const wrapperStyle: React.CSSProperties = fullscreen
    ? { background: 'var(--bg)', position: 'fixed', inset: 0, zIndex: 60 }
    : { background: 'var(--bg)', minHeight: 'calc(100vh - 56px)', position: 'relative' };

  return (
    <div className="flex" style={wrapperStyle}>
      {/* Fullscreen toggle — matches calc-frame style (top-right of content area, below AHU header) */}
      <button
        type="button"
        onClick={() => setFullscreen((v) => !v)}
        className="absolute right-4 z-[61] inline-flex items-center justify-center h-16 w-16 rounded-xl border-2 transition-colors backdrop-blur"
        style={{
          top: '5rem',
          background: fullscreen ? 'var(--navy)' : 'rgba(255,255,255,0.92)',
          color: fullscreen ? '#fff' : 'var(--text-2)',
          borderColor: fullscreen ? 'var(--navy)' : 'var(--bdr-2)',
          boxShadow: '0 4px 14px rgba(0,0,0,.08)',
        }}
        title={fullscreen ? 'სრული ეკრანის გათიშვა (Esc)' : 'სრული ეკრანი'}
        aria-label={fullscreen ? 'სრული ეკრანის გათიშვა' : 'სრული ეკრანი'}
      >
        {fullscreen ? <Minimize2 size={28} strokeWidth={2.25} /> : <Maximize2 size={28} strokeWidth={2.25} />}
      </button>

      {/* ── Left rail: projects ── */}
      {view !== 'wizard' && (
        <AhuProjectsRail
          projects={projects}
          activeProjectId={activeProjectId}
          activeUnitId={activeUnitId}
          expandedProjects={expandedProjects}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onToggleExpand={toggleProjectExpand}
          onOpenUnit={handleOpenUnit}
          onDeleteProject={handleDeleteProject}
          onDeleteUnit={handleDeleteUnit}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {view === 'landing' && (
          <AhuLandingHint
            hasProjects={projects.length > 0}
            onNewProject={handleNewProject}
          />
        )}

        {view === 'register_project' && (
          <AhuRegister
            onCancel={() => setView(projects.length ? 'landing' : 'landing')}
            onCreate={handleCreateProject}
          />
        )}

        {view === 'project_overview' && activeProject && (
          <AhuProjectOverview
            project={activeProject}
            onNewUnit={handleNewUnit}
            onOpenUnit={(unitId) => handleOpenUnit(activeProject.id, unitId)}
            onDeleteUnit={(unitId) => handleDeleteUnit(activeProject.id, unitId)}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'register_ahu' && activeProject && (
          <AhuRegisterUnit
            project={activeProject}
            onCancel={() => setView('project_overview')}
            onCreate={handleCreateUnit}
          />
        )}

        {view === 'wizard' && activeProject && activeUnit && wizardState && (
          <AhuWizard
            project={activeProject}
            unit={activeUnit}
            state={wizardState}
            onUpdate={updateWizard}
            onBack={handleBackToProject}
            onSelectAhuType={handleSelectAhuType}
          />
        )}
      </div>
    </div>
  );
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

interface WizardProps {
  project: AhuProject;
  unit: AhuUnit;
  state: AhuWizardState;
  onUpdate: (partial: Partial<AhuWizardState>) => void;
  onBack: () => void;
  onSelectAhuType: (type: AhuType) => void;
}

function AhuWizard({ project, unit, state, onUpdate, onBack, onSelectAhuType }: WizardProps) {
  const psychro = useMemo(() => calcPsychro(state), [state.design, state.airflow]);
  const chain = useMemo<ChainResult | undefined>(() => {
    const sections = state.sections;
    if (!sections || sections.length === 0) return undefined;
    try {
      const oaFraction = Math.max(0.01, Math.min(1, state.airflow.oaFraction));
      // Mass flow at OA-side intake: full supply mDot scaled by OA fraction
      // (mixing_box later restores to full flow). Approximate density from outdoor.
      const supplyM3s = state.airflow.supplyAirflow / 3600;
      const oaM3s = supplyM3s * oaFraction;
      const oaState = fromDbWb(
        state.design.summerOutdoorDB,
        state.design.summerOutdoorWB,
        oaM3s * 1.18, // ρ ≈ 1.18 kg/m³ at typical summer OA conditions
        state.design.pressure,
      );
      const returnState = fromDbRh(
        state.design.summerIndoorDB,
        state.design.summerIndoorRH / 100,
        supplyM3s * 1.18,
        state.design.pressure,
      );
      return runChain({ outdoor: oaState, returnState, sections });
    } catch {
      return undefined;
    }
  }, [state.sections, state.design, state.airflow]);
  const stepIndex = STEPS.findIndex((s) => s.id === state.currentStep);

  // Per-step status (locked/current/completed/dirty/available)
  const statuses = useMemo(
    () => computeStepStatuses(state, unit, chain),
    [state, unit, chain],
  );

  const goTo = useCallback((step: WizardStep) => {
    if (!canNavigate(step, state, unit, chain)) return; // gate enforced
    onUpdate(navigationPatch(step, state));
  }, [onUpdate, state, unit, chain]);

  // Wrap onUpdate so any state change in the *current* step marks downstream dirty.
  // Pure step-navigation calls bypass this (they pass `currentStep` in patch).
  const onUpdateCascade = useCallback((patch: Partial<AhuWizardState>) => {
    if ('currentStep' in patch && Object.keys(patch).length === 1) {
      onUpdate(patch);
      return;
    }
    const dirtyPatch = dirtyAfterEdit(state.currentStep, state);
    onUpdate({ ...patch, ...dirtyPatch });
  }, [onUpdate, state]);

  const ahuSpec = unit.ahuType ? getAhuTypeSpec(unit.ahuType) : null;

  return (
    <div className="flex flex-col flex-1" style={{ background: 'var(--bg)' }}>
      {/* ── Header ── */}
      <header
        className="border-b px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: 'var(--text-3)' }}
            title="უკან პროექტში"
          >
            <ArrowLeft size={16} />
          </button>
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
          >
            <Wind size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
              <span className="truncate">{project.name}</span>
              <ChevronRight size={9} />
              <span>{unit.name}</span>
              {ahuSpec && (
                <>
                  <ChevronRight size={9} />
                  <span>{ahuSpec.shortLabel}</span>
                </>
              )}
            </div>
            <div className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              {unit.name}
              {unit.description && (
                <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-3)' }}>
                  · {unit.description}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-mono shrink-0" style={{ color: 'var(--text-3)' }}>
          <span>ASHRAE HOF 2021</span>
          <span>·</span>
          <span>62.1</span>
          <span>·</span>
          <span>90.1</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Step Navigator ── */}
        <aside
          className="w-52 shrink-0 border-r flex flex-col py-4"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
        >
          <div className="px-4 mb-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
              ნაბიჯები
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {STEPS.map((step, i) => {
              const status = statuses.get(step.id) ?? 'locked';
              const isLocked = status === 'locked';
              const tooltip = isLocked
                ? 'ჯერ წინა ნაბიჯები დაასრულე'
                : status === 'dirty'
                ? 'წინა ნაბიჯში მონაცემები შეიცვალა — გადაამოწმე'
                : status === 'completed'
                ? 'დასრულებული'
                : '';
              return (
                <button
                  key={step.id}
                  onClick={() => goTo(step.id)}
                  disabled={isLocked}
                  title={tooltip}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all w-full disabled:cursor-not-allowed"
                  style={stepButtonStyle(status)}
                >
                  <StepIcon status={status} index={i} />
                  <span className="text-xs font-medium leading-tight flex-1">{step.label}</span>
                  {status === 'dirty' && (
                    <AlertTriangle size={11} style={{ color: 'var(--ora)' }} />
                  )}
                </button>
              );
            })}
          </nav>

          {psychro && (
            <div
              className="mx-3 mt-4 rounded-lg p-3 border"
              style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
            >
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
                Live Results
              </div>
              <MiniStat label="Qt cooling" value={`${psychro.coolingCapacity.total.toFixed(1)} kW`} />
              <MiniStat label="SHR" value={`${(psychro.shr * 100).toFixed(0)}%`} />
              <MiniStat label="T supply" value={`${psychro.supplyAir.tdb.toFixed(1)} °C`} />
              <MiniStat label="ADP" value={`${psychro.adp.tdb.toFixed(1)} °C`} />
            </div>
          )}

          {ahuSpec && (
            <div
              className="mx-3 mt-3 rounded-lg p-3 border"
              style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}
            >
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--blue)' }}>
                AHU სტილი
              </div>
              <div className="text-[11px] font-bold leading-tight mb-1" style={{ color: 'var(--navy)' }}>
                {ahuSpec.title}
              </div>
              <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                ηₛ {(ahuSpec.sensibleEffMin * 100).toFixed(0)}–{(ahuSpec.sensibleEffMax * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </aside>

        {/* ── Step content ── */}
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center gap-2 mb-5">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: 'var(--navy)', color: '#fff' }}
            >
              {stepIndex + 1}
            </span>
            <h1 className="text-base font-bold" style={{ color: 'var(--navy)' }}>
              {STEPS[stepIndex]?.label}
            </h1>
            <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
              {STEPS[stepIndex]?.id}
            </span>
          </div>

          {/* ── Dirty-step banner ──────────────────────────────────────── */}
          {state.dirtyFromStep && flowStepIndex(state.currentStep) >= flowStepIndex(state.dirtyFromStep) && (() => {
            const changedStepId = STEP_ORDER[flowStepIndex(state.dirtyFromStep!) - 1] as WizardStep;
            const changedLabel = STEPS.find((s) => s.id === changedStepId)?.label ?? '—';
            return (
              <div
                className="mb-5 rounded-xl border px-4 py-3 flex items-start gap-3"
                style={{ background: 'var(--ora-lt)', borderColor: 'var(--ora-bd)' }}
              >
                <AlertTriangle size={15} style={{ color: 'var(--ora)', flexShrink: 0, marginTop: 1 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--ora)' }}>
                    პარამეტრები განახლდა — გადახედე ამ ნაბიჯის შედეგებს
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-2)' }}>
                    «{changedLabel}»-ში ცვლილება მოხდა. ქვემოთ ნაჩვენები შედეგები უკვე განახლებულია — დარწმუნდი, რომ ყველაფერი სწორია.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(changedStepId)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={{ borderColor: 'var(--ora-bd)', color: 'var(--ora)', background: 'var(--sur)' }}
                  >
                    ← {changedLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ dirtyFromStep: undefined })}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={{ borderColor: 'var(--bdr-2)', color: 'var(--text-2)', background: 'var(--sur)' }}
                  >
                    გავეცანი ✓
                  </button>
                </div>
              </div>
            );
          })()}

          {state.currentStep === 'inputs' && (
            <Step1Inputs
              project={project}
              unit={unit}
              state={state}
              onUpdate={onUpdateCascade}
              psychro={psychro}
            />
          )}
          {state.currentStep === 'ahu_type' && (
            <AhuTypeSelector
              selected={unit.ahuType}
              onSelect={onSelectAhuType}
            />
          )}
          {state.currentStep === 'components' && (
            <StepComponents state={state} unit={unit} onUpdate={onUpdateCascade} chain={chain} />
          )}
          {state.currentStep === 'psychro' && (
            <Step2Psychro state={state} psychro={psychro} chain={chain} />
          )}
          {state.currentStep === 'sizing' && (
            <StepSizing state={state} psychro={psychro} chain={chain} />
          )}
          {state.currentStep === 'fan' && (
            <StepFan state={state} chain={chain} />
          )}
          {state.currentStep === 'summary' && (
            <StepSummary state={state} unit={unit} psychro={psychro} chain={chain} />
          )}
          {state.currentStep === 'report' && (
            <StepReport project={project} state={state} unit={unit} psychro={psychro} chain={chain} />
          )}

          <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: 'var(--bdr)' }}>
            <button
              disabled={stepIndex === 0}
              onClick={() => goTo(STEPS[stepIndex - 1].id)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border transition-all disabled:opacity-40"
              style={{ borderColor: 'var(--bdr-2)', color: 'var(--text-2)', background: 'var(--sur)' }}
            >
              ← წინა
            </button>
            <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
              {stepIndex + 1} / {STEPS.length}
            </span>
            <button
              disabled={
                stepIndex === STEPS.length - 1
                || !canNavigate(STEPS[stepIndex + 1]?.id, state, unit, chain)
              }
              title={
                stepIndex < STEPS.length - 1 && !canNavigate(STEPS[stepIndex + 1].id, state, unit, chain)
                  ? 'მიმდინარე ნაბიჯი ჯერ ვალიდური არ არის'
                  : ''
              }
              onClick={() => goTo(STEPS[stepIndex + 1].id)}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              შემდეგი →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function stepButtonStyle(status: StepStatus): React.CSSProperties {
  if (status === 'current') {
    return {
      background: 'var(--blue-lt)',
      color: 'var(--blue)',
      borderLeft: '2px solid var(--blue)',
    };
  }
  if (status === 'completed') {
    return { background: 'transparent', color: 'var(--text)', borderLeft: '2px solid transparent' };
  }
  if (status === 'dirty') {
    return { background: 'var(--ora-lt)', color: 'var(--ora)', borderLeft: '2px solid var(--ora)' };
  }
  if (status === 'locked') {
    return { background: 'transparent', color: 'var(--text-3)', borderLeft: '2px solid transparent', opacity: 0.55 };
  }
  // available (visited but not yet validated)
  return { background: 'transparent', color: 'var(--text-2)', borderLeft: '2px solid transparent' };
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === 'completed') {
    return <CheckCircle2 size={14} strokeWidth={2} style={{ color: 'var(--grn)' }} className="shrink-0" />;
  }
  if (status === 'locked') {
    return <Lock size={12} strokeWidth={2} style={{ color: 'var(--text-3)' }} className="shrink-0" />;
  }
  if (status === 'current') {
    return (
      <span
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold shrink-0"
        style={{ background: 'var(--blue)', color: '#fff' }}
      >
        {index + 1}
      </span>
    );
  }
  if (status === 'dirty') {
    return (
      <span
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold shrink-0"
        style={{ background: 'var(--ora)', color: '#fff' }}
      >
        {index + 1}
      </span>
    );
  }
  // available
  return (
    <span
      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold shrink-0"
      style={{ background: 'var(--bdr)', color: 'var(--text-2)' }}
    >
      {index + 1}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-0.5">
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-[11px] font-bold font-mono" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

