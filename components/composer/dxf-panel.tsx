'use client';

import {Layers3, LoaderCircle, ScanSearch, X} from 'lucide-react';
import type {DxfClassification, DxfEntity, DxfLoaded} from '@/lib/dxf/parse';
import type {
  ClassificationResult,
  DxfClassificationFilter
} from '@/lib/dxf/wall-heuristic';

type DxfPanelProps = {
  model: DxfLoaded | null;
  status: 'idle' | 'reading' | 'parsing' | 'ready' | 'error';
  error: string | null;
  showText: boolean;
  visibleLayers: Record<string, boolean>;
  filteredLayerCounts: Record<string, number>;
  classificationResult: ClassificationResult | null;
  classificationFilter: DxfClassificationFilter;
  selectedEntity: DxfEntity | null;
  onUpload: () => void;
  onClear: () => void;
  onShowText: (value: boolean) => void;
  onClassificationFilter: (filter: DxfClassificationFilter) => void;
  onClassificationChange: (value: DxfClassification) => void;
  onSelectEntity: (id: string | null) => void;
  onToggleLayer: (name: string) => void;
  onToggleAll: (visible: boolean) => void;
};

const FILTER_OPTIONS: Array<{value: DxfClassificationFilter; label: string}> = [
  {value: 'all', label: 'ყველა'},
  {value: 'wall', label: 'კედლები'},
  {value: 'door', label: 'კარები'},
  {value: 'window', label: 'ფანჯრები'},
  {value: 'annotation', label: 'ანოტაციები'},
  {value: 'ambiguous', label: 'გაურკვეველი'}
];

const CLASS_OPTIONS: Array<{value: DxfClassificationFilter; label: string}> = [
  {value: 'ambiguous', label: 'გაურკვეველი'},
  {value: 'wall', label: 'კედელი'},
  {value: 'door', label: 'კარი'},
  {value: 'window', label: 'ფანჯარა'},
  {value: 'furniture', label: 'ავეჯი'},
  {value: 'annotation', label: 'ანოტაცია'}
];

function StatusText({status}: {status: DxfPanelProps['status']}) {
  if (status === 'reading') return <span>ფაილი იკითხება…</span>;
  if (status === 'parsing') return <span>DXF იპარსება…</span>;
  if (status === 'ready') return <span>DXF მზადაა</span>;
  if (status === 'error') return <span>DXF ვერ ჩაიტვირთა</span>;
  return <span>ჯერ DXF არ არის ატვირთული</span>;
}

