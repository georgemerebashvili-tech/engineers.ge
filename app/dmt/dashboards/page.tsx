'use client';

import {useEffect, useRef, useState} from 'react';
import {
  Plus,
  Trash2,
  LayoutDashboard,
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Table as TableIcon,
  Hash,
  StickyNote,
  Filter as FilterIcon,
  GripVertical,
  Edit3,
  ChevronDown,
  Layers,
  Eye,
  PencilRuler,
  Package
} from 'lucide-react';
import {WidgetView} from '@/components/dmt/dashboard/widget-view';
import {WidgetConfigPanel} from '@/components/dmt/dashboard/widget-config';
import {
  DEMO_DASHBOARDS,
  WIDGET_META,
  loadActiveId,
  loadDashboards,
  loadTemplates,
  randomId,
  saveActiveId,
  saveDashboards,
  saveTemplates,
  type Dashboard,
  type Widget,
  type WidgetConfig,
  type WidgetTemplate,
  type WidgetType
} from '@/lib/dmt/dashboards';

type Mode = 'edit' | 'view';

const PALETTE_ICONS: Record<WidgetType, React.ComponentType<{size?: number; strokeWidth?: number}>> = {
  stat: Hash,
  bar: BarChart3,
  pie: PieIcon,
  line: LineIcon,
  table: TableIcon,
  filter: FilterIcon,
  note: StickyNote
};

