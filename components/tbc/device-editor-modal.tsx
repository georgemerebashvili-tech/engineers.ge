'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

export type TodoItem = {text: string; done: boolean};
export type SituationalPhoto = {src: string; caption: string};
export type CommentItem = {text: string; at: string; by?: string};

export type DevicePayload = {
  name: string;
  category: string;
  subtype: string;
  brand: string;
  model: string;
  serial: string;
  location: string;
  photos: (string | null)[];
  situational_photos: SituationalPhoto[];
  needs: TodoItem[];
  prohibitions: TodoItem[];
  comments: CommentItem[];
  ai_missing: string[];
};

export type DeviceInitial = Partial<DevicePayload> & {
  unplanned?: boolean;
};

const PHOTO_LABELS = ['ბირკა', 'ახლო', 'მსხვ.', 'გარე', 'დამატ.'];
const EMPTY_PHOTOS: (string | null)[] = [null, null, null, null, null];
const SITU_RECOMMENDED = 10;
const SITU_MAX = 50;

type TabKey = 'photos' | 'situational' | 'needs' | 'prohibitions' | 'comments';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: DevicePayload) => Promise<void> | void;
  saving?: boolean;
  currentUser?: string;
  mode?: 'new' | 'edit';
  initial?: DeviceInitial | null;
  title?: string;
};

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