export function DxfPanel({
  model,
  status,
  error,
  showText,
  visibleLayers,
  filteredLayerCounts,
  classificationResult,
  classificationFilter,
  selectedEntity,
  onUpload,
  onClear,
  onShowText,
  onClassificationFilter,
  onClassificationChange,
  onSelectEntity,
  onToggleLayer,
  onToggleAll
}: DxfPanelProps) {
  const allVisible = model ? model.layers.every((layer) => visibleLayers[layer.name]) : false;

  return (
    <div className="mt-4 grid gap-3 rounded-card border border-bdr bg-sur p-3 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Layers3 size={14} className="text-blue" />
            <div className="text-[13px] font-bold text-navy">DXF Overlay</div>
          </div>
          <div className="text-[11px] text-text-2">
            <StatusText status={status} />
          </div>
        </div>
        {status === 'reading' || status === 'parsing' ? (
          <LoaderCircle size={16} className="animate-spin text-blue" />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-blue-bd bg-blue-lt px-3 text-[11px] font-semibold text-blue transition-colors hover:bg-blue hover:text-white"
        >
          <ScanSearch size={14} />
          DXF ატვირთე
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!model}
          className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-bdr bg-sur-2 px-3 text-[11px] font-semibold text-text-2 transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={14} />
          გაწმენდა
        </button>
      </div>

      {error ? (
        <div className="rounded-[6px] border border-red bg-red-lt px-3 py-2 text-[11px] text-red">
          არასწორი DXF ფაილი: {error}
        </div>
      ) : null}

      {model ? (
        <>
          <div className="grid gap-2 text-[11px] text-text-2 md:grid-cols-2">
            <div className="rounded-[6px] border border-bdr bg-sur-2 px-3 py-2">
              <div className="font-semibold text-navy">{model.filename}</div>
              <div>{model.entities.length} entities</div>
            </div>
            <div className="rounded-[6px] border border-bdr bg-sur-2 px-3 py-2">
              <div className="font-semibold text-navy">ერთეული</div>
              <div>{model.unit}</div>
            </div>
            <div className="rounded-[6px] border border-bdr bg-sur-2 px-3 py-2 md:col-span-2">
              bounds: {model.bounds.min.x.toFixed(1)}, {model.bounds.min.z.toFixed(1)} →{' '}
              {model.bounds.max.x.toFixed(1)}, {model.bounds.max.z.toFixed(1)}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-text-2">
            <input
              type="checkbox"
              checked={showText}
              onChange={(event) => onShowText(event.target.checked)}
            />
            ტექსტური entity-ებიც გამოჩნდეს
          </label>

          {classificationResult ? (
            <div className="grid gap-2 rounded-card border border-blue-bd bg-blue-lt p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-blue">
                Classification
              </div>
              <div className="grid gap-2 text-[11px] text-text-2">
                <div className="rounded-[6px] border border-blue-bd bg-white px-2.5 py-2">
                  {classificationResult.stats.total} entities · {classificationResult.stats.wall} walls ·{' '}
                  {classificationResult.stats.door} doors · {classificationResult.stats.window} windows ·{' '}
                  {classificationResult.stats.annotation} annotations ·{' '}
                  {classificationResult.stats.ambiguous} ambiguous
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onClassificationFilter(option.value)}
                      className={`rounded-pill border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                        classificationFilter === option.value
                          ? 'border-blue bg-blue text-white'
                          : 'border-blue-bd bg-white text-blue hover:bg-blue-lt'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {selectedEntity ? (
            <div className="grid gap-2 rounded-card border border-bdr bg-sur-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  Selected Entity
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  className="text-[10px] font-bold text-blue hover:underline"
                >
                  მოხსნა
                </button>
              </div>
              <div className="grid gap-1 text-[11px] text-text-2">
                <div className="font-semibold text-navy">{selectedEntity.id}</div>
                <div>
                  {selectedEntity.type} · {selectedEntity.layer}
                </div>
              </div>
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-text-2">Manual override</span>
                <select
                  value={selectedEntity.classification ?? 'ambiguous'}
                  onChange={(event) =>
                    onClassificationChange(
                      event.target.value === 'ambiguous'
                        ? null
                        : (event.target.value as Exclude<DxfClassification, null>)
                    )
                  }
                  className="w-full rounded-[5px] border-[1.5px] border-bdr bg-sur px-2 py-1.5 text-[12px] text-text outline-none focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
                >
                  {CLASS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                Layers
              </div>
              <button
                type="button"
                onClick={() => onToggleAll(!allVisible)}
                className="text-[10px] font-bold text-blue hover:underline"
              >
                {allVisible ? 'ყველას გამორთვა' : 'ყველას ჩართვა'}
              </button>
            </div>
            <div className="grid max-h-[220px] gap-2 overflow-y-auto pr-1">
              {model.layers.map((layer) => (
                <label
                  key={layer.name}
                  className="flex items-center gap-2 rounded-[6px] border border-bdr bg-sur-2 px-2.5 py-2 text-[11px] text-text-2"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(visibleLayers[layer.name])}
                    onChange={() => onToggleLayer(layer.name)}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-bdr"
                    style={{backgroundColor: layer.colorHex}}
                  />
                  <span className="flex-1 truncate font-semibold text-navy">{layer.name}</span>
                  <span className="font-mono text-[10px] text-text-3">
                    {classificationFilter === 'all'
                      ? layer.count
                      : `${filteredLayerCounts[layer.name] ?? 0}/${layer.count}`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {model.warnings.length ? (
            <div className="rounded-[6px] border border-ora-bd bg-ora-lt px-3 py-2 text-[11px] text-ora">
              გამოტოვებული entity-ები: {model.warnings.length}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
