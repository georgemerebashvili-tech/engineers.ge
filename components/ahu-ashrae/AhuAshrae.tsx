'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Wind, Thermometer, Snowflake, Flame, Fan, Filter,
  FileText, ChevronRight, CheckCircle2, ArrowLeft,
  Info, Layers, Maximize2, Minimize2,
} from 'lucide-react';
import type {
  AhuWizardState, WizardStep, AhuView, AhuProject, AhuUnit, AhuType,
  PsychrometricResults,
} from '@/lib/ahu-ashrae/types';
import { GE_CITIES, resolveCity } from '@/lib/ahu-ashrae/climate-data';
import {
  statePointFromWb, statePointFromRh, mixAir,
  supplyTFromSensible, supplyWFromLatent,
  statePoint, apparatusDewPoint, contactFactor,
  airDensity,
} from '@/lib/ahu-ashrae/psychrometrics';
import {
  listProjects, saveProject, deleteProject,
  addUnit, updateUnit, deleteUnit, getUnit,
  loadWizardState, saveWizardState,
} from '@/lib/ahu-ashrae/storage';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';

import { AhuProjectsRail } from './AhuProjectsRail';
import { AhuRegister } from './AhuRegister';
import { AhuRegisterUnit } from './AhuRegisterUnit';
import { AhuProjectOverview } from './AhuProjectOverview';
import { AhuLandingHint } from './AhuLandingHint';
import { AhuTypeSelector } from './AhuTypeSelector';
import { Step1Inputs } from './steps/Step1Inputs';
import { Step2Psychro } from './steps/Step2Psychro';

// ─── Step metadata ─────────────────────────────────────────────────────────────

const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{size?: number; strokeWidth?: number}> }[] = [
  { id: 'inputs',    label: 'საწყისი პარამეტრები', icon: Wind },
  { id: 'psychro',   label: 'ფსიქრომეტრია',        icon: Thermometer },
  { id: 'ahu_type',  label: 'AHU სტილი',           icon: Layers },
  { id: 'cool_coil', label: 'გამაგრილ. სპირალი',   icon: Snowflake },
  { id: 'heat_coil', label: 'გამათბ. სპირალი',     icon: Flame },
  { id: 'fan',       label: 'ვენტილატორი',         icon: Fan },
  { id: 'filter',    label: 'ფილტრი',              icon: Filter },
  { id: 'summary',   label: 'შედეგი + სპეც.',      icon: FileText },
];

// ─── Default wizard state for a fresh AHU unit ────────────────────────────────

