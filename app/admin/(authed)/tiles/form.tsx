'use client';

import {useMemo, useState} from 'react';
import {ImagePlus, MonitorPlay, User, X} from 'lucide-react';
import {HeroTreemap} from '@/components/hero-treemap';
import {
  HERO_OWNER_DEFAULTS,
  HERO_OWNER_NAME,
  HERO_SLOT_KEYS,
  HERO_SLOT_SPECS,
  formatGel,
  formatOccupiedUntil,
  type HeroAdSlot,
  type HeroOwner,
  type HeroSlotKey
} from '@/lib/hero-ads';

type Props = {
  initial: HeroAdSlot[];
  initialOwner?: HeroOwner;
};

export function HeroAdsForm({initial, initialOwner = HERO_OWNER_DEFAULTS}: Props) {
  const [slots, setSlots] = useState<HeroAdSlot[]>(initial);
  const [owner, setOwner] = useState<HeroOwner>(initialOwner);
  const [selectedKey, setSelectedKey] = useState<HeroSlotKey>(initial[0]?.slot_key ?? 'cta');
  const [previewUploads, setPreviewUploads] = useState<Partial<Record<HeroSlotKey, string>>>({});
  const [ownerPreviewImage, setOwnerPreviewImage] = useState<string | null>(null);
  const [uploadingOwner, setUploadingOwner] = useState(false);
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerMsg, setOwnerMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);

  const previewOwner = useMemo<HeroOwner>(
    () => ({...owner, image_url: ownerPreviewImage ?? owner.image_url}),
    [owner, ownerPreviewImage]
  );

  const handleOwnerUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingOwner(true);
    setOwnerMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'hero-owner');
      const res = await fetch('/api/admin/upload-image', {method: 'POST', body: form});
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.message ?? data?.error ?? 'upload failed');
      setOwner((o) => ({...o, image_url: data.url}));
      setOwnerPreviewImage(data.url);
      setOwnerMsg({kind: 'ok', text: 'სურათი აიტვირთა — დააჭირე "Owner-ის შენახვა"-ს.'});
    } catch (e) {
      setOwnerMsg({kind: 'err', text: e instanceof Error ? e.message : 'upload failed'});
    } finally {
      setUploadingOwner(false);
    }
  };

  const handleOwnerRemoveImage = () => {
    setOwner((o) => ({...o, image_url: ''}));
    setOwnerPreviewImage(null);
    setOwnerMsg({kind: 'ok', text: 'image_url გასუფთავდა — დააჭირე "Owner-ის შენახვა"-ს (default-ზე დაბრუნდება).'});
  };

  const handleOwnerSave = async () => {
    setSavingOwner(true);
    setOwnerMsg(null);
    try {
      const res = await fetch('/api/admin/hero-owner', {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(owner)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'save failed');
      }
      setOwnerMsg({kind: 'ok', text: 'Owner შენახულია'});
    } catch (e) {
      setOwnerMsg({kind: 'err', text: e instanceof Error ? e.message : 'error'});
    } finally {
      setSavingOwner(false);
    }
  };

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

  const [uploadingKey, setUploadingKey] = useState<HeroSlotKey | null>(null);

  const handleUpload = async (file: File | null, key: HeroSlotKey) => {
    if (!file) return;
    setUploadingKey(key);
    setMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'hero-tiles');
      const res = await fetch('/api/admin/upload-image', {method: 'POST', body: form});
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.message ?? data?.error ?? 'upload failed');
      }
      updateSlot(key, {image_url: data.url});
      setPreviewUploads((current) => ({...current, [key]: data.url}));
      setMsg({kind: 'ok', text: 'სურათი აიტვირთა და image_url-ს ჩაენაცვლა. დააჭირე "შენახვა"-ს.'});
    } catch (e) {
      setMsg({kind: 'err', text: e instanceof Error ? e.message : 'upload failed'});
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemoveImage = (key: HeroSlotKey) => {
    updateSlot(key, {image_url: ''});
    setPreviewUploads((current) => {
      const {[key]: _, ...rest} = current;
      return rest;
    });
    setMsg({kind: 'ok', text: 'image_url გასუფთავდა. დააჭირე "შენახვა"-ს.'});
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
        <div className="mb-3 flex items-center gap-2">
          <User size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold">Owner tile (headline)</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="aspect-square overflow-hidden rounded-xl border bg-surface-alt">
              {previewOwner.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewOwner.image_url} alt={previewOwner.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-fg-muted">
                  სურათი არ არის
                </div>
              )}
            </div>
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs transition-colors ${
                uploadingOwner
                  ? 'border-blue-400 bg-blue-50 text-blue-900'
                  : 'border-blue-300 bg-blue-50/40 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <ImagePlus size={14} />
              {uploadingOwner ? 'იტვირთება…' : 'სურათის ატვირთვა'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                disabled={uploadingOwner}
                onChange={(e) => handleOwnerUpload(e.currentTarget.files?.[0] ?? null)}
              />
            </label>
            {owner.image_url && (
              <button
                type="button"
                onClick={handleOwnerRemoveImage}
                className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-danger transition-colors hover:bg-red-100"
              >
                <X size={12} /> სურათის წაშლა
              </button>
            )}
          </div>

          <div className="space-y-3">
            <Field label="სახელი">
              <input
                type="text"
                value={owner.name}
                onChange={(e) => setOwner((o) => ({...o, name: e.target.value}))}
                className="input"
              />
            </Field>
            <Field label="წოდება / role">
              <input
                type="text"
                value={owner.title}
                onChange={(e) => setOwner((o) => ({...o, title: e.target.value}))}
                className="input"
                placeholder="HVAC ინჟინერი · ენტერპრენერი"
              />
            </Field>
            <Field label="ბიო (bio tile)">
              <textarea
                value={owner.bio}
                onChange={(e) => setOwner((o) => ({...o, bio: e.target.value}))}
                className="input min-h-[140px] resize-y leading-relaxed"
                placeholder="ვინ ხარ, რატომ შექმენი საიტი, 3-5 წინადადება"
              />
            </Field>
            <Field label="Image URL (auto-filled ატვირთვის შემდეგ)">
              <input
                type="url"
                value={owner.image_url}
                onChange={(e) => setOwner((o) => ({...o, image_url: e.target.value}))}
                className="input font-mono text-xs"
                placeholder="https://..."
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOwnerSave}
                disabled={savingOwner}
                className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy/90 disabled:opacity-50"
              >
                {savingOwner ? 'ინახება…' : 'Owner-ის შენახვა'}
              </button>
              {ownerMsg && (
                <span
                  className={`text-xs font-medium ${
                    ownerMsg.kind === 'ok' ? 'text-green-700' : 'text-danger'
                  }`}
                >
                  {ownerMsg.text}
                </span>
              )}
            </div>
            <p className="text-[10px] text-fg-muted">
              ეს tile ჩანს მთავარ გვერდზე hero grid-ის მარცხენა ზედა კუთხეში. ყველა სარეკლამო
              slot-ზე owner ნიშნად გამოჩნდება „{owner.name || HERO_OWNER_NAME}".
            </p>
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
                  <Field label="WhatsApp ნომერი">
                    <input
                      type="text"
                      value={selected.contact_phone}
                      onChange={(e) =>
                        updateSlot(selected.slot_key, {contact_phone: e.target.value})
                      }
                      className="input font-mono"
                      placeholder="+995599123456"
                    />
                  </Field>
                  <Field label="Promo badge">
                    <input
                      type="text"
                      value={selected.promo_badge}
                      onChange={(e) =>
                        updateSlot(selected.slot_key, {promo_badge: e.target.value.toUpperCase()})
                      }
                      className="input font-mono"
                      placeholder="SALE / NEW / -20%"
                    />
                  </Field>
                </div>

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

                <Field label="სურათის ატვირთვა (Supabase Storage)">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm transition-colors ${
                        uploadingKey === selected.slot_key
                          ? 'border-blue-400 bg-blue-50 text-blue-900'
                          : 'border-blue-300 bg-blue-50/40 text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      <ImagePlus size={16} />
                      {uploadingKey === selected.slot_key
                        ? 'იტვირთება…'
                        : 'JPG / PNG / WEBP · max 5MB'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        disabled={uploadingKey === selected.slot_key}
                        onChange={(e) =>
                          handleUpload(
                            e.currentTarget.files?.[0] ?? null,
                            selected.slot_key
                          )
                        }
                      />
                    </label>
                    {selected.image_url && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(selected.slot_key)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-danger transition-colors hover:bg-red-100"
                      >
                        <X size={12} /> წაშლა
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] font-mono text-fg-muted">
                    ფაილი ატვირთულ იქნება public-assets ბუკეტში; publicUrl-ი ავტომატურად
                    ჩაწერდება <code>image_url</code>-ში.
                  </p>
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
                    WhatsApp: <strong>{selected.contact_phone || '—'}</strong>
                  </div>
                  <div className="mt-1">
                    Promo: <strong>{selected.promo_badge || '—'}</strong>
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
          <HeroTreemap slots={previewSlots} owner={previewOwner} />
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
                <th className="px-3 py-2 text-left font-medium">კონტაქტი</th>
                <th className="px-3 py-2 text-left font-medium">Promo</th>
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
                    <td className="px-3 py-2 font-mono text-xs">{slot.contact_phone || '—'}</td>
                    <td className="px-3 py-2">
                      {slot.promo_badge ? (
                        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {slot.promo_badge}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
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
