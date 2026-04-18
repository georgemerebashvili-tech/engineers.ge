'use client';

import {useMemo, useState} from 'react';
import {ImagePlus, MonitorPlay} from 'lucide-react';
import {HeroTreemap} from '@/components/hero-treemap';
import {
  HERO_OWNER_NAME,
  HERO_SLOT_KEYS,
  HERO_SLOT_SPECS,
  formatGel,
  formatOccupiedUntil,
  type HeroAdSlot,
  type HeroSlotKey
} from '@/lib/hero-ads';

type Props = {
  initial: HeroAdSlot[];
};

export function HeroAdsForm({initial}: Props) {
  const [slots, setSlots] = useState<HeroAdSlot[]>(initial);
  const [selectedKey, setSelectedKey] = useState<HeroSlotKey>(initial[0]?.slot_key ?? 'cta');
  const [previewUploads, setPreviewUploads] = useState<Partial<Record<HeroSlotKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);

  const selected = slots.find((slot) => slot.slot_key === selectedKey) ?? slots[0];

  const previewSlots = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        image_url: previewUploads[slot.slot_key] ?? slot.image_url
      })),
    [previewUploads, slots]
  );

  const updateSlot = (key: HeroSlotKey, patch: Partial<HeroAdSlot>) => {
    setSlots((list) => list.map((slot) => (slot.slot_key === key ? {...slot, ...patch} : slot)));
    setMsg(null);
  };

  const handleUpload = (file: File | null, key: HeroSlotKey) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setPreviewUploads((current) => ({...current, [key]: result}));
      setMsg({
        kind: 'ok',
        text: 'სურათი ჩაიტვირთა მხოლოდ სიმულაციისთვის. შენახვისთვის image URL ცალკე შეინახე.'
      });
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const response = await fetch('/api/admin/tiles', {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({slots})
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? 'save failed');
      }
      setMsg({kind: 'ok', text: 'შენახულია'});
    } catch (error) {
      setMsg({kind: 'err', text: error instanceof Error ? error.message : 'error'});
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="rounded-2xl border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
              Owner
            </div>
            <div className="mt-1 text-lg font-semibold text-navy">{HERO_OWNER_NAME}</div>
          </div>
          <div className="rounded-xl border border-blue-300 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
            ყველა სარეკლამო slot-ზე owner ნიშნად გამოჩნდება {HERO_OWNER_NAME}.
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <MonitorPlay size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold">სლოტის მართვა</h2>
          </div>

          <div className="space-y-3">
            <Field label="ადგილის არჩევა">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value as HeroSlotKey)}
                className="input"
              >
                {slots.map((slot) => (
                  <option key={slot.slot_key} value={slot.slot_key}>
                    {slot.display_name}
                  </option>
                ))}
              </select>
            </Field>

            {selected && (
              <>
                <Field label="კლიენტი">
                  <input
                    type="text"
                    value={selected.client_name}
                    onChange={(e) =>
                      updateSlot(selected.slot_key, {client_name: e.target.value})
                    }
                    className="input"
                    placeholder="კლიენტის სახელი"
                  />
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="ფასი (GEL)">
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={selected.price_gel}
                      onChange={(e) =>
                        updateSlot(selected.slot_key, {
                          price_gel: Number(e.target.value) || 0
                        })
                      }
                      className="input font-mono"
                    />
                  </Field>
                  <Field label="დაკავებულია როდემდე">
                    <input
                      type="date"
                      value={selected.occupied_until ?? ''}
                      onChange={(e) =>
                        updateSlot(selected.slot_key, {
                          occupied_until: e.target.value || null
                        })
                      }
                      className="input font-mono"
                    />
                  </Field>
                </div>

                <Field label="სათაური">
                  <input
                    type="text"
                    value={selected.label}
                    onChange={(e) => updateSlot(selected.slot_key, {label: e.target.value})}
                    className="input"
                  />
                </Field>

                <Field label="ქვესათაური">
                  <input
                    type="text"
                    value={selected.sublabel}
                    onChange={(e) =>
                      updateSlot(selected.slot_key, {sublabel: e.target.value})
                    }
                    className="input"
                  />
                </Field>

                <Field label="Image URL">
                  <input
                    type="url"
                    value={selected.image_url}
                    onChange={(e) =>
                      updateSlot(selected.slot_key, {image_url: e.target.value})
                    }
                    className="input"
                    placeholder="https://images.unsplash.com/..."
                  />
                </Field>

                <Field label="Link URL (კლიკზე გადავა)">
                  <input
                    type="url"
                    value={selected.link_url}
                    onChange={(e) =>
                      updateSlot(selected.slot_key, {link_url: e.target.value})
                    }
                    className="input"
                    placeholder="https://clientsite.com"
                  />
                </Field>

                <Field label="სიმულაციის სურათი (local upload)">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 px-3 py-3 text-sm text-blue-700 transition-colors hover:bg-blue-50">
                    <ImagePlus size={16} />
                    სურათის ატვირთვა სიმულაციისთვის
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUpload(e.currentTarget.files?.[0] ?? null, selected.slot_key)
                      }
                    />
                  </label>
                </Field>

                <label className="flex items-center gap-2 rounded-lg border bg-surface-alt px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.is_ad_slot}
                    onChange={(e) =>
                      updateSlot(selected.slot_key, {is_ad_slot: e.target.checked})
                    }
                  />
                  სლოტი ჩათვალე სარეკლამო ადგილად
                </label>

                <div className="rounded-xl border bg-surface-alt p-3 text-xs text-fg-muted">
                  <div>
                    ფორმატი: <strong>{selected.format_hint}</strong>
                  </div>
                  <div className="mt-1">
                    რეკომენდებული ზომა: <strong>{selected.size_hint}</strong>
                  </div>
                  <div className="mt-1">
                    დაკავებულია: <strong>{formatOccupiedUntil(selected.occupied_until)}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">სიმულაცია</h2>
              <p className="text-xs text-fg-muted">
                preview-ზე გიორგი მერებაშვილი მუდმივად ჩანს owner ნიშნად და პირად tile-შიც.
              </p>
            </div>
            <div className="rounded-lg border border-blue-300 bg-blue-50/70 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700">
              Live Preview
            </div>
          </div>
          <HeroTreemap slots={previewSlots} />
        </section>
      </div>

      <section className="rounded-2xl border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">ფორმატი და ზომა</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">ადგილი</th>
                <th className="px-3 py-2 text-left font-medium">ფორმატი</th>
                <th className="px-3 py-2 text-left font-medium">ზომა</th>
              </tr>
            </thead>
            <tbody>
              {HERO_SLOT_KEYS.map((key) => (
                <tr key={key} className="border-t">
                  <td className="px-3 py-2 font-medium">{HERO_SLOT_SPECS[key].display_name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{HERO_SLOT_SPECS[key].format_hint}</td>
                  <td className="px-3 py-2 font-mono text-xs">{HERO_SLOT_SPECS[key].size_hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">როდემდეა დაკავებული ბანერი</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">ადგილი</th>
                <th className="px-3 py-2 text-left font-medium">კლიენტი</th>
                <th className="px-3 py-2 text-right font-medium">ფასი</th>
                <th className="px-3 py-2 text-left font-medium">დაკავებულია</th>
                <th className="px-3 py-2 text-left font-medium">სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const occupied = formatOccupiedUntil(slot.occupied_until);
                const busy = slot.is_ad_slot && !!slot.occupied_until;
                return (
                  <tr key={slot.slot_key} className="border-t">
                    <td className="px-3 py-2 font-medium">{slot.display_name}</td>
                    <td className="px-3 py-2">{slot.client_name || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {slot.price_gel > 0 ? `${formatGel(slot.price_gel)} ₾` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{occupied}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          busy
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        }`}
                      >
                        {busy ? 'დაკავებულია' : 'თავისუფალია'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {saving ? 'ინახება…' : 'შენახვა'}
        </button>
        {msg && (
          <span
            className={`text-xs ${
              msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid var(--bdr);
          background: var(--sur);
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 13px;
          color: var(--text);
          transition: border-color 0.15s;
        }
        .input:focus {
          outline: none;
          border-color: var(--blue);
        }
      `}</style>
    </form>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
