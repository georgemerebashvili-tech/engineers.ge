'use client';

import {useState} from 'react';
import {ArrowDown, ArrowUp, Eye, GripVertical, ImagePlus, Plus, Save, Trash2, X} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {StoryTimelineModal} from '@/components/story-timeline';
import {type StoryEvent} from '@/lib/story-timeline';

type Draft = {
  __key: string;
  id?: string;
  year: number;
  title: string;
  description: string;
  image_url: string;
  accent: string;
  sort_order: number;
};

const ACCENT_PALETTE = ['#1f6fd4', '#1a3a6b', '#0f6e3a', '#c05010', '#7c3aed', '#c0201a'];

let localKeyCounter = 0;
function newDraftKey() {
  localKeyCounter += 1;
  return `local-${Date.now()}-${localKeyCounter}`;
}

function toDraft(ev: StoryEvent, index: number): Draft {
  return {
    __key: ev.id ?? newDraftKey(),
    id: ev.id,
    year: ev.year,
    title: ev.title,
    description: ev.description,
    image_url: ev.image_url ?? '',
    accent: ev.accent ?? '#1f6fd4',
    sort_order: ev.sort_order ?? (index + 1) * 10
  };
}

function draftToEvent(d: Draft): StoryEvent {
  return {
    id: d.id ?? d.__key,
    year: d.year,
    title: d.title,
    description: d.description,
    image_url: d.image_url || undefined,
    accent: d.accent,
    sort_order: d.sort_order
  };
}

