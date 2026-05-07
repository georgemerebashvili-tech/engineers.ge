'use client';

import React, { useState } from 'react';
import { ArrowLeft, Wind, FileText, Check } from 'lucide-react';
import type { AhuProject, AhuUnit } from '@/lib/ahu-ashrae/types';
import { makeUnitId, today, suggestNextAhuName } from '@/lib/ahu-ashrae/storage';

interface Props {
  project: AhuProject;
  onCancel: () => void;
  onCreate: (unit: AhuUnit) => void;
}

export function AhuRegisterUnit({ project, onCancel, onCreate }: Props) {
  const [name, setName] = useState(suggestNextAhuName(project));
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('AHU-ს სახელი აუცილებელია');
      return;
    }
    const unit: AhuUnit = {
      id: makeUnitId(),
      name: name.trim(),
      description: description.trim() || undefined,
      date: today(),
      modified: today(),
    };
    onCreate(unit);
  };

  return (
    <div className="flex flex-col flex-1" style={{ background: 'var(--bg)' }}>
      <header
        className="border-b px-6 py-4 flex items-center"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <button
          onClick={onCancel}
          className="p-1.5 rounded-md transition-colors mr-3"
          style={{ color: 'var(--text-3)' }}
          title="უკან"
        >
          <ArrowLeft size={16} />
        </button>
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg mr-3"
          style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
        >
          <Wind size={18} strokeWidth={2} />
        </span>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
            {project.name} · ახალი მოდული
          </div>
          <div className="text-base font-bold" style={{ color: 'var(--navy)' }}>
            ახალი AHU-ის რეგისტრაცია
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div
          className="rounded-xl border p-5 md:p-6"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
        >
          <div className="mb-5 pb-4 border-b" style={{ borderColor: 'var(--bdr)' }}>
            <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--navy)' }}>
              AHU მოდულის ძირითადი ინფო
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              შემდეგ ნაბიჯში გადახვალ AHU სელექციის wizard-ში — საწყისი მონაცემები, ფსიქრომეტრია, AHU სტილი (6 ვარიანტი).
            </p>
          </div>

          <div className="space-y-4">
            <Field label="AHU-ს სახელი" required icon={<Wind size={12} />}>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                placeholder="AHU-01"
                className="w-full rounded-lg px-3 py-2.5 text-sm border font-medium"
                style={{
                  background: 'var(--sur)',
                  borderColor: error ? 'var(--red)' : 'var(--bdr-2)',
                  color: 'var(--text)', outline: 'none',
                }}
                autoFocus
              />
              {error && (
                <div className="mt-1 text-[10px]" style={{ color: 'var(--red)' }}>{error}</div>
              )}
              <div className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>
                მაგ. AHU-01, AHU-02 / Lobby, RTU-Roof, AC-Conf-Room
              </div>
            </Field>

            <Field label="აღწერა / მომსახურე ზონა" icon={<FileText size={12} />}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="მაგ. II სართული, ღია ოფისი + 2 კონფერენც-ოთახი (არასავალდებულო)"
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 text-sm border resize-none"
                style={{
                  background: 'var(--sur)', borderColor: 'var(--bdr-2)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between mt-6 pt-5 border-t" style={{ borderColor: 'var(--bdr)' }}>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold rounded-lg border transition-all"
              style={{ borderColor: 'var(--bdr-2)', color: 'var(--text-2)', background: 'var(--sur)' }}
            >
              გაუქმება
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg transition-all"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              <Check size={14} /> შექმნა · გადასვლა wizard-ში
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, required, icon, children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: 'var(--text-3)' }}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
          {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
        </span>
      </label>
      {children}
    </div>
  );
}
