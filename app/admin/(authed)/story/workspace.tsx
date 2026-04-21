'use client';

import {useState} from 'react';
import {ArrowDown, ArrowUp, Eye, ImagePlus, Plus, Save, Trash2, X} from 'lucide-react';
import {StoryTimelineModal} from '@/components/story-timeline';
import {type StoryEvent} from '@/lib/story-timeline';

type Draft = {
  id?: string;
  year: number;
  title: string;
  description: string;
  image_url: string;
  accent: string;
  sort_order: number;
};

const ACCENT_PALETTE = ['#1f6fd4', '#1a3a6b', '#0f6e3a', '#c05010', '#7c3aed', '#c0201a'];

function toDraft(ev: StoryEvent, index: number): Draft {
  return {
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
    id: d.id ?? `draft-${d.year}-${d.sort_order}`,
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

      <div className="space-y-3">
        {drafts.map((row, i) => (
          <div
            key={row.id ?? `new-${i}`}
            className="rounded-lg border border-bdr bg-sur p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_180px]">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-3">
                  წელი
                </label>
                <input
                  type="number"
                  min={1900}
                  max={new Date().getFullYear() + 5}
                  value={row.year}
                  onChange={(e) => updateRow(i, {year: Number(e.target.value)})}
                  className="w-full rounded-md border border-bdr bg-sur px-2 py-1.5 font-mono text-lg font-bold text-navy focus:border-blue focus:outline-none"
                />
                <label className="mt-2 text-[11px] font-mono uppercase tracking-wider text-text-3">
                  ფერი
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ACCENT_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateRow(i, {accent: color})}
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
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-3">
                  სათაური
                </label>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => updateRow(i, {title: e.target.value})}
                  placeholder="მაგ: engineers.ge დაფუძნება"
                  className="w-full rounded-md border border-bdr bg-sur px-3 py-2 text-sm text-text focus:border-blue focus:outline-none"
                />
                <label className="mt-1 text-[11px] font-mono uppercase tracking-wider text-text-3">
                  აღწერა
                </label>
                <textarea
                  value={row.description}
                  onChange={(e) => updateRow(i, {description: e.target.value})}
                  placeholder="რა მოხდა ამ წელს — მოკლე აღწერა."
                  rows={3}
                  className="w-full rounded-md border border-bdr bg-sur px-3 py-2 text-sm leading-relaxed text-text focus:border-blue focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-3">
                  სურათი (წრეში)
                </label>
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
                      onClick={() => updateRow(i, {image_url: ''})}
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
                      if (f) uploadImage(i, f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-bdr pt-3">
              <button
                type="button"
                onClick={() => moveRow(i, -1)}
                disabled={i === 0}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr text-text-2 hover:border-blue hover:text-blue disabled:opacity-30"
                aria-label="ზემოთ"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => moveRow(i, 1)}
                disabled={i === drafts.length - 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr text-text-2 hover:border-blue hover:text-blue disabled:opacity-30"
                aria-label="ქვემოთ"
              >
                <ArrowDown size={13} />
              </button>
              <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-text-3">
                sort: {row.sort_order}
              </span>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveRow(i)}
                  disabled={saving === String(i)}
                  className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--navy-2)] disabled:opacity-50"
                >
                  <Save size={12} /> შენახვა
                </button>
                <button
                  type="button"
                  onClick={() => deleteRow(i)}
                  disabled={saving === `del-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--red-lt)] bg-[var(--red-lt)] px-2.5 py-1.5 text-xs font-semibold text-red hover:border-red disabled:opacity-50"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {drafts.length === 0 && (
          <div className="rounded-lg border border-dashed border-bdr-2 bg-sur p-8 text-center text-sm text-text-3">
            ჯერ არცერთი წელი არ არის დამატებული. დააჭირე „ახალი წელი"-ს.
          </div>
        )}
      </div>

      <StoryTimelineModal
        open={previewOpen}
        ownerName="გიორგი მერებაშვილი"
        events={previewEvents}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