export function StoryEventsWorkspace({initial}: {initial: StoryEvent[]}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => initial.map((e, i) => toDraft(e, i)));
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const addRow = () => {
    const nextSort = Math.max(0, ...drafts.map((d) => d.sort_order)) + 10;
    setDrafts((d) => [
      ...d,
      {
        __key: newDraftKey(),
        year: new Date().getFullYear(),
        title: '',
        description: '',
        image_url: '',
        accent: '#1f6fd4',
        sort_order: nextSort
      }
    ]);
  };

  const updateRow = (index: number, patch: Partial<Draft>) => {
    setDrafts((d) => d.map((row, i) => (i === index ? {...row, ...patch} : row)));
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const next = [...drafts];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    const a = next[index];
    const b = next[swapIdx];
    const aSort = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = aSort;
    next[index] = b;
    next[swapIdx] = a;
    setDrafts(next);
  };

  const uploadImage = async (index: number, file: File) => {
    try {
      setMsg(null);
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'story-timeline');
      const res = await fetch('/api/admin/upload-image', {method: 'POST', body: form});
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.message ?? data?.error ?? 'upload failed');
      updateRow(index, {image_url: data.url});
      setMsg({kind: 'ok', text: 'სურათი აიტვირთა — შეინახე რომ მონაცემი გადავიდეს db-ში.'});
    } catch (e) {
      setMsg({kind: 'err', text: e instanceof Error ? e.message : 'upload failed'});
    }
  };

  const saveRow = async (index: number) => {
    const draft = drafts[index];
    if (!draft.title.trim()) {
      setMsg({kind: 'err', text: 'სათაური აუცილებელია'});
      return;
    }
    setSaving(String(index));
    setMsg(null);
    try {
      const res = await fetch('/api/admin/story-events', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          id: draft.id,
          year: draft.year,
          title: draft.title,
          description: draft.description,
          image_url: draft.image_url,
          accent: draft.accent,
          sort_order: draft.sort_order
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'save failed');
      updateRow(index, {id: data.event.id});
      setMsg({kind: 'ok', text: 'შენახულია'});
    } catch (e) {
      setMsg({kind: 'err', text: e instanceof Error ? e.message : 'save failed'});
    } finally {
      setSaving(null);
    }
  };

  const deleteRow = async (index: number) => {
    const draft = drafts[index];
    if (!confirm(`ნამდვილად წაიშალოს წელი ${draft.year} — "${draft.title}"?`)) return;
    if (!draft.id) {
      setDrafts((d) => d.filter((_, i) => i !== index));
      return;
    }
    setSaving(`del-${index}`);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/story-events?id=${encodeURIComponent(draft.id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'delete failed');
      }
      setDrafts((d) => d.filter((_, i) => i !== index));
      setMsg({kind: 'ok', text: 'წაიშალა'});
    } catch (e) {
      setMsg({kind: 'err', text: e instanceof Error ? e.message : 'delete failed'});
    } finally {
      setSaving(null);
    }
  };

  const saveOrder = async () => {
    const withIds = drafts.filter((d) => d.id);
    if (withIds.length === 0) return;
    setSaving('reorder');
    setMsg(null);
    try {
      const res = await fetch('/api/admin/story-events', {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          orders: withIds.map((d) => ({id: d.id!, sort_order: d.sort_order}))
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'reorder failed');
      }
      setMsg({kind: 'ok', text: 'რიგი განახლდა'});
    } catch (e) {
      setMsg({kind: 'err', text: e instanceof Error ? e.message : 'reorder failed'});
    } finally {
      setSaving(null);
    }
  };

  const previewEvents = drafts.map(draftToEvent);

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 6}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const {active, over} = e;
    if (!over || active.id === over.id) return;
    const oldIndex = drafts.findIndex((d) => d.__key === active.id);
    const newIndex = drafts.findIndex((d) => d.__key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(drafts, oldIndex, newIndex).map((row, i) => ({
      ...row,
      sort_order: (i + 1) * 10
    }));
    setDrafts(reordered);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md border border-bdr-2 bg-sur px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-blue hover:bg-[var(--blue-lt)] hover:text-blue"
        >
          <Plus size={14} /> ახალი წელი
        </button>
        <button
          type="button"
          onClick={saveOrder}
          disabled={saving === 'reorder'}
          className="inline-flex items-center gap-1.5 rounded-md border border-bdr-2 bg-sur px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-blue hover:bg-[var(--blue-lt)] hover:text-blue disabled:opacity-50"
        >
          <Save size={14} /> რიგის შენახვა
        </button>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-bdr-2 bg-sur px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-blue hover:bg-[var(--blue-lt)] hover:text-blue"
        >
          <Eye size={14} /> preview
        </button>
        {msg && (
          <span
            className={`ml-auto inline-flex items-center rounded-md px-3 py-1 text-xs font-mono font-semibold ${
              msg.kind === 'ok'
                ? 'bg-[var(--grn-lt)] text-grn'
                : 'bg-[var(--red-lt)] text-red'
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={drafts.map((d) => d.__key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {drafts.map((row, i) => (
              <SortableDraftRow
                key={row.__key}
                row={row}
                index={i}
                total={drafts.length}
                saving={saving}
                onChange={updateRow}
                onMove={moveRow}
                onSave={saveRow}
                onDelete={deleteRow}
                onUpload={uploadImage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {drafts.length === 0 && (
        <div className="rounded-lg border border-dashed border-bdr-2 bg-sur p-8 text-center text-sm text-text-3">
          ჯერ არცერთი წელი არ არის დამატებული. დააჭირე „ახალი წელი"-ს.
        </div>
      )}

      <StoryTimelineModal
        open={previewOpen}
        ownerName="გიორგი მერებაშვილი"
        events={previewEvents}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}

type SortableRowProps = {
  row: Draft;
  index: number;
  total: number;
  saving: string | null;
  onChange: (index: number, patch: Partial<Draft>) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onSave: (index: number) => void;
  onDelete: (index: number) => void;
  onUpload: (index: number, file: File) => void;
};

function SortableDraftRow({
  row,
  index: i,
  total,
  saving,
  onChange,
  onMove,
  onSave,
  onDelete,
  onUpload
}: SortableRowProps) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: row.__key
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging
      ? '0 12px 28px rgba(26, 58, 107, 0.18), 0 0 0 2px var(--blue)'
      : '0 1px 3px rgba(0, 0, 0, 0.04)',
    zIndex: isDragging ? 10 : 'auto'
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-bdr bg-sur p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-text-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md border border-transparent text-text-3 hover:border-bdr-2 hover:bg-sur-2 hover:text-navy active:cursor-grabbing"
          aria-label="გადათრიე"
        >
          <GripVertical size={14} />
        </button>
        <span className="font-mono text-[10px] uppercase tracking-wider">
          #{i + 1} · sort: {row.sort_order}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_180px]">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-text-3">წელი</label>
          <input
            type="number"
            min={1900}
            max={new Date().getFullYear() + 5}
            value={row.year}
            onChange={(e) => onChange(i, {year: Number(e.target.value)})}
            className="w-full rounded-md border border-bdr bg-sur px-2 py-1.5 font-mono text-lg font-bold text-navy focus:border-blue focus:outline-none"
          />
          <label className="mt-2 text-[11px] font-mono uppercase tracking-wider text-text-3">ფერი</label>
          <div className="flex flex-wrap gap-1.5">
            {ACCENT_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange(i, {accent: color})}
                aria-label={color}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  row.accent === color ? 'border-navy' : 'border-transparent'
                }`}
                style={{background: color}}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-text-3">სათაური</label>
          <input
            type="text"
            value={row.title}
            onChange={(e) => onChange(i, {title: e.target.value})}
            placeholder="მაგ: engineers.ge დაფუძნება"
            className="w-full rounded-md border border-bdr bg-sur px-3 py-2 text-sm text-text focus:border-blue focus:outline-none"
          />
          <label className="mt-1 text-[11px] font-mono uppercase tracking-wider text-text-3">აღწერა</label>
          <textarea
            value={row.description}
            onChange={(e) => onChange(i, {description: e.target.value})}
            placeholder="რა მოხდა ამ წელს — მოკლე აღწერა."
            rows={3}
            className="w-full rounded-md border border-bdr bg-sur px-3 py-2 text-sm leading-relaxed text-text focus:border-blue focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-text-3">სურათი (წრეში)</label>
          <div
            className="relative flex aspect-square items-center justify-center overflow-hidden rounded-full border-4 bg-sur-2"
            style={{borderColor: row.accent}}
          >
            {row.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={28} style={{color: row.accent, opacity: 0.6}} />
            )}
            {row.image_url && (
              <button
                type="button"
                onClick={() => onChange(i, {image_url: ''})}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="წაშალე სურათი"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-bdr-2 bg-sur px-2 py-1 text-xs font-semibold text-navy hover:border-blue hover:text-blue">
            <ImagePlus size={12} /> ატვირთე
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(i, f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-bdr pt-3">
        <button
          type="button"
          onClick={() => onMove(i, -1)}
          disabled={i === 0}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr text-text-2 hover:border-blue hover:text-blue disabled:opacity-30"
          aria-label="ზემოთ"
        >
          <ArrowUp size={13} />
        </button>
        <button
          type="button"
          onClick={() => onMove(i, 1)}
          disabled={i === total - 1}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr text-text-2 hover:border-blue hover:text-blue disabled:opacity-30"
          aria-label="ქვემოთ"
        >
          <ArrowDown size={13} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSave(i)}
            disabled={saving === String(i)}
            className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--navy-2)] disabled:opacity-50"
          >
            <Save size={12} /> შენახვა
          </button>
          <button
            type="button"
            onClick={() => onDelete(i)}
            disabled={saving === `del-${i}`}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--red-lt)] bg-[var(--red-lt)] px-2.5 py-1.5 text-xs font-semibold text-red hover:border-red disabled:opacity-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
