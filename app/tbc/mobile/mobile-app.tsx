'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {TbcSession} from '@/lib/tbc/auth';

type Branch = {
  id: number;
  alias: string | null;
  name: string;
  type: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  status: string | null;
  planned_count: number;
  devices?: unknown[];
};

type EquipType = {category: string; subtype: string};

const PHOTO_LABELS = [
  'ზოგადი',
  'გარე ხედი',
  'ცხაურის ხედი',
  'შიდა ხედი',
  'ნომერი / ეტიკეტი'
];

const STATUS_COLOR: Record<string, string> = {
  done: '#00AA8D',
  progress: '#0071CE',
  pending: '#F59E0B',
  described: '#8B5CF6',
  todescribe: '#EC4899',
  general: '#64748B'
};

type Screen =
  | {kind: 'list'}
  | {kind: 'branch'; branch: Branch}
  | {kind: 'add'; branch: Branch};

export function MobileApp({session}: {session: TbcSession}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>({kind: 'list'});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [types, setTypes] = useState<EquipType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([
        fetch('/api/tbc/branches'),
        fetch('/api/tbc/equipment-types')
      ]);
      if (b.status === 401) {
        router.replace('/tbc');
        return;
      }
      if (b.ok) setBranches(((await b.json()).branches || []) as Branch[]);
      if (t.ok) setTypes((await t.json()).types || []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function logout() {
    await fetch('/api/tbc/logout', {method: 'POST'});
    router.replace('/tbc');
    router.refresh();
  }

  const filtered = branches.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (b.alias || '').toLowerCase().includes(s) ||
      (b.name || '').toLowerCase().includes(s) ||
      (b.city || '').toLowerCase().includes(s) ||
      (b.address || '').toLowerCase().includes(s)
    );
  });

  if (screen.kind === 'add') {
    return (
      <AddDeviceScreen
        branch={screen.branch}
        types={types}
        onBack={() => setScreen({kind: 'branch', branch: screen.branch})}
        onSaved={() => {
          refresh();
        }}
      />
    );
  }

  if (screen.kind === 'branch') {
    const b =
      branches.find((x) => x.id === screen.branch.id) || screen.branch;
    const deviceCount = Array.isArray(b.devices) ? b.devices.length : 0;
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <button
            onClick={() => setScreen({kind: 'list'})}
            className="rounded-lg bg-slate-100 px-3 py-2 text-base font-semibold text-slate-700"
          >
            ←
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-slate-900">
              {b.alias || '#' + b.id} · {b.name}
            </div>
            <div className="truncate text-[11px] text-slate-500">
              {b.city}
              {b.address ? `, ${b.address}` : ''}
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  დამატებული
                </div>
                <div className="font-mono text-3xl font-bold text-[#00AA8D]">
                  {deviceCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  დაგეგმილი
                </div>
                <div className="font-mono text-3xl font-bold text-slate-700">
                  {b.planned_count || 0}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen({kind: 'add', branch: b})}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0071CE] py-6 text-lg font-bold text-white shadow-lg active:scale-[0.98]"
          >
            ➕ ახალი მოწყობილობის დამატება
          </button>

          <Link
            href={`/tbc/app`}
            className="mt-3 block w-full rounded-2xl bg-white py-4 text-center text-sm font-medium text-slate-700 ring-1 ring-slate-200"
          >
            💻 სრული ინვენტარი (desktop)
          </Link>
        </div>
      </div>
    );
  }

  // list screen
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-slate-900">
            📱 {session.displayName || session.username}
          </div>
          <button
            onClick={logout}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
          >
            გასვლა
          </button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ძიება — ფილიალი, ქალაქი, alias…"
          className="mt-2 w-full rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30"
        />
      </header>

      <div className="flex-1 px-3 py-3">
        {loading ? (
          <div className="mt-10 text-center text-sm text-slate-400">
            იტვირთება…
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 text-center text-sm text-slate-400">
            {branches.length === 0
              ? 'არ გაქვს წვდომა არცერთ ფილიალზე'
              : 'ძიებით არაფერი იპოვა'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => {
              const color = STATUS_COLOR[b.status || 'general'] || '#64748B';
              const deviceCount = Array.isArray(b.devices)
                ? b.devices.length
                : 0;
              return (
                <button
                  key={b.id}
                  onClick={() => setScreen({kind: 'branch', branch: b})}
                  className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
                >
                  <div
                    className="h-10 w-1 rounded-full"
                    style={{background: color}}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#E6F2FB] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#0071CE]">
                        {b.alias || '#' + b.id}
                      </span>
                      <span className="truncate text-[13px] font-semibold text-slate-900">
                        {b.name}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500">
                      {b.city || '—'}
                      {b.address ? ` · ${b.address}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-base font-bold text-[#00AA8D]">
                      {deviceCount}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      /{b.planned_count || 0}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================
// Add-device screen (photo loop)
// ===========================================================

function AddDeviceScreen({
  branch,
  types,
  onBack,
  onSaved
}: {
  branch: Branch;
  types: EquipType[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [location, setLocation] = useState('');
  const [unplanned, setUnplanned] = useState(false);
  const [photos, setPhotos] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null
  ]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoSlot, setPhotoSlot] = useState<number | null>(null);

  const categories = Array.from(new Set(types.map((t) => t.category)));
  const subtypes = types
    .filter((t) => t.category === category)
    .map((t) => t.subtype);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  function pick(slot: number) {
    setPhotoSlot(slot);
    if (fileRef.current) {
      fileRef.current.value = '';
      fileRef.current.click();
    }
  }

  function removePhoto(slot: number) {
    setPhotos((p) => {
      const n = [...p];
      n[slot] = null;
      return n;
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || photoSlot === null) return;
    const slot = photoSlot;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let {width, height} = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setPhotos((p) => {
          const n = [...p];
          n[slot] = dataUrl;
          return n;
        });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function save(stayOnScreen: boolean) {
    if (saving) return;
    if (!category && !subtype && !serial && !brand && !model) {
      flash('შეავსე მინიმუმ ერთი ველი');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/tbc/branches/${branch.id}/devices`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          category,
          subtype,
          brand,
          model,
          serial,
          location,
          unplanned,
          photos
        })
      });
      if (r.status === 401) {
        window.location.href = '/tbc';
        return;
      }
      if (!r.ok) {
        flash('შეცდომა');
        return;
      }
      const d = await r.json();
      flash(`დამატებულია ✓ (${d.count})`);
      onSaved();
      if (stayOnScreen) {
        setCategory('');
        setSubtype('');
        setBrand('');
        setModel('');
        setSerial('');
        setLocation('');
        setUnplanned(false);
        setPhotos([null, null, null, null, null]);
      } else {
        setTimeout(onBack, 500);
      }
    } finally {
      setSaving(false);
    }
  }

  const filled = photos.filter(Boolean).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-100 px-3 py-2 text-base font-semibold text-slate-700"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-slate-500">
            {branch.alias || '#' + branch.id}
          </div>
          <div className="truncate text-[14px] font-bold text-slate-900">
            ახალი მოწყობილობა
          </div>
        </div>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      <div className="flex-1 space-y-4 px-4 py-4 pb-40">
        {/* Fields */}
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              კატეგორია
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubtype('');
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base"
            >
              <option value="">— აირჩიე —</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              ქვეტიპი
            </label>
            <select
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              disabled={!category}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base disabled:opacity-50"
            >
              <option value="">— აირჩიე —</option>
              {subtypes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                ბრენდი
              </label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Daikin…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                მოდელი
              </label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="FTXB25…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              S/N
            </label>
            <input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="ABC-12345"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              ადგილმდებარეობა
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="2 სართ., ოთახი 203"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm ring-1 ring-amber-200">
            <input
              type="checkbox"
              checked={unplanned}
              onChange={(e) => setUnplanned(e.target.checked)}
              className="h-5 w-5 accent-amber-600"
            />
            <span className="text-amber-800">
              დაუგეგმავი (არ არის გეგმაში)
            </span>
          </label>
        </div>

        {/* Photo grid — big buttons */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              ფოტოები
            </div>
            <div className="font-mono text-xs text-slate-500">{filled}/5</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4].map((slot) => {
              const photo = photos[slot];
              return (
                <div
                  key={slot}
                  className={`relative aspect-square overflow-hidden rounded-2xl ${
                    photo
                      ? 'ring-2 ring-[#00AA8D]'
                      : 'border-2 border-dashed border-slate-300 bg-slate-50'
                  }`}
                >
                  {photo ? (
                    <>
                      <img
                        src={photo}
                        alt={PHOTO_LABELS[slot]}
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => removePhoto(slot)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1.5 text-xs font-bold text-white shadow-lg"
                        aria-label="წაშლა"
                      >
                        ✕
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-center text-[10px] font-semibold text-white">
                        {PHOTO_LABELS[slot]}
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => pick(slot)}
                      className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center active:bg-slate-100"
                    >
                      <span className="text-4xl">📷</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {PHOTO_LABELS[slot]}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* last row — stretched 5th if needed; already fits 2 cols * 3 rows with slot 4 alone, keep as-is */}
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 border-t border-slate-200 bg-white/95 p-3 pb-5 backdrop-blur">
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00AA8D] py-4 text-base font-bold text-white shadow-lg disabled:opacity-60 active:scale-[0.98]"
        >
          {saving ? 'იგზავნება…' : '✅ შენახვა + შემდეგი'}
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          შენახვა და დახურვა
        </button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-36 z-30 flex justify-center">
          <div className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
