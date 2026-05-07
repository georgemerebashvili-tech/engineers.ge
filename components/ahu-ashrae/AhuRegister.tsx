'use client';

import React, { useState } from 'react';
import { ArrowLeft, Wind, MapPin, User, FileText, Calendar, Check } from 'lucide-react';
import type { AhuProject, CityClimate } from '@/lib/ahu-ashrae/types';
import {
  CITY_GROUPS, CUSTOM_CITY_ID, makeCustomCity,
} from '@/lib/ahu-ashrae/climate-data';
import { pressureFromElevation } from '@/lib/ahu-ashrae/psychrometrics';
import { makeProjectId, today } from '@/lib/ahu-ashrae/storage';

interface Props {
  onCancel: () => void;
  onCreate: (p: AhuProject) => void;
}

export function AhuRegister({ onCancel, onCreate }: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('tbilisi');
  const [customCity, setCustomCity] = useState<CityClimate>(makeCustomCity(''));
  const [engineer, setEngineer] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isCustom = location === CUSTOM_CITY_ID;

  const updateCustom = (partial: Partial<CityClimate>) => {
    setCustomCity((prev) => {
      const next = { ...prev, ...partial };
      // Recompute pressure if elevation changed
      if (partial.elevation !== undefined) {
        next.pressure = pressureFromElevation(partial.elevation);
      }
      next.nameEn = next.name;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('პროექტის სახელი აუცილებელია');
      return;
    }
    if (isCustom && !customCity.name.trim()) {
      setError('ქალაქის სახელი აუცილებელია');
      return;
    }
    const project: AhuProject = {
      id: makeProjectId(),
      name: name.trim(),
      location,
      customCity: isCustom ? { ...customCity, name: customCity.name.trim(), nameEn: customCity.name.trim() } : undefined,
      engineer: engineer.trim(),
      description: description.trim() || undefined,
      date: today(),
      modified: today(),
      units: [],
    };
    onCreate(project);
  };

  return (
    <div className="flex flex-col" style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-3)' }}
            title="უკან"
          >
            <ArrowLeft size={16} />
          </button>
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
          >
            <Wind size={18} strokeWidth={2} />
          </span>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
              ნაბიჯი 1 / 3 — რეგისტრაცია
            </div>
            <div className="text-base font-bold" style={{ color: 'var(--navy)' }}>
              ახალი AHU პროექტი
            </div>
          </div>
        </div>
        <div className="mr-12">
          <Stepper current={0} />
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div
          className="rounded-xl border p-5 md:p-6"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
        >
          <div className="mb-5 pb-4 border-b" style={{ borderColor: 'var(--bdr)' }}>
            <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--navy)' }}>
              პროექტის ძირითადი მონაცემები
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              შემდეგ ნაბიჯში დაიწყებ AHU-ს დამუშავებას — ASHRAE კლიმატის მონაცემები
              ლოკაციის მიხედვით ავტომატურად ჩაიტვირთება.
            </p>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <Field
              label="პროექტის სახელი"
              required
              icon={<FileText size={12} />}
            >
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                placeholder="მაგ. AHU-01 · ოფისი, II სართული"
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
            </Field>

            {/* Location */}
            <Field label="ლოკაცია" required icon={<MapPin size={12} />}>
              <select
                value={location}
                onChange={(e) => { setLocation(e.target.value); setError(null); }}
                className="w-full rounded-lg px-3 py-2.5 text-sm border font-medium"
                style={{
                  background: 'var(--sur)', borderColor: 'var(--bdr-2)',
                  color: 'var(--text)', outline: 'none',
                }}
              >
                {CITY_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.nameEn}</option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="ხელით">
                  <option value={CUSTOM_CITY_ID}>+ სხვა ქალაქი (ხელით შევიყვან)</option>
                </optgroup>
              </select>
              {!isCustom && (
                <div className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>
                  ASHRAE HOF 2021 — climatic design data ჩაიტვირთება ავტომატურად
                </div>
              )}
            </Field>

            {/* Custom city inputs */}
            {isCustom && (
              <div
                className="rounded-lg p-3 border space-y-3"
                style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}
              >
                <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--blue)' }}>
                  ASHRAE Climate Data — ხელით შეყვანა
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <RegField label="ქალაქის სახელი *">
                    <input
                      type="text"
                      value={customCity.name}
                      onChange={(e) => updateCustom({ name: e.target.value })}
                      placeholder="მაგ. ხაშური"
                      className="w-full rounded-md px-2.5 py-1.5 text-xs border"
                      style={{ background: 'var(--sur)', borderColor: 'var(--bdr-2)', color: 'var(--text)', outline: 'none' }}
                    />
                  </RegField>
                  <RegField label="ქვეყანა">
                    <input
                      type="text"
                      value={customCity.country}
                      onChange={(e) => updateCustom({ country: e.target.value.toUpperCase() })}
                      placeholder="GE"
                      maxLength={3}
                      className="w-full rounded-md px-2.5 py-1.5 text-xs border font-mono uppercase"
                      style={{ background: 'var(--sur)', borderColor: 'var(--bdr-2)', color: 'var(--text)', outline: 'none' }}
                    />
                  </RegField>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <RegNum
                    label="სიმაღლე"
                    unit="m"
                    value={customCity.elevation}
                    step={10}
                    onChange={(v) => updateCustom({ elevation: v })}
                  />
                  <RegNum
                    label="ატ. წნევა"
                    unit="kPa"
                    value={Number(customCity.pressure.toFixed(2))}
                    step={0.1}
                    onChange={(v) => updateCustom({ pressure: v })}
                  />
                  <div />
                </div>

                <div className="text-[9px] font-bold uppercase tracking-[0.08em] pt-1" style={{ color: 'var(--blue)' }}>
                  Summer Cooling — 0.4%
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <RegNum
                    label="DB (Dry Bulb)"
                    unit="°C"
                    value={customCity.summerDB}
                    step={0.1}
                    onChange={(v) => updateCustom({ summerDB: v })}
                  />
                  <RegNum
                    label="MCWB (Wet Bulb)"
                    unit="°C"
                    value={customCity.summerMCWB}
                    step={0.1}
                    onChange={(v) => updateCustom({ summerMCWB: v })}
                  />
                </div>

                <div className="text-[9px] font-bold uppercase tracking-[0.08em] pt-1" style={{ color: 'var(--blue)' }}>
                  Winter Heating Design
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <RegNum
                    label="99% DB"
                    unit="°C"
                    value={customCity.winterDB99}
                    step={0.1}
                    onChange={(v) => updateCustom({ winterDB99: v })}
                  />
                  <RegNum
                    label="99.6% DB"
                    unit="°C"
                    value={customCity.winterDB996}
                    step={0.1}
                    onChange={(v) => updateCustom({ winterDB996: v })}
                  />
                </div>

                <div className="text-[10px] pt-1" style={{ color: 'var(--text-3)' }}>
                  ეს მონაცემები შენ მაგრად ცვლილებადია wizard-ის Step 1 ეკრანზეც.
                </div>
              </div>
            )}

            {/* Engineer */}
            <Field label="ინჟინერი" icon={<User size={12} />}>
              <input
                type="text"
                value={engineer}
                onChange={(e) => setEngineer(e.target.value)}
                placeholder="სახელი, გვარი (არასავალდებულო)"
                className="w-full rounded-lg px-3 py-2.5 text-sm border"
                style={{
                  background: 'var(--sur)', borderColor: 'var(--bdr-2)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </Field>

            {/* Description */}
            <Field label="აღწერა" icon={<Calendar size={12} />}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="პროექტის მოკლე აღწერა, ობიექტი, განზრახულობა (არასავალდებულო)"
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 text-sm border resize-none"
                style={{
                  background: 'var(--sur)', borderColor: 'var(--bdr-2)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </Field>
          </div>

          {/* Buttons */}
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
              <Check size={14} /> რეგისტრაცია · შემდეგი
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function RegField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function RegNum({
  label, unit, value, onChange, step = 1,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-[9px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
      <div className="flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--bdr-2)' }}>
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono"
          style={{ background: 'var(--sur)', color: 'var(--text)', outline: 'none' }}
        />
        <span
          className="px-1.5 flex items-center text-[9px] font-bold shrink-0"
          style={{ background: 'var(--sur-2)', color: 'var(--text-3)', borderLeft: '1px solid var(--bdr)' }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  const steps = ['რეგისტრაცია', 'დამუშავება', 'AHU სტილი'];
  return (
    <div className="hidden md:flex items-center gap-2">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                background: i === current ? 'var(--blue)' : i < current ? 'var(--grn)' : 'var(--bdr)',
                color: i === current || i < current ? '#fff' : 'var(--text-3)',
              }}
            >
              {i + 1}
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color: i === current ? 'var(--navy)' : 'var(--text-3)' }}
            >
              {s}
            </span>
          </div>
          {i < steps.length - 1 && <div className="h-px w-6" style={{ background: 'var(--bdr-2)' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}
