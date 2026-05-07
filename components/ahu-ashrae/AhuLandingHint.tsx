'use client';

import React from 'react';
import { Plus, FolderOpen, ArrowLeft, Wind, MousePointer2 } from 'lucide-react';

interface Props {
  hasProjects: boolean;
  onNewProject: () => void;
}

export function AhuLandingHint({ hasProjects, onNewProject }: Props) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
      style={{ background: 'var(--bg)' }}
    >
      {hasProjects ? (
        <>
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'var(--sur)', color: 'var(--blue)', border: '1px dashed var(--bdr-2)' }}
          >
            <MousePointer2 size={26} strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-bold mb-2" style={{ color: 'var(--navy)' }}>
            აირჩიე პროექტი მარცხნივ
          </h2>
          <p className="text-xs max-w-md mb-5" style={{ color: 'var(--text-2)' }}>
            AHU სელექციის გასაგრძელებლად გახსენი არსებული პროექტი მარცხენა პანელში,
            ან შექმენი ახალი.
          </p>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
            <ArrowLeft size={12} />
            <span>აირჩიე სიიდან</span>
            <span className="mx-2">·</span>
            <button
              onClick={onNewProject}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              <Plus size={11} /> ახალი პროექტი
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            className="inline-flex h-20 w-20 items-center justify-center rounded-2xl mb-5"
            style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
          >
            <FolderOpen size={32} strokeWidth={1.5} />
          </div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
            ASHRAE · AHU SELECTION
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--navy)' }}>
            AHU სელექცია — ASHRAE
          </h1>
          <p className="text-sm max-w-lg mb-6" style={{ color: 'var(--text-2)' }}>
            ASHRAE-ის სტანდარტული AHU სელექციის ხელსაწყო. პროექტში დაამატე 1–20+ AHU მოდული,
            ცალ-ცალკე გააანგარიშე ფსიქრომეტრია, აარჩიე AHU სტილი (cross-flow / counter-flow / rotor / heat pipe / run-around).
          </p>
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all"
            style={{ background: 'var(--blue)', color: '#fff' }}
          >
            <Plus size={16} /> პირველი პროექტის რეგისტრაცია
          </button>

          <div className="mt-8 grid grid-cols-3 gap-6 max-w-md">
            <FlowStep n="1" label="რეგისტრაცია" sub="პროექტი" />
            <FlowStep n="2" label="AHU მოდული" sub="1–20+ ერთეული" />
            <FlowStep n="3" label="სელექცია" sub="8 ნაბიჯი" />
          </div>
        </>
      )}
    </div>
  );
}

function FlowStep({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: 'var(--bdr)', color: 'var(--text-2)' }}
      >
        {n}
      </span>
      <div className="text-[11px] font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{sub}</div>
    </div>
  );
}
