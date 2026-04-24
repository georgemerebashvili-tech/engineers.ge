'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {TbcSession} from '@/lib/tbc/auth';
import {
  DeviceEditorModal,
  photoThumbSrc,
  type DevicePayload,
  type DeviceInitial,
  type PhotoValue
} from '@/components/tbc/device-editor-modal';
import {WhatsNewButton} from '@/components/tbc/whats-new';

type PhotoMeta = {by?: string; at?: string} | null;
type Device = {
  name?: string;
  category?: string;
  subtype?: string;
  brand?: string;
  model?: string;
  serial?: string;
  location?: string;
  photos?: (PhotoValue | null)[];
  photo_meta?: PhotoMeta[];
  situational_photos?: {src: PhotoValue; caption: string}[];
  needs?: {text: string; done: boolean}[];
  prohibitions?: {text: string; done: boolean}[];
  comments?: {text: string; at: string; by?: string}[];
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
  const [editing, setEditing] = useState<{
    deviceIdx: number;
    initial: DeviceInitial;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/tbc/branches?lite=1');
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

  const loadDevices = useCallback(
    async (id: number) => {
      setDevicesLoading(true);
      try {
        const r = await fetch(`/api/tbc/branches/${id}/devices?mode=active`);
        if (r.status === 401) {
          router.replace('/tbc');
          return;
        }
        if (r.ok) {
          const body = (await r.json()) as {devices?: Device[]};
          setDevices(body.devices || []);
        } else {
          setDevices([]);
        }
      } catch {
        setDevices([]);
      } finally {
        setDevicesLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (branchId) {
      try {
        localStorage.setItem('tbc_mobile_branch', String(branchId));
      } catch {}
      loadDevices(branchId);
    } else {
      setDevices([]);
    }
  }, [branchId, loadDevices]);

  const selectedBranch = branches.find((b) => b.id === branchId) || null;

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
      const isEdit = editing !== null;
      const url = isEdit
        ? `/api/tbc/branches/${branchId}/devices/${editing!.deviceIdx}`
        : `/api/tbc/branches/${branchId}/devices`;
      const save = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
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
      if (isEdit) {
        flash('✅ განახლდა');
      } else {
        const body = await save.json();
        const count = body.count || 0;
        flash(
          `✅ დამატებულია${
            payload.ai_missing.length
              ? ` (ვერ ამოიცნო ${payload.ai_missing.length})`
              : ''
          } · ${count}`
        );
      }
      setEditorOpen(false);
      setEditing(null);
      if (branchId) loadDevices(branchId);
    } finally {
      setSaving(false);
    }
  }

  function openEditor(deviceIdx: number, d: Device) {
    const srcPhotos = Array.isArray(d.photos) ? d.photos : [];
    const photos: (PhotoValue | null)[] = [null, null, null, null, null];
    for (let i = 0; i < 5; i++) photos[i] = srcPhotos[i] ?? null;
    setEditing({
      deviceIdx,
      initial: {
        name: d.name ?? '',
        category: d.category ?? '',
        subtype: d.subtype ?? '',
        brand: d.brand ?? '',
        model: d.model ?? '',
        serial: d.serial ?? '',
        location: d.location ?? '',
        photos,
        situational_photos: d.situational_photos ?? [],
        needs: d.needs ?? [],
        prohibitions: d.prohibitions ?? [],
        comments: d.comments ?? [],
        ai_missing: d.ai_missing ?? [],
        unplanned: d.unplanned
      }
    });
    setEditorOpen(true);
  }

  async function doDeleteLast() {
    if (!branchId) return;
    setConfirmOpen(false);
    const r = await fetch(`/api/tbc/branches/${branchId}/devices/last`, {
      method: 'DELETE'
    });
    if (r.ok) {
      flash('🗃 ბოლო არქივში გადავიდა');
      if (branchId) loadDevices(branchId);
    } else {
      flash('არქივში ვერ გადავიდა');
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
        <div className="flex items-center gap-2">
          <WhatsNewButton />
          <button
            onClick={logout}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            გასვლა
          </button>
        </div>
      </header>

      {/* Branch picker */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          🏢 ფილიალი
        </label>
        <button
          type="button"
          onClick={() => {
            if (loading) return;
            setPickerQuery('');
            setPickerOpen(true);
          }}
          disabled={loading}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-base font-semibold text-slate-900 active:bg-slate-100 disabled:opacity-60"
        >
          <span className="truncate">
            {loading
              ? 'იტვირთება…'
              : selectedBranch
                ? `${selectedBranch.alias ? `${selectedBranch.alias} · ` : ''}${cleanBranchLabel(selectedBranch.name).slice(0, 60)}`
                : '— აირჩიე ფილიალი —'}
          </span>
          <span className="shrink-0 text-slate-400">🔎</span>
        </button>
      </div>

      {/* Action row */}
      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
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
          🗃 <span>არქივი</span>
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
        ) : devicesLoading ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-sm text-slate-500">
            <span
              className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300 border-t-[#00AA8D]"
              aria-hidden
            />
            <span>იტვირთება დანადგარები…</span>
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
                const thumb = photoThumbSrc((d.photos || []).find(Boolean) || null);
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
                    onClick={() => openEditor(idx, d)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEditor(idx, d);
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
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
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
                        openEditor(idx, d);
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

      {/* Editor modal — add new OR edit existing */}
      <DeviceEditorModal
        open={editorOpen}
        onClose={() => {
          if (saving) return;
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        saving={saving}
        currentUser={session.displayName || session.username}
        mode={editing ? 'edit' : 'new'}
        initial={editing?.initial ?? null}
        title={
          editing
            ? `რედაქტირება · #${editing.deviceIdx + 1}`
            : 'ახალი დანადგარი'
        }
      />

      {/* Branch picker modal — search + select */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center"
          onClick={() => setPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
              <span className="text-sm font-bold text-slate-900">
                🏢 ფილიალის არჩევა
              </span>
              <button
                onClick={() => setPickerOpen(false)}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                დახურვა
              </button>
            </div>
            <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
              <input
                autoFocus
                type="search"
                inputMode="search"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="ძიება — ქალაქი, alias, სახელი…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-900 focus:border-[#0071CE] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const q = pickerQuery.trim().toLowerCase();
                const filtered = branches.filter((b) => {
                  if (!q) return true;
                  const hay = [
                    b.alias,
                    b.name,
                    cleanBranchLabel(b.name),
                    b.city,
                    b.region
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                  return hay.includes(q);
                });
                if (filtered.length === 0) {
                  return (
                    <div className="p-6 text-center text-sm text-slate-400">
                      ვერაფერი მოიძებნა
                    </div>
                  );
                }
                return (
                  <ul className="divide-y divide-slate-100">
                    {filtered.map((b) => {
                      const label = cleanBranchLabel(b.name).slice(0, 80);
                      const active = b.id === branchId;
                      return (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setBranchId(b.id);
                              setPickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-slate-100 ${
                              active ? 'bg-[#0071CE]/5' : 'bg-white'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-slate-900">
                                {b.alias ? `${b.alias} · ` : ''}
                                {label}
                              </div>
                              {(b.city || b.region) && (
                                <div className="truncate text-[11px] text-slate-500">
                                  {[b.city, b.region].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            {active && (
                              <span className="shrink-0 text-[#0071CE]">✓</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
              ბოლო დანადგარი არქივში გადავიტანო?
            </h2>
            <p className="mb-4 text-center text-xs text-slate-500">
              აქტიური სიიდან გაქრება, მაგრამ მონაცემი 30 დღე მაინც დარჩება არქივში.
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
                🗃 არქივი
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
