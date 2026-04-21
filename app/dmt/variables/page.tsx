'use client';

import {useEffect, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {Plus, Trash2, GripVertical, Palette} from 'lucide-react';
import {
  COLOR_STYLES,
  COLORS,
  DEFAULT_SETS,
  STORE_KEY,
  randomId,
  type VarColor,
  type VarOption,
  type VarSet
} from '@/lib/dmt/variables';

export default function VariablesPage() {
  const [sets, setSets] = useState<VarSet[]>(DEFAULT_SETS);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string>(DEFAULT_SETS[0]?.id ?? '');
  const [q, setQ] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as VarSet[];
        if (Array.isArray(p) && p.length) {
          setSets(p);
          setActiveId(p[0].id);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(sets));
    } catch {}
  }, [sets, hydrated]);

  const active = sets.find((s) => s.id === activeId);

  const addSet = () => {
    const id = randomId('set');
    const ns: VarSet = {id, name: 'ახალი ცვლადი', type: 'single', options: []};
    setSets((prev) => [...prev, ns]);
    setActiveId(id);
  };

  const removeSet = (id: string) => {
    if (!confirm('ცვლადი წავშალო? (columns-ი რომელიც იყენებს — dangling გახდება)')) return;
    setSets((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) {
      const rest = sets.filter((s) => s.id !== id);
      setActiveId(rest[0]?.id ?? '');
    }
  };

  const patchSet = (id: string, patch: Partial<VarSet>) => {
    setSets((prev) => prev.map((s) => (s.id === id ? {...s, ...patch} : s)));
  };

  const addOption = (setId: string) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              options: [
                ...s.options,
                {id: randomId('opt'), label: 'ახალი ვარიანტი', color: 'gray'}
              ]
            }
          : s
      )
    );
  };

  const patchOption = (
    setId: string,
    optId: string,
    patch: Partial<VarOption>
  ) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              options: s.options.map((o) =>
                o.id === optId ? {...o, ...patch} : o
              )
            }
          : s
      )
    );
  };

  const removeOption = (setId: string, optId: string) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {...s, options: s.options.filter((o) => o.id !== optId)}
          : s
      )
    );
  };

  const filteredOptions =
    active?.options.filter((o) =>
      q.trim() ? o.label.toLowerCase().includes(q.trim().toLowerCase()) : true
    ) ?? [];

  return (
    <DmtPageShell
      kicker="OPTION SETS · REUSABLE"
      title="ცვლადები"
      subtitle="ერთხელ განსაზღვრე — ბევრ column-ში გამოიყენე. სტატუსები, როლები, პრიორიტეტები, etc."
      searchPlaceholder="ვარიანტების ძიება…"
      onQueryChange={setQ}
    >
      <div className="grid h-full md:grid-cols-[280px_1fr]">
        {/* Set list */}
        <aside className="border-r border-bdr bg-sur">
          <div className="flex items-center justify-between border-b border-bdr px-4 py-2.5">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              ცვლადების სია
            </h3>
            <button
              onClick={addSet}
              className="inline-flex items-center gap-1 rounded-md border border-blue bg-blue px-2 py-1 text-[11px] font-semibold text-white hover:bg-navy-2"
            >
              <Plus size={11} /> ახალი
            </button>
          </div>
          <ul className="divide-y divide-bdr">
            {sets.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActiveId(s.id)}
                  className={`group flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-sur-2 ${
                    s.id === activeId ? 'bg-blue-lt' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-[13px] font-semibold ${
                        s.id === activeId ? 'text-blue' : 'text-navy'
                      }`}
                    >
                      {s.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-text-3">
                      {s.options.length} ვარიანტი · {s.type}
                    </div>
                  </div>
                  <div className="flex shrink-0 -space-x-1.5">
                    {s.options.slice(0, 5).map((o) => (
                      <span
                        key={o.id}
                        className="h-3 w-3 rounded-full border border-white"
                        style={{background: COLOR_STYLES[o.color].color}}
                      />
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Set editor */}
        <section className="overflow-auto">
          {active ? (
            <div className="px-6 py-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                  value={active.name}
                  onChange={(e) => patchSet(active.id, {name: e.target.value})}
                  className="flex-1 rounded-md border border-bdr bg-sur px-3 py-1.5 text-[15px] font-semibold text-navy focus:border-blue focus:outline-none"
                />
                <select
                  value={active.type}
                  onChange={(e) =>
                    patchSet(active.id, {type: e.target.value as 'single' | 'multi'})
                  }
                  className="rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 focus:border-blue focus:outline-none"
                >
                  <option value="single">single-select</option>
                  <option value="multi">multi-select</option>
                </select>
                <button
                  onClick={() => removeSet(active.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-bdr bg-sur px-3 py-1.5 text-[12px] font-semibold text-red hover:border-red hover:bg-red-lt"
                >
                  <Trash2 size={12} /> ცვლადის წაშლა
                </button>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  ვარიანტები ({filteredOptions.length} / {active.options.length})
                </div>
                <button
                  onClick={() => addOption(active.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
                >
                  <Plus size={12} /> ვარიანტი
                </button>
              </div>

              <div className="rounded-[10px] border border-bdr bg-sur">
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[12px] text-text-3">
                    ცარიელია. დააჭირე "+ ვარიანტი" რომ დაამატო.
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const st = COLOR_STYLES[opt.color];
                    return (
                      <div
                        key={opt.id}
                        className="flex items-center gap-2 border-b border-bdr px-3 py-2 last:border-b-0 hover:bg-sur-2"
                      >
                        <GripVertical
                          size={14}
                          className="shrink-0 cursor-grab text-text-3"
                        />
                        <span
                          className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{color: st.color, background: st.bg, borderColor: st.border}}
                        >
                          {opt.label || '—'}
                        </span>
                        <input
                          value={opt.label}
                          onChange={(e) =>
                            patchOption(active.id, opt.id, {label: e.target.value})
                          }
                          className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[12.5px] text-text hover:bg-sur-2 focus:border-blue focus:bg-sur focus:outline-none"
                          placeholder="ლეიბლი…"
                        />
                        <div className="flex shrink-0 items-center gap-1 rounded-md border border-bdr bg-sur-2 p-1">
                          <Palette size={11} className="text-text-3" />
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() =>
                                patchOption(active.id, opt.id, {color: c})
                              }
                              className={`h-4 w-4 rounded-full border transition-transform hover:scale-110 ${
                                opt.color === c
                                  ? 'ring-2 ring-offset-1 ring-navy'
                                  : ''
                              }`}
                              style={{background: COLOR_STYLES[c].color, borderColor: COLOR_STYLES[c].border}}
                              title={c}
                              aria-label={c}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => removeOption(active.id, opt.id)}
                          className="shrink-0 rounded p-1 text-text-3 hover:bg-red-lt hover:text-red"
                          title="წაშლა"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 rounded-[10px] border border-bdr bg-sur-2 p-4 text-[12px] leading-relaxed text-text-2">
                <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  🔗 გამოყენება
                </div>
                <p>
                  ამ ცვლადის ID: <code className="rounded bg-sur px-1.5 py-0.5 font-mono text-[11px] text-navy">{active.id}</code>
                </p>
                <p className="mt-1">
                  /dmt/leads/manual grid-ში დააჭირე <b>+ column</b>, აირჩიე ტიპი <b>select</b> და მიუთითე ამ ცვლადის სახელი. Column უჯრები აქ განსაზღვრულ ვარიანტებს ავტომატურად მიიღებენ.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-text-3">
              ცვლადი არ არის. დააჭირე "+ ახალი".
            </div>
          )}
        </section>
      </div>
    </DmtPageShell>
  );
}