const ROW_H = 90; // px per row

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>(DEMO_DASHBOARDS);
  const [activeId, setActiveId] = useState<string>('default');
  const [mode, setMode] = useState<Mode>('edit');
  const [selectedWid, setSelectedWid] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [globalStatus, setGlobalStatus] = useState<string>('');
  const [paletteTab, setPaletteTab] = useState<'widgets' | 'templates'>('widgets');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const list = loadDashboards();
    setDashboards(list);
    const id = loadActiveId();
    setActiveId(id && list.some((d) => d.id === id) ? id : list[0]?.id ?? 'default');
    setTemplates(loadTemplates());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDashboards(dashboards);
  }, [dashboards, hydrated]);

  useEffect(() => {
    if (!hydrated || !activeId) return;
    saveActiveId(activeId);
  }, [activeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveTemplates(templates);
  }, [templates, hydrated]);

  const active = dashboards.find((d) => d.id === activeId) ?? dashboards[0];
  const selected = active?.widgets.find((w) => w.id === selectedWid) ?? null;

  const setWidgets = (updater: (ws: Widget[]) => Widget[]) => {
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === active?.id ? {...d, widgets: updater(d.widgets), updatedAt: Date.now()} : d
      )
    );
  };

  const addWidget = (type: WidgetType) => {
    const meta = WIDGET_META[type];
    const id = randomId('w');
    const widget: Widget = {
      id,
      type,
      w: meta.defaultW,
      h: meta.defaultH,
      config: {...meta.defaultConfig}
    };
    setWidgets((ws) => [...ws, widget]);
    setSelectedWid(id);
  };

  const addFromTemplate = (tpl: WidgetTemplate) => {
    const id = randomId('w');
    setWidgets((ws) => [...ws, {id, type: tpl.type, w: tpl.w, h: tpl.h, config: {...tpl.config}}]);
    setSelectedWid(id);
  };

  const updateConfig = (wid: string, patch: Partial<WidgetConfig>) => {
    setWidgets((ws) =>
      ws.map((w) => (w.id === wid ? {...w, config: {...w.config, ...patch}} : w))
    );
  };

  const updateSize = (wid: string, patch: {w?: Widget['w']; h?: Widget['h']}) => {
    setWidgets((ws) => ws.map((w) => (w.id === wid ? {...w, ...patch} : w)));
  };

  const deleteWidget = (wid: string) => {
    if (!confirm('widget-ის წაშლა?')) return;
    setWidgets((ws) => ws.filter((w) => w.id !== wid));
    if (selectedWid === wid) setSelectedWid(null);
  };

  const duplicateWidget = (wid: string) => {
    setWidgets((ws) => {
      const src = ws.find((w) => w.id === wid);
      if (!src) return ws;
      const id = randomId('w');
      return [...ws, {...src, id, config: {...src.config, title: (src.config.title || '') + ' (copy)'}}];
    });
  };

  const saveAsTemplate = (wid: string) => {
    const w = active?.widgets.find((x) => x.id === wid);
    if (!w) return;
    const name = prompt('შაბლონის სახელი?', w.config.title || w.type);
    if (!name?.trim()) return;
    const tpl: WidgetTemplate = {
      id: randomId('tpl'),
      name: name.trim(),
      type: w.type,
      w: w.w,
      h: w.h,
      config: {...w.config}
    };
    setTemplates((prev) => [...prev, tpl]);
    setPaletteTab('templates');
  };

  const deleteTemplate = (tid: string) => {
    if (!confirm('შაბლონი წავშალო?')) return;
    setTemplates((prev) => prev.filter((t) => t.id !== tid));
  };

  const createDashboard = () => {
    const name = prompt('დესკბორდის სახელი?', 'ახალი დესკბორდი');
    if (!name?.trim()) return;
    const id = randomId('db');
    const db: Dashboard = {
      id,
      name: name.trim(),
      widgets: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setDashboards((prev) => [...prev, db]);
    setActiveId(id);
  };

  const renameDashboard = () => {
    if (!active) return;
    const name = prompt('ახალი სახელი?', active.name);
    if (!name?.trim()) return;
    setDashboards((prev) =>
      prev.map((d) => (d.id === active.id ? {...d, name: name.trim()} : d))
    );
  };

  const deleteDashboard = () => {
    if (!active) return;
    if (dashboards.length <= 1) {
      alert('მინიმუმ ერთი დესკბორდი უნდა დარჩეს.');
      return;
    }
    if (!confirm(`"${active.name}" წავშალო?`)) return;
    setDashboards((prev) => {
      const next = prev.filter((d) => d.id !== active.id);
      setActiveId(next[0]?.id ?? '');
      return next;
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar: dashboard selector + mode toggle + global filter */}
      <header className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-bdr bg-sur px-4 py-2.5 md:px-6">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
          <LayoutDashboard size={12} /> DASHBOARDS
        </div>
        <DashboardSwitcher
          dashboards={dashboards}
          active={active?.id ?? ''}
          onChange={(id) => {
            setActiveId(id);
            setSelectedWid(null);
          }}
          onCreate={createDashboard}
        />
        <button
          onClick={renameDashboard}
          className="rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          title="სახელის შეცვლა"
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={deleteDashboard}
          className="rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11px] font-semibold text-text-2 hover:border-red hover:text-red"
          title="წაშლა"
        >
          <Trash2 size={12} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={globalStatus}
            onChange={(e) => setGlobalStatus(e.target.value)}
            className="rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11.5px] focus:border-blue focus:outline-none"
            title="გლობალური სტატუს ფილტრი"
          >
            <option value="">ყველა სტატუსი</option>
            <option value="ახალი">ახალი</option>
            <option value="მოლაპარაკების პროცესი">მოლაპარაკების პროცესი</option>
            <option value="შეთავაზება გაცემული">შეთავაზება გაცემული</option>
            <option value="დახურული-მოგება">დახურული-მოგება</option>
            <option value="დახურული-დაკარგვა">დახურული-დაკარგვა</option>
          </select>
          <div className="inline-flex overflow-hidden rounded-md border border-bdr bg-sur-2">
            <button
              onClick={() => setMode('edit')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                mode === 'edit' ? 'bg-blue text-white' : 'text-text-2 hover:text-blue'
              }`}
            >
              <PencilRuler size={12} /> რედაქტ.
            </button>
            <button
              onClick={() => {
                setMode('view');
                setSelectedWid(null);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                mode === 'view' ? 'bg-blue text-white' : 'text-text-2 hover:text-blue'
              }`}
            >
              <Eye size={12} /> პრევიუ
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Palette */}
        {mode === 'edit' && (
          <aside className="flex w-[220px] shrink-0 flex-col border-r border-bdr bg-sur-2">
            <div className="flex items-center border-b border-bdr">
              <button
                onClick={() => setPaletteTab('widgets')}
                className={`flex-1 px-3 py-2 text-[11px] font-semibold transition-colors ${
                  paletteTab === 'widgets'
                    ? 'border-b-2 border-blue text-blue'
                    : 'text-text-3 hover:text-navy'
                }`}
              >
                <Package size={12} className="mr-1 inline" /> MODULES
              </button>
              <button
                onClick={() => setPaletteTab('templates')}
                className={`flex-1 px-3 py-2 text-[11px] font-semibold transition-colors ${
                  paletteTab === 'templates'
                    ? 'border-b-2 border-blue text-blue'
                    : 'text-text-3 hover:text-navy'
                }`}
              >
                <Layers size={12} className="mr-1 inline" /> SAVED
                {templates.length > 0 && (
                  <span className="ml-1 rounded-full bg-blue px-1.5 py-0.5 font-mono text-[9px] text-white">
                    {templates.length}
                  </span>
                )}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {paletteTab === 'widgets' &&
                (Object.keys(WIDGET_META) as WidgetType[]).map((t) => {
                  const m = WIDGET_META[t];
                  const Icon = PALETTE_ICONS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => addWidget(t)}
                      className="mb-1.5 w-full rounded-md border border-bdr bg-sur p-2.5 text-left transition-colors hover:border-blue hover:bg-blue-lt"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-lt text-blue">
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-bold text-navy">{m.label}</div>
                          <div className="mt-0.5 text-[10.5px] leading-tight text-text-3">
                            {m.description}
                          </div>
                        </div>
                        <Plus size={12} className="mt-1.5 shrink-0 text-text-3" />
                      </div>
                    </button>
                  );
                })}

              {paletteTab === 'templates' && (
                <>
                  {templates.length === 0 && (
                    <div className="rounded-md border border-dashed border-bdr bg-sur p-3 text-center text-[11px] text-text-3">
                      შაბლონი ჯერ არ გაქვს.
                      <div className="mt-1 text-[10.5px]">
                        შექმენი widget, დააჭირე „შაბლონად შენახვა".
                      </div>
                    </div>
                  )}
                  {templates.map((tpl) => {
                    const Icon = PALETTE_ICONS[tpl.type];
                    return (
                      <div
                        key={tpl.id}
                        className="group mb-1.5 rounded-md border border-bdr bg-sur p-2 transition-colors hover:border-blue"
                      >
                        <button onClick={() => addFromTemplate(tpl)} className="flex w-full items-start gap-2 text-left">
                          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-lt text-blue">
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-bold text-navy">{tpl.name}</div>
                            <div className="mt-0.5 font-mono text-[10px] text-text-3">
                              {tpl.type} · {tpl.w}×{tpl.h}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => deleteTemplate(tpl.id)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-text-3 opacity-0 transition-opacity hover:text-red group-hover:opacity-100"
                        >
                          <Trash2 size={10} /> წაშლა
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            <div className="border-t border-bdr bg-sur p-2.5 text-[10.5px] leading-relaxed text-text-3">
              💡 დააჭირე modul-ს → canvas-ზე გაჩნდება. შემდეგ drag-ით დალაგება და ზომის შეცვლა კონფიგ-პანელიდან.
            </div>
          </aside>
        )}

        {/* Canvas */}
        <main className="min-w-0 flex-1 overflow-auto bg-bg p-4 md:p-6">
          {active && (
            <Canvas
              widgets={active.widgets}
              mode={mode}
              selectedId={selectedWid}
              onSelect={(id) => setSelectedWid(id)}
              onReorder={(newOrder) =>
                setWidgets(() => newOrder)
              }
              globalStatus={globalStatus}
            />
          )}
          {active && active.widgets.length === 0 && (
            <div className="mt-8 rounded-[12px] border-2 border-dashed border-bdr bg-sur p-12 text-center">
              <LayoutDashboard size={36} className="mx-auto mb-3 text-text-3" strokeWidth={1.2} />
              <div className="text-[14px] font-bold text-navy">ცარიელი დესკბორდი</div>
              <div className="mt-1 text-[12px] text-text-3">
                აირჩიე modul მარცხენა panel-იდან რომ დაამატო.
              </div>
            </div>
          )}
        </main>

        {/* Config panel */}
        {mode === 'edit' && selected && (
          <WidgetConfigPanel
            widget={selected}
            onChange={(p) => updateConfig(selected.id, p)}
            onSize={(p) => updateSize(selected.id, p)}
            onClose={() => setSelectedWid(null)}
            onDelete={() => deleteWidget(selected.id)}
            onDuplicate={() => duplicateWidget(selected.id)}
            onSaveTemplate={() => saveAsTemplate(selected.id)}
          />
        )}
      </div>
    </div>
  );
}

function DashboardSwitcher({
  dashboards,
  active,
  onChange,
  onCreate
}: {
  dashboards: Dashboard[];
  active: string;
  onChange: (id: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = dashboards.find((d) => d.id === active);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1 text-[12.5px] font-bold text-navy hover:border-blue"
      >
        {current?.name ?? '—'}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border border-bdr bg-sur shadow-lg">
          {dashboards.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                onChange(d.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] transition-colors ${
                d.id === active ? 'bg-blue-lt text-blue font-semibold' : 'text-text-2 hover:bg-sur-2'
              }`}
            >
              <span className="truncate">{d.name}</span>
              <span className="font-mono text-[10px] text-text-3">{d.widgets.length}</span>
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            className="flex w-full items-center gap-1.5 border-t border-bdr px-3 py-1.5 text-left text-[12px] font-semibold text-blue hover:bg-blue-lt"
          >
            <Plus size={12} /> ახალი დესკბორდი
          </button>
        </div>
      )}
    </div>
  );
}

function Canvas({
  widgets,
  mode,
  selectedId,
  onSelect,
  onReorder,
  globalStatus
}: {
  widgets: Widget[];
  mode: Mode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReorder: (ws: Widget[]) => void;
  globalStatus: string;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    if (mode !== 'edit') return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const onDragOver = (e: React.DragEvent, id: string) => {
    if (mode !== 'edit' || !draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const onDrop = (e: React.DragEvent, targetId: string) => {
    if (mode !== 'edit') return;
    e.preventDefault();
    const src = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!src || src === targetId) return;
    const srcIdx = widgets.findIndex((w) => w.id === src);
    const tgtIdx = widgets.findIndex((w) => w.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const next = [...widgets];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, moved);
    onReorder(next);
  };

  return (
    <div
      className="grid grid-cols-12 gap-3"
      style={{gridAutoRows: `${ROW_H}px`}}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      {widgets.map((w) => {
        const isSelected = mode === 'edit' && selectedId === w.id;
        const isDragOver = dragOverId === w.id && draggingId !== w.id;
        return (
          <div
            key={w.id}
            draggable={mode === 'edit'}
            onDragStart={(e) => onDragStart(e, w.id)}
            onDragOver={(e) => onDragOver(e, w.id)}
            onDrop={(e) => onDrop(e, w.id)}
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverId(null);
            }}
            onClick={(e) => {
              if (mode !== 'edit') return;
              e.stopPropagation();
              onSelect(w.id);
            }}
            style={{gridColumn: `span ${w.w}`, gridRow: `span ${w.h}`}}
            className={`group relative overflow-hidden rounded-[10px] border bg-sur transition-all ${
              isSelected ? 'border-blue ring-2 ring-blue/30' : 'border-bdr hover:border-bdr-2'
            } ${isDragOver ? 'border-blue bg-blue-lt' : ''} ${
              draggingId === w.id ? 'opacity-40' : ''
            } ${mode === 'edit' ? 'cursor-pointer' : ''}`}
          >
            {mode === 'edit' && (
              <div className="pointer-events-none absolute left-1 top-1 z-10 rounded-md bg-navy/70 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical size={12} className="text-white" />
              </div>
            )}
            <WidgetView widget={w} globalStatus={globalStatus} />
          </div>
        );
      })}
    </div>
  );
}
