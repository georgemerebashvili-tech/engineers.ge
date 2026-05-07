'use client';

import React from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import type { AhuWizardState, AhuUnit } from '@/lib/ahu-ashrae/types';

interface Props {
  state: AhuWizardState;
  unit: AhuUnit;
}

export function StepReport({ state, unit }: Props) {
  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-5"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Download size={16} style={{ color: 'var(--blue)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
            რეპორტის ექსპორტი
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
          {unit.name} — სრული გაანგარიშების PDF / print-friendly ვერსია.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            disabled
            className="rounded-lg border p-4 flex items-center gap-3 transition-all opacity-60 cursor-not-allowed"
            style={{ borderColor: 'var(--bdr)', background: 'var(--sur-2)' }}
          >
            <FileText size={20} style={{ color: 'var(--blue)' }} />
            <div className="text-left">
              <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>PDF რეპორტი</div>
              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>მზადდება — შემდეგი iteration</div>
            </div>
          </button>

          <button
            onClick={() => window.print()}
            className="rounded-lg border p-4 flex items-center gap-3 transition-all hover:bg-[var(--blue-lt)]"
            style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur-2)' }}
          >
            <Printer size={20} style={{ color: 'var(--blue)' }} />
            <div className="text-left">
              <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>ბრაუზერით ბეჭდვა</div>
              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>Cmd/Ctrl + P → save as PDF</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
