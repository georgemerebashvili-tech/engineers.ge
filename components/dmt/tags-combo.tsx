'use client';

import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Plus, Search, X} from 'lucide-react';
import type {TagCategory, TagSuggestion} from '@/lib/dmt/contacts-store';

const CATEGORY_LABELS: Record<TagCategory, string> = {
  funnel: 'Funnel',
  quality: 'Quality',
  industry: 'Industry',
  channel: 'Channel',
  priority: 'Priority',
  general: 'Custom',
};

const CATEGORY_ORDER: TagCategory[] = ['funnel', 'quality', 'industry', 'channel', 'priority', 'general'];

export function TagsCombo({
  tags,
  suggestions,
  onSave,
}: {
  tags: string[];
  suggestions: {pinned: TagSuggestion[]; byCategory: Record<TagCategory, TagSuggestion[]>};
  onSave: (tags: string[]) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const allSuggestions = useMemo(() => {
    const byTag = new Map<string, TagSuggestion>();
    for (const item of suggestions.pinned) byTag.set(item.tag, item);
    for (const category of CATEGORY_ORDER) {
      for (const item of suggestions.byCategory[category] ?? []) byTag.set(item.tag, item);
    }
    return [...byTag.values()];
  }, [suggestions]);

  const selectedMeta = useMemo(() => {
    const byTag = new Map(allSuggestions.map((item) => [item.tag, item]));
    return tags.map((tag) => byTag.get(tag) ?? {tag, emoji: '', category: 'general' as const, description: '', useCount: 0, pinned: false});
  }, [allSuggestions, tags]);

  const matches = (item: TagSuggestion) => {
    const q = input.trim().toLowerCase();
    if (!q) return true;
    return [item.tag, item.description, item.category].some((value) => value.toLowerCase().includes(q));
  };

  const addTag = async (tag: string) => {
    const clean = tag.trim();
    if (!clean || tags.includes(clean) || saving) return;
    setSaving(true);
    try {
      await onSave([...tags, clean]);
      setInput('');
    } finally {
      setSaving(false);
    }
  };

  const removeTag = async (tag: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(tags.filter((item) => item !== tag));
    } finally {
      setSaving(false);
    }
  };

  const filteredPinned = suggestions.pinned.filter((item) => !tags.includes(item.tag) && matches(item));
  const hasExact = allSuggestions.some((item) => item.tag.toLowerCase() === input.trim().toLowerCase()) || tags.includes(input.trim());

  return (
    <div ref={rootRef} className="relative min-h-7 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {selectedMeta.slice(0, 2).map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => void removeTag(item.tag)}
              className="group inline-flex min-w-0 max-w-[88px] items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-1.5 py-0.5 text-[10.5px] font-semibold text-blue"
              title={item.description || item.tag}
            >
              {item.emoji && <span className="shrink-0">{item.emoji}</span>}
              <span className="truncate">{item.tag}</span>
              <X size={10} className="hidden shrink-0 group-hover:block" />
            </button>
          ))}
          {tags.length > 2 && <span className="shrink-0 text-[10px] font-semibold text-text-3">+{tags.length - 2}</span>}
          {tags.length === 0 && <span className="text-[11px] text-text-3">—</span>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bdr bg-sur-2 text-text-3 hover:border-blue hover:text-blue"
          aria-label="Add contact tag"
        >
          <Plus size={12} />
        </button>
      </div>

      {open && (
        <div className="absolute left-1 top-9 z-50 w-[310px] rounded-lg border border-bdr bg-sur p-2 shadow-xl">
          <label className="flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-2 py-1.5">
            <Search size={13} className="text-text-3" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void addTag(input);
                }
              }}
              autoFocus
              placeholder="ძებნა..."
              className="h-5 min-w-0 flex-1 border-0 bg-transparent text-[12px] text-text outline-none placeholder:text-text-3"
            />
          </label>

          <div className="mt-2 max-h-[280px] overflow-auto pr-1">
            {filteredPinned.length > 0 && (
              <TagSection title="პოპულარული">
                {filteredPinned.map((item) => <TagOption key={item.tag} item={item} onClick={() => void addTag(item.tag)} />)}
              </TagSection>
            )}

            {CATEGORY_ORDER.map((category) => {
              const items = (suggestions.byCategory[category] ?? [])
                .filter((item) => !item.pinned)
                .filter((item) => !tags.includes(item.tag))
                .filter(matches);
              if (items.length === 0) return null;
              return (
                <TagSection key={category} title={CATEGORY_LABELS[category]}>
                  {items.map((item) => <TagOption key={item.tag} item={item} onClick={() => void addTag(item.tag)} />)}
                </TagSection>
              );
            })}

            {input.trim() && !hasExact && (
              <button
                type="button"
                onClick={() => void addTag(input)}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-blue hover:bg-blue-lt"
              >
                <Plus size={13} /> ახალი თეგი: “{input.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TagSection({title, children}: {title: string; children: ReactNode}) {
  return (
    <div className="border-b border-bdr py-1.5 last:border-b-0">
      <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.04em] text-text-3">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function TagOption({item, onClick}: {item: TagSuggestion; onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sur-2"
      title={item.description}
    >
      <span className="w-5 shrink-0 text-center">{item.emoji}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-text">{item.tag}</span>
      {item.useCount > 0 && <span className="font-mono text-[10px] text-text-3">{item.useCount}</span>}
    </button>
  );
}
