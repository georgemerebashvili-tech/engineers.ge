'use client';

import {Save, Trash2, Copy, X} from 'lucide-react';
import type {Widget, WidgetConfig, DataSource} from '@/lib/dmt/dashboards';
import {getFields} from '@/lib/dmt/dashboards';

const SOURCES: DataSource[] = ['leads', 'invoices', 'inventory'];
const AGGS = ['count', 'sum', 'avg', 'min', 'max'] as const;
const WIDTHS = [3, 4, 6, 8, 9, 12] as const;
const HEIGHTS = [1, 2, 3, 4] as const;

export function WidgetConfigPanel({
  widget,
  onChange,
  onSize,
  onClose,
  onDelete,
  onDuplicate,
  onSaveTemplate
}: {
  widget: Widget;
  onChange: (patch: Partial<WidgetConfig>) => void;
  onSize: (patch: {w?: Widget['w']; h?: Widget['h']}) => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
}) {
  const c = widget.config;
  const src = c.source ?? 'leads';
  const fields = getFields(src);

  const update = (patch: Partial<WidgetConfig>) => onChange(patch);

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-bdr bg-sur">
      <header className="flex items-center justify-between border-b border-bdr px-3 py-2.5">
        <div>
          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
            WIDGET · {widget.type}
          </div>
          <div className="text-[13px] font-bold text-navy">{c.title || '—'}</div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-3 hover:bg-sur-2 hover:text-navy"
          aria-label="დახურე"
        >
          <X size={14} />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <Field label="სათაური">
          <input
            value={c.title ?? ''}
            onChange={(e) => update({title: e.target.value})}
            className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
          />
        </Field>

        {widget.type !== 'note' && (
          <Field label="data source">
            <select
              value={src}
              onChange={(e) => update({source: e.target.value as DataSource})}
              className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}

        {widget.type === 'stat' && (
          <>
            <Field label="aggregation">
              <select
                value={c.agg ?? 'count'}
                onChange={(e) => update({agg: e.target.value as WidgetConfig['agg']})}
                className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
              >
                {AGGS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            {c.agg !== 'count' && (
              <Field label="numeric field">
                <select
                  value={c.field ?? ''}
                  onChange={(e) => update({field: e.target.value})}
                  className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
                >
                  <option value="">—</option>
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="status filter (optional)">
              <input
                value={c.statusFilter ?? ''}
                onChange={(e) => update({statusFilter: e.target.value})}
                placeholder="e.g. დახურული-მოგება"
                className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
              />
            </Field>
            <Field label="accent color">
              <div className="flex flex-wrap gap-1">
                {(['blue', 'green', 'orange', 'red', 'purple', 'navy'] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => update({color: col})}
                    className={`h-6 w-6 rounded-md border-2 transition-all ${
                      c.color === col ? 'ring-2 ring-blue' : ''
                    }`}
                    style={{
                      background: `var(--${col === 'green' ? 'grn' : col === 'orange' ? 'ora' : col === 'red' ? 'red' : col === 'navy' ? 'navy' : col === 'purple' ? 'navy' : 'blue'}-lt, ${col})`,
                      borderColor: `var(--${col === 'green' ? 'grn' : col === 'orange' ? 'ora' : col === 'red' ? 'red' : col === 'navy' ? 'navy' : col === 'purple' ? 'navy' : 'blue'})`
                    }}
                    title={col}
                  />
                ))}
              </div>
            </Field>
          </>
        )}

        {(widget.type === 'bar' || widget.type === 'pie' || widget.type === 'line') && (
          <>
            <Field label="group by">
              <select
                value={c.groupBy ?? ''}
                onChange={(e) => update({groupBy: e.target.value})}
                className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
              >
                <option value="">—</option>
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="aggregation">
              <select
                value={c.agg ?? 'count'}
                onChange={(e) => update({agg: e.target.value as WidgetConfig['agg']})}
                className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
              >
                {AGGS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            {c.agg !== 'count' && (
              <Field label="value field">
                <select
                  value={c.field ?? ''}
                  onChange={(e) => update({field: e.target.value})}
                  className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
                >
                  <option value="">—</option>
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}

        {widget.type === 'table' && (
          <>
            <Field label="limit">
              <input
                type="number"
                min={1}
                max={50}
                value={c.limit ?? 5}
                onChange={(e) => update({limit: Number(e.target.value) || 5})}
                className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 font-mono text-[12px] focus:border-blue focus:outline-none"
              />
            </Field>
            <Field label="columns">
              <div className="space-y-1 rounded-md border border-bdr bg-sur-2 p-1.5">
                {fields.map((f) => {
                  const on = (c.columns ?? []).includes(f);
                  return (
                    <label key={f} className="flex cursor-pointer items-center gap-1.5 text-[11.5px]">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const curr = c.columns ?? [];
                          update({
                            columns: on ? curr.filter((x) => x !== f) : [...curr, f]
                          });
                        }}
                        className="h-3 w-3"
                      />
                      <span className="text-text-2">{f}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          </>
        )}

        {widget.type === 'filter' && (
          <Field label="field">
            <select
              value={c.field ?? ''}
              onChange={(e) => update({field: e.target.value})}
              className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
            >
              <option value="">—</option>
              {fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        )}

        {widget.type === 'note' && (
          <Field label="ტექსტი">
            <textarea
              value={c.text ?? ''}
              onChange={(e) => update({text: e.target.value})}
              rows={6}
              className="w-full resize-y rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] leading-relaxed focus:border-blue focus:outline-none"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-bdr pt-3">
          <Field label="სიგანე (col)">
            <select
              value={widget.w}
              onChange={(e) => onSize({w: Number(e.target.value) as Widget['w']})}
              className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 font-mono text-[12px] focus:border-blue focus:outline-none"
            >
              {WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {w} / 12
                </option>
              ))}
            </select>
          </Field>
          <Field label="სიმაღლე">
            <select
              value={widget.h}
              onChange={(e) => onSize({h: Number(e.target.value) as Widget['h']})}
              className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 font-mono text-[12px] focus:border-blue focus:outline-none"
            >
              {HEIGHTS.map((h) => (
                <option key={h} value={h}>
                  {h} row
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <footer className="space-y-1.5 border-t border-bdr p-2.5">
        <button
          onClick={onSaveTemplate}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-blue bg-blue-lt px-3 py-1.5 text-[12px] font-semibold text-blue hover:bg-blue hover:text-white"
        >
          <Save size={13} /> შაბლონად შენახვა
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onDuplicate}
            className="flex items-center justify-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          >
            <Copy size={13} /> დუბლ.
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-red hover:text-red"
          >
            <Trash2 size={13} /> წაშლა
          </button>
        </div>
      </footer>
    </aside>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <div className="mb-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-3">
        {label}
      </div>
      {children}
    </label>
  );
}