export function makeDefaultWizardState(project: AhuProject): AhuWizardState {
  const city = resolveCity(project.location, project.customCity) ?? GE_CITIES[0];
  return {
    currentStep: 'inputs',
    selectedCity: city,
    design: {
      mode: 'cooling',
      outdoorDB: city.summerDB,
      outdoorWB: city.summerMCWB,
      outdoorRH: 50,
      indoorDB: 24,
      indoorRH: 50,
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
    loads: {
      sensibleCooling: 40,
      latentCooling: 12,
      heatingLoad: 30,
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
  };
}

// ─── Psychro calc ──────────────────────────────────────────────────────────────

function calcPsychro(state: AhuWizardState): PsychrometricResults | undefined {
  const { design, airflow, loads } = state;
  const p = design.pressure;
  try {
    const oaFlow = airflow.supplyAirflow * airflow.oaFraction;
    const raFlow = airflow.supplyAirflow - oaFlow;
    const outdoor = statePointFromWb(design.outdoorDB, design.outdoorWB, 'O', 'გარე ჰაერი', p);
    const roomAir = statePointFromRh(design.indoorDB, design.indoorRH, 'R', 'ოთახის ჰაერი', p);
    const mixed = mixAir(outdoor, oaFlow, roomAir, raFlow, 'M', 'შერეული ჰაერი', p);
    const density = airDensity(mixed.tdb, mixed.w, p);
    const supplyTdb = supplyTFromSensible(design.indoorDB, loads.sensibleCooling, airflow.supplyAirflow, density);
    const supplyW = supplyWFromLatent(roomAir.w, loads.latentCooling, airflow.supplyAirflow, density);
    const supplyAir = statePoint(supplyTdb, supplyW, 'S', 'მიწოდების ჰაერი', p);
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
    updateUnit(activeProjectId, { ...unit, ahuType: type });
    refreshProjects();
  }, [activeProjectId, activeUnitId, refreshProjects]);

  const handleBackToProject = useCallback(() => {
    setActiveUnitId(null);
    setWizardState(null);
    refreshProjects();
    setView('project_overview');
  }, [refreshProjects]);

  // ─── Render ───
  const wrapperStyle = fullscreen
    ? { background: 'var(--bg)', position: 'fixed' as const, inset: 0, zIndex: 60 }
    : { background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' };

  return (
    <div className="flex" style={wrapperStyle}>
      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={() => setFullscreen((v) => !v)}
        className="absolute top-3 right-4 z-[61] inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-all"
        style={{
          background: fullscreen ? 'var(--navy)' : 'var(--sur)',
          color: fullscreen ? '#fff' : 'var(--text-2)',
          borderColor: fullscreen ? 'var(--navy)' : 'var(--bdr-2)',
          boxShadow: 'var(--shadow-card)',
        }}
        title={fullscreen ? 'სრული ეკრანის გათიშვა (Esc)' : 'სრული ეკრანი'}
        aria-label={fullscreen ? 'სრული ეკრანის გათიშვა' : 'სრული ეკრანი'}
      >
        {fullscreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
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
  const psychro = useMemo(() => calcPsychro(state), [state.design, state.airflow, state.loads]);
  const stepIndex = STEPS.findIndex((s) => s.id === state.currentStep);

  const goTo = useCallback((step: WizardStep) => {
    onUpdate({ currentStep: step });
  }, [onUpdate]);

  const completed = useMemo<Set<WizardStep>>(() => {
    const set = new Set<WizardStep>();
    if (state.airflow.supplyAirflow > 0 && state.loads.sensibleCooling > 0) set.add('inputs');
    if (psychro) set.add('psychro');
    if (unit.ahuType) set.add('ahu_type');
    return set;
  }, [state, psychro, unit.ahuType]);

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
        <div className="hidden md:flex items-center gap-2 text-xs font-mono shrink-0 mr-12" style={{ color: 'var(--text-3)' }}>
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
              const active = state.currentStep === step.id;
              const done = completed.has(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => goTo(step.id)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all w-full"
                  style={{
                    background: active ? 'var(--blue-lt)' : 'transparent',
                    color: active ? 'var(--blue)' : done ? 'var(--text)' : 'var(--text-3)',
                    borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                  }}
                >
                  <span className="shrink-0">
                    {done && !active ? (
                      <CheckCircle2 size={14} strokeWidth={2} style={{ color: 'var(--grn)' }} />
                    ) : (
                      <span
                        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold"
                        style={{
                          background: active ? 'var(--blue)' : 'var(--bdr)',
                          color: active ? '#fff' : 'var(--text-2)',
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-medium leading-tight">{step.label}</span>
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

          {state.currentStep === 'inputs' && (
            <Step1Inputs
              project={project}
              unit={unit}
              state={state}
              onUpdate={onUpdate}
              psychro={psychro}
            />
          )}
          {state.currentStep === 'psychro' && (
            <Step2Psychro state={state} psychro={psychro} />
          )}
          {state.currentStep === 'ahu_type' && (
            <AhuTypeSelector
              selected={unit.ahuType}
              onSelect={onSelectAhuType}
            />
          )}
          {!['inputs', 'psychro', 'ahu_type'].includes(state.currentStep) && (
            <ComingSoonStep step={state.currentStep} />
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
              disabled={stepIndex === STEPS.length - 1}
              onClick={() => goTo(STEPS[stepIndex + 1].id)}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-40"
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-0.5">
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-[11px] font-bold font-mono" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function ComingSoonStep({ step }: { step: WizardStep }) {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center gap-4 text-center"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)', borderStyle: 'dashed' }}
    >
      <div
        className="inline-flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'var(--blue-lt)' }}
      >
        <Info size={22} style={{ color: 'var(--blue)' }} />
      </div>
      <div>
        <div className="font-bold text-sm mb-1" style={{ color: 'var(--navy)' }}>
          მალე
        </div>
        <div className="text-xs" style={{ color: 'var(--text-3)' }}>
          <span className="font-mono">{step}</span> ნაბიჯი მომდევნო iteration-ში
        </div>
      </div>
    </div>
  );
}