export function DeviceEditorModal({
  open,
  onClose,
  onSave,
  saving,
  currentUser,
  mode = 'new',
  initial,
  title
}: Props) {
  const [tab, setTab] = useState<TabKey>('photos');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>(EMPTY_PHOTOS);
  const [situational, setSituational] = useState<SituationalPhoto[]>([]);
  const [needs, setNeeds] = useState<TodoItem[]>([]);
  const [prohibitions, setProhibitions] = useState<TodoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [aiStatus, setAiStatus] = useState<
    'idle' | 'loading' | 'ok' | 'fail'
  >('idle');
  const [aiMissing, setAiMissing] = useState<string[]>([]);
  const [aiMessage, setAiMessage] = useState<string>('');

  const devicePhotoInput = useRef<HTMLInputElement>(null);
  const situPhotoInput = useRef<HTMLInputElement>(null);
  const pendingDeviceSlot = useRef<number | null>(null);
  const [needInput, setNeedInput] = useState('');
  const [prohibitInput, setProhibitInput] = useState('');
  const [commentInput, setCommentInput] = useState('');

  const reset = useCallback(() => {
    const i = initial;
    setTab('photos');
    setName(i?.name ?? '');
    setCategory(i?.category ?? '');
    setSubtype(i?.subtype ?? '');
    setBrand(i?.brand ?? '');
    setModel(i?.model ?? '');
    setSerial(i?.serial ?? '');
    setLocation(i?.location ?? '');
    if (i?.photos && i.photos.length) {
      const next: (string | null)[] = [null, null, null, null, null];
      for (let k = 0; k < 5; k++) next[k] = i.photos[k] ?? null;
      setPhotos(next);
    } else {
      setPhotos(EMPTY_PHOTOS);
    }
    setSituational(i?.situational_photos ?? []);
    setNeeds(i?.needs ?? []);
    setProhibitions(i?.prohibitions ?? []);
    setComments(i?.comments ?? []);
    setAiStatus('idle');
    setAiMissing(i?.ai_missing ?? []);
    setAiMessage('');
    setNeedInput('');
    setProhibitInput('');
    setCommentInput('');
  }, [initial]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  if (!open) return null;

  const filledPhotos = photos.filter(Boolean) as string[];
  const photoCount = filledPhotos.length;

  function pickDevicePhoto(slot: number) {
    pendingDeviceSlot.current = slot;
    if (devicePhotoInput.current) {
      devicePhotoInput.current.value = '';
      devicePhotoInput.current.click();
    }
  }

  async function onDeviceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slot = pendingDeviceSlot.current;
    if (!file || slot === null) return;
    try {
      const dataUrl = await fileToDataUrl(file, 1024, 0.82);
      setPhotos((p) => {
        const n = [...p];
        n[slot] = dataUrl;
        return n;
      });
    } catch (err) {
      console.error('device photo read failed', err);
    }
  }

  function removeDevicePhoto(slot: number) {
    setPhotos((p) => {
      const n = [...p];
      n[slot] = null;
      return n;
    });
  }

  function pickSituPhoto() {
    if (situational.length >= SITU_MAX) return;
    if (situPhotoInput.current) {
      situPhotoInput.current.value = '';
      situPhotoInput.current.click();
    }
  }

  async function onSituFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = SITU_MAX - situational.length;
    const toProcess = files.slice(0, remaining);
    const added: SituationalPhoto[] = [];
    for (const f of toProcess) {
      try {
        const src = await fileToDataUrl(f, 900, 0.75);
        added.push({src, caption: ''});
      } catch (err) {
        console.error('situ photo failed', err);
      }
    }
    if (added.length) setSituational((s) => [...s, ...added]);
  }

  function updateSituCaption(idx: number, caption: string) {
    setSituational((s) =>
      s.map((it, i) => (i === idx ? {...it, caption} : it))
    );
  }

  function removeSitu(idx: number) {
    setSituational((s) => s.filter((_, i) => i !== idx));
  }

  async function runAiScan() {
    if (filledPhotos.length === 0) return;
    setAiStatus('loading');
    setAiMessage('');
    try {
      const r = await fetch('/api/tbc/vision/analyze-device', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({photos: filledPhotos})
      });
      if (!r.ok) {
        setAiStatus('fail');
        setAiMessage('ვერ ამოიცნო დანადგარი');
        return;
      }
      const body = await r.json();
      const res = body.result || {};
      const missing: string[] = Array.isArray(res.missing) ? res.missing : [];
      setAiMissing(missing);
      if (!name && (res.category || res.brand)) {
        const composed = [res.brand, res.model || res.subtype]
          .filter(Boolean)
          .join(' ')
          .trim();
        setName(composed || res.category || '');
      }
      if (res.category) setCategory((v) => v || res.category);
      if (res.subtype) setSubtype((v) => v || res.subtype);
      if (res.brand) setBrand((v) => v || res.brand);
      if (res.model) setModel((v) => v || res.model);
      if (res.serial) setSerial((v) => v || res.serial);
      setAiStatus('ok');
      setAiMessage(
        missing.length
          ? `ამოცნობილია ნაწილობრივ · ვერ წაიკითხა: ${missing.join(', ')}`
          : 'ამოცნობილია დანადგარი, მადლობა'
      );
    } catch (e) {
      console.error('ai scan failed', e);
      setAiStatus('fail');
      setAiMessage('შეცდომა — ცადე თავიდან');
    }
  }

  function addNeed() {
    const t = needInput.trim();
    if (!t) return;
    setNeeds((n) => [...n, {text: t, done: false}]);
    setNeedInput('');
  }

  function toggleNeed(idx: number) {
    setNeeds((n) =>
      n.map((it, i) => (i === idx ? {...it, done: !it.done} : it))
    );
  }

  function removeNeed(idx: number) {
    setNeeds((n) => n.filter((_, i) => i !== idx));
  }

  function addProhibit() {
    const t = prohibitInput.trim();
    if (!t) return;
    setProhibitions((n) => [...n, {text: t, done: false}]);
    setProhibitInput('');
  }

  function toggleProhibit(idx: number) {
    setProhibitions((n) =>
      n.map((it, i) => (i === idx ? {...it, done: !it.done} : it))
    );
  }

  function removeProhibit(idx: number) {
    setProhibitions((n) => n.filter((_, i) => i !== idx));
  }

  function addComment() {
    const t = commentInput.trim();
    if (!t) return;
    setComments((c) => [
      ...c,
      {text: t, at: new Date().toISOString(), by: currentUser}
    ]);
    setCommentInput('');
  }

  function handleSave() {
    const payload: DevicePayload = {
      name: name.trim(),
      category: category.trim(),
      subtype: subtype.trim(),
      brand: brand.trim(),
      model: model.trim(),
      serial: serial.trim(),
      location: location.trim(),
      photos,
      situational_photos: situational,
      needs,
      prohibitions,
      comments,
      ai_missing: aiMissing
    };
    void onSave(payload);
  }

  const tabs: {key: TabKey; label: string; icon: string; badge?: number}[] = [
    {key: 'photos', label: 'დანადგარი', icon: '📷', badge: photoCount || undefined},
    {
      key: 'situational',
      label: 'სიტუაც.',
      icon: '🏞',
      badge: situational.length || undefined
    },
    {
      key: 'needs',
      label: 'საჭიროება',
      icon: '📋',
      badge: needs.length || undefined
    },
    {
      key: 'prohibitions',
      label: 'აკრძალვა',
      icon: '🚫',
      badge: prohibitions.length || undefined
    },
    {
      key: 'comments',
      label: 'კომენტ.',
      icon: '💬',
      badge: comments.length || undefined
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[540px] flex-col bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {title ?? (mode === 'edit' ? 'რედაქტირება' : 'ახალი დანადგარი')}
            </div>
            <div className="truncate text-sm font-bold text-slate-900">
              {name || '(დაასახელე ან დასკანირე)'}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="ml-2 min-h-11 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 active:scale-95 disabled:opacity-40"
          >
            ✕ დახურვა
          </button>
        </div>

        {/* Tabs */}
        <div className="grid shrink-0 grid-cols-5 border-b border-slate-200 bg-white">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-[11px] font-semibold transition active:bg-slate-50 ${
                  active
                    ? 'border-b-2 border-[#0071CE] text-[#0071CE]'
                    : 'border-b-2 border-transparent text-slate-500'
                }`}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="truncate">{t.label}</span>
                {t.badge !== undefined && (
                  <span
                    className={`absolute right-0.5 top-0.5 rounded-full px-1.5 py-0 text-[10px] font-bold ${
                      active
                        ? 'bg-[#0071CE] text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'photos' && (
            <div className="space-y-3 p-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    📷 დანადგარის ფოტოები
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {photoCount}/5
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
                              onClick={() => removeDevicePhoto(slot)}
                              className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow-lg ring-2 ring-white active:scale-90"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => pickDevicePhoto(slot)}
                            className="flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center active:bg-slate-100"
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
              </div>

              <button
                onClick={runAiScan}
                disabled={photoCount === 0 || aiStatus === 'loading'}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0071CE] px-4 py-3.5 text-base font-bold text-white shadow disabled:opacity-40 active:scale-95"
              >
                {aiStatus === 'loading'
                  ? '⏳ სკანირება…'
                  : aiStatus === 'ok'
                  ? '✅ თავიდან სკანირება'
                  : '🔍 AI სკანირება'}
              </button>

              {aiMessage && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    aiStatus === 'ok'
                      ? 'bg-emerald-50 text-emerald-700'
                      : aiStatus === 'fail'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {aiMessage}
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    სახელი
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="მაგ: ბოილერი 1, კონდიციონერი ოფისში…"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 focus:border-[#0071CE] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="ბრენდი"
                    className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  />
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="მოდელი"
                    className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  />
                  <input
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    placeholder="S/N"
                    className="col-span-2 h-12 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm"
                  />
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="კატეგორია (BOILER, SPLIT…)"
                    className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  />
                  <input
                    value={subtype}
                    onChange={(e) => setSubtype(e.target.value)}
                    placeholder="ქვეტიპი"
                    className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="ადგილმდებარეობა"
                    className="col-span-2 h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'situational' && (
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  🏞 სიტუაციური ფოტოები
                </span>
                <span
                  className={`font-mono text-xs ${
                    situational.length < SITU_RECOMMENDED
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {situational.length}/{SITU_MAX}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-slate-500">
                რეკომენდებულია მინიმუმ {SITU_RECOMMENDED} ფოტო — გარედან,
                შიგნიდან, მილები, კვების კავშირი, შლანგები და ა.შ. თითოეულს
                მიაწერე რა არის ნაჩვენები.
              </p>

              <button
                onClick={pickSituPhoto}
                disabled={situational.length >= SITU_MAX}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00AA8D] px-4 py-3.5 text-base font-bold text-white shadow disabled:opacity-40 active:scale-95"
              >
                📷 დამატება
              </button>

              {situational.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  ჯერ არცერთი სიტუაციური ფოტო არაა
                </div>
              ) : (
                <div className="space-y-2">
                  {situational.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200"
                    >
                      <img
                        src={s.src}
                        alt=""
                        className="h-24 w-24 shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <input
                          value={s.caption}
                          onChange={(e) =>
                            updateSituCaption(idx, e.target.value)
                          }
                          placeholder="რა არის ნაჩვენები?"
                          className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
                        />
                        <button
                          onClick={() => removeSitu(idx)}
                          className="min-h-10 self-start rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 active:scale-95"
                        >
                          🗑 წაშლა
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'needs' && (
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  📋 საჭიროებები
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {needs.filter((n) => n.done).length}/{needs.length}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  value={needInput}
                  onChange={(e) => setNeedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNeed()}
                  placeholder="მაგ: საჭიროა ვენტილაცია"
                  className="h-12 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-[#0071CE] focus:outline-none"
                />
                <button
                  onClick={addNeed}
                  className="h-12 min-w-14 rounded-lg bg-[#0071CE] px-4 text-xl font-bold text-white shadow active:scale-95"
                >
                  +
                </button>
              </div>
              {needs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  ცარიელია — დაამატე საჭიროება
                </div>
              ) : (
                <div className="space-y-1.5">
                  {needs.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex min-h-14 items-center gap-2 rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200"
                    >
                      <button
                        onClick={() => toggleNeed(idx)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 text-lg font-bold active:scale-90 ${
                          it.done
                            ? 'border-[#00AA8D] bg-[#00AA8D] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {it.done ? '✓' : ''}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          it.done
                            ? 'text-slate-400 line-through'
                            : 'text-slate-800'
                        }`}
                      >
                        {it.text}
                      </span>
                      <button
                        onClick={() => removeNeed(idx)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base text-slate-400 active:bg-red-50 active:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'prohibitions' && (
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                  🚫 აკრძალვები
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {prohibitions.filter((n) => n.done).length}/
                  {prohibitions.length}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  value={prohibitInput}
                  onChange={(e) => setProhibitInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addProhibit()}
                  placeholder="მაგ: არ ჩართო გაზი ვენტამდე"
                  className="h-12 flex-1 rounded-lg border border-red-200 bg-white px-3 text-sm focus:border-red-500 focus:outline-none"
                />
                <button
                  onClick={addProhibit}
                  className="h-12 min-w-14 rounded-lg bg-red-600 px-4 text-xl font-bold text-white shadow active:scale-95"
                >
                  +
                </button>
              </div>
              {prohibitions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  ცარიელია — დაამატე აკრძალვა
                </div>
              ) : (
                <div className="space-y-1.5">
                  {prohibitions.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex min-h-14 items-center gap-2 rounded-lg bg-red-50/50 p-2 shadow-sm ring-1 ring-red-200"
                    >
                      <button
                        onClick={() => toggleProhibit(idx)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 text-lg font-bold active:scale-90 ${
                          it.done
                            ? 'border-slate-400 bg-slate-400 text-white'
                            : 'border-red-400 bg-white'
                        }`}
                      >
                        {it.done ? '✓' : ''}
                      </button>
                      <span
                        className={`flex-1 text-sm font-semibold ${
                          it.done
                            ? 'text-slate-400 line-through'
                            : 'text-red-900'
                        }`}
                      >
                        {it.text}
                      </span>
                      <button
                        onClick={() => removeProhibit(idx)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base text-slate-400 active:bg-red-100 active:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div className="flex h-full flex-col">
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    კომენტარები არაა — დაწერე პირველი
                  </div>
                ) : (
                  comments.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071CE]">
                          {c.by || currentUser || 'თქვენ'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.at).toLocaleTimeString('ka-GE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-slate-800">
                        {c.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="shrink-0 border-t border-slate-200 bg-white p-2">
                <div className="flex gap-2">
                  <input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                    placeholder="დაწერე კომენტარი…"
                    className="h-12 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
                  />
                  <button
                    onClick={addComment}
                    disabled={!commentInput.trim()}
                    className="h-12 min-w-14 rounded-lg bg-[#0071CE] px-4 text-lg font-bold text-white shadow active:scale-95 disabled:opacity-40"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom save bar */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00AA8D] py-4 text-base font-black text-white shadow-lg ring-2 ring-[#008A73]/30 disabled:opacity-40 active:scale-95"
          >
            {saving
              ? '⏳ ინახება…'
              : mode === 'edit'
              ? '💾 შენახვა'
              : '➕ დამატება'}
          </button>
        </div>

        <input
          ref={devicePhotoInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onDeviceFile}
        />
        <input
          ref={situPhotoInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onSituFiles}
        />
      </div>
    </div>
  );
}
