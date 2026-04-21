'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {TbcSession} from '@/lib/tbc/auth';
import {
  DeviceEditorModal,
  type DevicePayload
} from '@/components/tbc/device-editor-modal';

type PhotoMeta = {by?: string; at?: string} | null;
type Device = {
  name?: string;
  category?: string;
  subtype?: string;
  brand?: string;
  model?: string;
  serial?: string;
  location?: string;
  photos?: (string | null)[];
  photo_meta?: PhotoMeta[];
  situational_photos?: {src: string; caption: string}[];
  needs?: {text: string; done: boolean}[];
  prohibitions?: {text: string; done: boolean}[];
  comments?: {text: string; at: string; by?: string}[];
  unplanned?: boolean;
  added_at?: string;
  ai_missing?: string[];
};

const PHOTO_LABELS = ['ბირკა', 'ახლო', 'მსხვ.', 'გარე', 'დამატ.'];
const EMPTY_PHOTOS: (string | null)[] = [null, null, null, null, null];
const EMPTY_META: PhotoMeta[] = [null, null, null, null, null];

async function fileToDataUrl(
  file: File,
  maxDim: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_error'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('image_error'));
      img.onload = () => {
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
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
type Branch = {
  id: number;
  alias: string | null;
  name: string;
  city: string | null;
  region: string | null;
  planned_count: number;
  devices: Device[] | null;
};

function cleanBranchLabel(name: string): string {
  return name
    .replace(/^თიბისი\s+ბანკის?\s+/i, '')
    .replace(/\s*&.*$/, '')
    .replace(/\s*—\s+[^—]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function MobileApp({session}: {session: TbcSession}) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{
    deviceIdx: number;
    photos: (string | null)[];
    photoMeta: PhotoMeta[];
  } | null>(null);

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

  async function handleSave(payload: DevicePayload) {
    if (!branchId) {
      flash('ჯერ აირჩიე ფილიალი');
      return;
    }
    setSaving(true);
    try {
      const save = await fetch(`/api/tbc/branches/${branchId}/devices`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(payload)
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
      flash(
        `✅ დამატებულია${
          payload.ai_missing.length
            ? ` (ვერ ამოიცნო ${payload.ai_missing.length})`
            : ''
        } · ${count}`
      );
      setEditorOpen(false);
      loadBranches();
    } finally {
      setSaving(false);
    }
  }

  function openViewer(deviceIdx: number, d: Device) {
    const srcPhotos = Array.isArray(d.photos) ? d.photos : [];
    const srcMeta = Array.isArray(d.photo_meta) ? d.photo_meta : [];
    const photos: (string | null)[] = [null, null, null, null, null];
    const photoMeta: PhotoMeta[] = [null, null, null, null, null];
    for (let i = 0; i < 5; i++) {
      photos[i] = srcPhotos[i] ?? null;
      photoMeta[i] = srcMeta[i] ?? null;
    }
    setViewer({deviceIdx, photos, photoMeta});
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

  return (
    <div className="mx-auto flex h-screen max-w-[540px] flex-col bg-slate-50">
      {/* Header */}
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

      {/* Branch picker */}
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
          {branches.map((b) => {
            const label = cleanBranchLabel(b.name).slice(0, 60);
            return (
              <option key={b.id} value={b.id}>
                {b.alias ? `${b.alias} · ` : ''}
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Action row */}
      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button
          onClick={() => setEditorOpen(true)}
          disabled={!branchId}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#00AA8D] py-4 text-lg font-black text-white shadow-lg ring-2 ring-[#008A73]/30 disabled:opacity-40 active:scale-95"
        >
          ➕ <span>დამატება</span>
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!branchId || devices.length === 0}
          className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-lg font-black text-white shadow-lg ring-2 ring-red-800/30 disabled:opacity-40 active:scale-95"
        >
          🗑 <span>წაშლა</span>
        </button>
      </div>

      {/* Device list */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            📦 დამატებული ({devices.length}/{selectedBranch?.planned_count || 0})
          </span>
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
                const title =
                  d.name ||
                  [d.brand, d.model, d.serial].filter(Boolean).join(' · ');
                const secondary = [d.category, d.subtype]
                  .filter(Boolean)
                  .join(' / ');
                const situCount = (d.situational_photos || []).length;
                const needsCount = (d.needs || []).length;
                const prohibCount = (d.prohibitions || []).length;
                const commentsCount = (d.comments || []).length;
                const hasTabs =
                  situCount + needsCount + prohibCount + commentsCount > 0;
                const photoCount = (d.photos || []).filter(Boolean).length;
                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => openViewer(idx, d)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openViewer(idx, d);
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl bg-white p-2 text-left shadow-sm ring-1 transition active:scale-[0.99] ${
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
                        {title || (
                          <span className="text-slate-400">(ცარიელი)</span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-slate-500">
                        {secondary || '—'}
                      </div>
                      {hasTabs && (
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[9px] font-mono">
                          {situCount > 0 && (
                            <span className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">
                              🏞 {situCount}
                            </span>
                          )}
                          {needsCount > 0 && (
                            <span className="rounded bg-blue-50 px-1 py-0.5 text-blue-700">
                              📋 {needsCount}
                            </span>
                          )}
                          {prohibCount > 0 && (
                            <span className="rounded bg-red-50 px-1 py-0.5 text-red-700">
                              🚫 {prohibCount}
                            </span>
                          )}
                          {commentsCount > 0 && (
                            <span className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">
                              💬 {commentsCount}
                            </span>
                          )}
                        </div>
                      )}
                      {d.ai_missing && d.ai_missing.length > 0 && (
                        <div className="mt-0.5 text-[10px] font-semibold text-amber-600">
                          ⚠️ ვერ იკითხა: {d.ai_missing.join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewer(idx, d);
                      }}
                      aria-label="ფოტოების დამატება"
                      className="relative flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#00AA8D] text-white shadow-md ring-2 ring-[#008A73]/30 active:scale-95"
                    >
                      <span className="text-2xl font-black leading-none">+</span>
                      <span className="mt-0.5 text-[9px] font-bold leading-none">
                        {photoCount}/5 📷
                      </span>
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}

      {/* Editor modal */}
      <DeviceEditorModal
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        onSave={handleSave}
        saving={saving}
        currentUser={session.displayName || session.username}
      />

      {/* Confirm delete modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center"
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

      {/* Photo viewer / editor */}
      {viewer && (
        <PhotoViewer
          branchId={branchId}
          deviceIdx={viewer.deviceIdx}
          initialPhotos={viewer.photos}
          initialMeta={viewer.photoMeta}
          currentUser={session.username}
          onClose={() => setViewer(null)}
          onSaved={() => {
            setViewer(null);
            flash('✅ განახლდა');
            loadBranches();
          }}
          onError={(m) => flash(m)}
        />
      )}
    </div>
  );
}

function PhotoViewer({
  branchId,
  deviceIdx,
  initialPhotos,
  initialMeta,
  currentUser,
  onClose,
  onSaved,
  onError
}: {
  branchId: number | null;
  deviceIdx: number;
  initialPhotos: (string | null)[];
  initialMeta: PhotoMeta[];
  currentUser: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [photos, setPhotos] = useState<(string | null)[]>(initialPhotos);
  const [meta, setMeta] = useState<PhotoMeta[]>(initialMeta);
  const [active, setActive] = useState<number>(() =>
    Math.max(
      0,
      initialPhotos.findIndex(Boolean) === -1
        ? 0
        : initialPhotos.findIndex(Boolean)
    )
  );
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<number | null>(null);

  function pickPhoto(slot: number) {
    pendingSlot.current = slot;
    if (fileInput.current) {
      fileInput.current.value = '';
      fileInput.current.click();
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slot = pendingSlot.current;
    if (!file || slot === null) return;
    try {
      const dataUrl = await fileToDataUrl(file, 1024, 0.82);
      setPhotos((p) => {
        const n = [...p];
        n[slot] = dataUrl;
        return n;
      });
      setMeta((m) => {
        const n = [...m];
        n[slot] = {by: currentUser, at: new Date().toISOString()};
        return n;
      });
      setDirty(true);
      setActive(slot);
    } catch {
      onError('ფოტო ვერ ჩაიტვირთა');
    } finally {
      pendingSlot.current = null;
    }
  }

  function deletePhoto(slot: number) {
    setPhotos((p) => {
      const n = [...p];
      n[slot] = null;
      return n;
    });
    setMeta((m) => {
      const n = [...m];
      n[slot] = null;
      return n;
    });
    setDirty(true);
  }

  async function save() {
    if (!branchId || busy) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/tbc/branches/${branchId}/devices/${deviceIdx}/photos`,
        {
          method: 'PATCH',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({photos, photo_meta: meta})
        }
      );
      if (!r.ok) {
        onError('ვერ შეინახა');
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const activePhoto = photos[active];
  const activeMeta = meta[active];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2 text-white">
        <button
          type="button"
          onClick={() => {
            if (dirty && !confirm('შეცვლილი ფოტოები დაიკარგება. დავხურო?'))
              return;
            onClose();
          }}
          className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold"
        >
          ← უკან
        </button>
        <div className="text-xs font-bold">
          დანადგარი #{deviceIdx + 1} · {PHOTO_LABELS[active]}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="rounded-md bg-[#00AA8D] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {busy ? '…' : '💾 შენახვა'}
        </button>
      </div>

      {/* Main photo */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-4">
        {activePhoto ? (
          <img
            src={activePhoto}
            alt={PHOTO_LABELS[active]}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        ) : (
          <button
            type="button"
            onClick={() => pickPhoto(active)}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/30 px-8 py-12 text-white/70"
          >
            <span className="text-5xl">📷</span>
            <span className="text-sm font-semibold">
              ფოტო არ არის — დააჭირე ასატვირთად
            </span>
          </button>
        )}
      </div>

      {/* Meta + per-slot actions */}
      <div className="shrink-0 space-y-2 border-t border-white/10 bg-slate-900/60 px-3 py-2 text-white">
        {activeMeta?.by && (
          <div className="text-center text-[10px] text-white/60">
            ატვირთა: {activeMeta.by}
            {activeMeta.at
              ? ` · ${new Date(activeMeta.at).toLocaleString('ka-GE')}`
              : ''}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => pickPhoto(active)}
            className="rounded-xl bg-[#0071CE] py-3 text-sm font-bold text-white active:scale-95"
          >
            📷 {activePhoto ? 'ახლით ჩანაცვლება' : 'ატვირთვა'}
          </button>
          <button
            type="button"
            onClick={() => deletePhoto(active)}
            disabled={!activePhoto}
            className="rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-40 active:scale-95"
          >
            🗑 წაშლა
          </button>
        </div>

        {/* Thumbnails row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setActive(i)}
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 ${
                i === active
                  ? 'border-[#00AA8D]'
                  : 'border-white/20 opacity-70'
              }`}
            >
              {p ? (
                <img src={p} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[9px] font-semibold text-white/50">
                  {PHOTO_LABELS[i]}
                </span>
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[8px] font-bold text-white">
                {PHOTO_LABELS[i]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
