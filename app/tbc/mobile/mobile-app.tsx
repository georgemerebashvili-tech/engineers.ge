'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {TbcSession} from '@/lib/tbc/auth';

type Device = {
  category?: string;
  subtype?: string;
  brand?: string;
  model?: string;
  serial?: string;
  location?: string;
  photos?: (string | null)[];
  unplanned?: boolean;
  added_at?: string;
  ai_missing?: string[];
};
type Branch = {
  id: number;
  alias: string | null;
  name: string;
  city: string | null;
  region: string | null;
  planned_count: number;
  devices: Device[] | null;
};

const PHOTO_LABELS = ['ბირკა', 'ახლო', 'მსხვ.', 'გარე', 'დამატ.'];

export function MobileApp({session}: {session: TbcSession}) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null
  ]);
  const [adding, setAdding] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formFields, setFormFields] = useState<{
    category: string;
    subtype: string;
    brand: string;
    model: string;
    serial: string;
    location: string;
  }>({
    category: '',
    subtype: '',
    brand: '',
    model: '',
    serial: '',
    location: ''
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<number | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/tbc/branches');
      if (r.status === 401) {
        router.replace('/tbc');
        return;
      }
      if (r.ok) {
        const list = ((await r.json()).branches || []) as Branch[];
        setBranches(list);
        // Restore last selected branch
        try {
          const saved = Number(localStorage.getItem('tbc_mobile_branch') || '0');
          if (saved && list.find((b) => b.id === saved)) setBranchId(saved);
          else if (list.length === 1) setBranchId(list[0].id);
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (branchId) {
      try {
        localStorage.setItem('tbc_mobile_branch', String(branchId));
      } catch {}
    }
  }, [branchId]);

  const selectedBranch = branches.find((b) => b.id === branchId) || null;
  const devices = selectedBranch?.devices || [];

  async function logout() {
    await fetch('/api/tbc/logout', {method: 'POST'});
    router.replace('/tbc');
    router.refresh();
  }

  function pickPhoto(slot: number) {
    pendingSlot.current = slot;
    if (fileRef.current) {
      fileRef.current.value = '';
      fileRef.current.click();
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || pendingSlot.current === null) return;
    const slot = pendingSlot.current;
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

  function removePhoto(slot: number) {
    setPhotos((p) => {
      const n = [...p];
      n[slot] = null;
      return n;
    });
  }

  async function addDevice(withAi: boolean) {
    if (!branchId) {
      flash('ჯერ აირჩიე ფილიალი');
      return;
    }
    const filled = photos.filter(Boolean) as string[];
    if (filled.length === 0 && !showForm) {
      flash('ჯერ გადაიღე ფოტო ან ჩართე ფორმა');
      return;
    }
    setAdding(true);
    try {
      let aiFields = {...formFields};
      let aiMissing: string[] = [];
      if (withAi && filled.length > 0) {
        try {
          const r = await fetch('/api/tbc/vision/analyze-device', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({photos: filled})
          });
          if (r.ok) {
            const body = await r.json();
            const res = body.result || {};
            aiFields = {
              category: formFields.category || res.category || '',
              subtype: formFields.subtype || res.subtype || '',
              brand: formFields.brand || res.brand || '',
              model: formFields.model || res.model || '',
              serial: formFields.serial || res.serial || '',
              location: formFields.location || ''
            };
            aiMissing = res.missing || [];
          }
        } catch (e) {
          console.error('AI pre-fill failed', e);
        }
      }

      const save = await fetch(`/api/tbc/branches/${branchId}/devices`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          ...aiFields,
          photos
        })
      });
      if (save.status === 401) {
        router.replace('/tbc');
        return;
      }
      if (!save.ok) {
        flash('ვერ შეინახა');
        return;
      }
      const body = await save.json();
      const count = body.count || 0;
      flash(`✅ დამატებულია ${aiMissing.length ? `(ვერ ამოიცნო ${aiMissing.length})` : ''} · ${count}`);
      setPhotos([null, null, null, null, null]);
      setFormFields({
        category: '',
        subtype: '',
        brand: '',
        model: '',
        serial: '',
        location: ''
      });
      setShowForm(false);
      loadBranches();
    } finally {
      setAdding(false);
    }
  }

  async function doDeleteLast() {
    if (!branchId) return;
    setConfirmOpen(false);
    const r = await fetch(`/api/tbc/branches/${branchId}/devices/last`, {
      method: 'DELETE'
    });
    if (r.ok) {
      flash('🗑 ბოლო წაიშალა');
      loadBranches();
    } else {
      flash('ვერ წაიშალა');
    }
  }

  const filledPhotos = photos.filter(Boolean).length;

  return (
    <div className="mx-auto flex h-screen max-w-[540px] flex-col bg-slate-50">
      {/* Header — minimal, fixed */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <img src="/tbc/logos/tbc.svg" alt="TBC" className="h-6 w-auto" />
          <span className="text-slate-300">×</span>
          <img src="/tbc/logos/dmt.png" alt="DMT" className="h-5 w-auto" />
        </div>
        <button
          onClick={logout}
          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
        >
          გასვლა
        </button>
      </header>

      {/* Branch picker — fixed */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          🏢 ფილიალი
        </label>
        <select
          value={branchId ?? ''}
          onChange={(e) => setBranchId(Number(e.target.value) || null)}
          disabled={loading}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold text-slate-900 focus:border-[#0071CE] focus:bg-white focus:outline-none"
        >
          <option value="">
            {loading ? 'იტვირთება…' : '— აირჩიე ფილიალი —'}
          </option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.alias ? `${b.alias} · ` : ''}
              {b.name.slice(0, 60)} — {b.city || ''}
            </option>
          ))}
        </select>
      </div>

      {/* Action row 50/50 — fixed */}
      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button
          onClick={() => addDevice(true)}
          disabled={!branchId || adding || filledPhotos === 0}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#00AA8D] py-4 text-lg font-black text-white shadow-lg ring-2 ring-[#008A73]/30 disabled:opacity-40 active:scale-95"
        >
          {adding ? '⏳' : '➕'} <span>დამატება</span>
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!branchId || devices.length === 0}
          className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-lg font-black text-white shadow-lg ring-2 ring-red-800/30 disabled:opacity-40 active:scale-95"
        >
          🗑 <span>წაშლა</span>
        </button>
      </div>

      {/* Photos — fixed */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            📷 ფოტოები (მიმდინარე დანადგარი)
          </span>
          <span className="font-mono text-xs text-slate-500">
            {filledPhotos}/5
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 1, 2, 3, 4].map((slot) => {
            const p = photos[slot];
            return (
              <div key={slot} className="relative aspect-square">
                {p ? (
                  <>
                    <img
                      src={p}
                      alt={PHOTO_LABELS[slot]}
                      className="h-full w-full rounded-xl object-cover ring-2 ring-[#00AA8D]"
                    />
                    <button
                      onClick={() => removePhoto(slot)}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow ring-2 ring-white"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => pickPhoto(slot)}
                    disabled={!branchId}
                    className="flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center active:bg-slate-100 disabled:opacity-40"
                  >
                    <span className="text-2xl">📷</span>
                    <span className="mt-0.5 text-[9px] font-semibold text-slate-500">
                      {PHOTO_LABELS[slot]}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-600"
        >
          {showForm ? '✕ ფორმის დახურვა' : '✎ ხელით შევსება'}
        </button>
        {showForm && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <input
              value={formFields.brand}
              onChange={(e) =>
                setFormFields({...formFields, brand: e.target.value})
              }
              placeholder="ბრენდი"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
            />
            <input
              value={formFields.model}
              onChange={(e) =>
                setFormFields({...formFields, model: e.target.value})
              }
              placeholder="მოდელი"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
            />
            <input
              value={formFields.serial}
              onChange={(e) =>
                setFormFields({...formFields, serial: e.target.value})
              }
              placeholder="S/N"
              className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 font-mono text-sm"
            />
            <input
              value={formFields.location}
              onChange={(e) =>
                setFormFields({...formFields, location: e.target.value})
              }
              placeholder="ადგილმდებარეობა"
              className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Device list — scrollable */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            📦 დამატებული ({devices.length}/{selectedBranch?.planned_count || 0})
          </span>
          {adding && (
            <span className="text-xs text-[#0071CE]">იგზავნება…</span>
          )}
        </div>
        {!branchId ? (
          <div className="mt-10 text-center text-sm text-slate-400">
            ჯერ აირჩიე ფილიალი ზემოდან
          </div>
        ) : devices.length === 0 ? (
          <div className="mt-10 text-center text-sm text-slate-400">
            ცარიელია — დაამატე პირველი დანადგარი
          </div>
        ) : (
          <div className="space-y-1.5 pb-6">
            {devices
              .slice()
              .reverse()
              .map((d, revIdx) => {
                const idx = devices.length - 1 - revIdx;
                const isLast = idx === devices.length - 1;
                const thumb = (d.photos || []).find(Boolean);
                const label = [d.brand, d.model, d.serial]
                  .filter(Boolean)
                  .join(' · ');
                const secondary = [d.category, d.subtype]
                  .filter(Boolean)
                  .join(' / ');
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ${
                      isLast ? 'ring-[#00AA8D]/40' : 'ring-slate-200'
                    }`}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                        📦
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-slate-900">
                        #{idx + 1} ·{' '}
                        {label || (
                          <span className="text-slate-400">(ცარიელი)</span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-slate-500">
                        {secondary || '—'}
                      </div>
                      {d.ai_missing && d.ai_missing.length > 0 && (
                        <div className="mt-0.5 text-[10px] font-semibold text-amber-600">
                          ⚠️ ვერ იკითხა: {d.ai_missing.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 font-mono text-[9px] text-slate-400">
                      {(d.photos || []).filter(Boolean).length}📷
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:items-center"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-2 text-center text-4xl">🗑</div>
            <h2 className="mb-2 text-center text-base font-bold text-slate-900">
              წავშალო ბოლო დანადგარი?
            </h2>
            <p className="mb-4 text-center text-xs text-slate-500">
              ეს ქმედება შეუქცევადია.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700"
              >
                გაუქმება
              </button>
              <button
                onClick={doDeleteLast}
                className="rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow"
              >
                🗑 წაშლა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
