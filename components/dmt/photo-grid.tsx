'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ArrowLeft,
  Bot,
  Camera,
  Check,
  LoaderCircle,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';
import {
  analyzeLeadPhoto,
  deleteLeadPhoto,
  getLeadPhoto,
  listLeadPhotos,
  patchLeadPhoto,
  uploadLeadPhoto,
  type DmtLeadInventoryPhoto
} from '@/lib/dmt/photos-store';
import {InventoryPicker, type InventoryCatalogItem} from '@/components/dmt/inventory-picker';

type PhotoGridProps = {
  leadId: string;
  mobile?: boolean;
};

function statusMeta(photo: DmtLeadInventoryPhoto) {
  if (photo.aiAnalyzed) return {label: 'AI done', icon: Check, className: 'border-grn-bd bg-grn-lt text-grn'};
  if (photo.aiError) return {label: 'AI error', icon: XCircle, className: 'border-red/30 bg-red-lt text-red'};
  return {label: 'Pending', icon: LoaderCircle, className: 'border-blue-bd bg-blue-lt text-blue'};
}

export function PhotoGrid({leadId, mobile = false}: PhotoGridProps) {
  const [photos, setPhotos] = useState<DmtLeadInventoryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await listLeadPhotos(leadId);
      setPhotos(data.photos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'photos load failed');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const hasPending = photos.some((photo) => !photo.aiAnalyzed && !photo.aiError);
  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, [hasPending, load]);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await uploadLeadPhoto(leadId, file);
      setPhotos((prev) => [data.photo, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const analyze = async (photoId: string) => {
    setAnalyzingId(photoId);
    setError('');
    try {
      const data = await analyzeLeadPhoto(leadId, photoId);
      setPhotos((prev) => prev.map((photo) => photo.id === photoId ? data.photo : photo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <div className={mobile ? 'grid gap-3' : 'flex flex-wrap items-center justify-between gap-3'}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`inline-flex items-center justify-center gap-2 rounded-md border border-blue bg-blue font-semibold text-white hover:bg-navy-2 disabled:opacity-60 ${
            mobile ? 'min-h-24 px-5 py-5 text-base' : 'px-3 py-2 text-[12px]'
          }`}
        >
          {uploading ? <LoaderCircle size={18} className="animate-spin" /> : <Camera size={18} />}
          {uploading ? 'Uploading...' : 'Upload photo'}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-md border border-red/30 bg-red-lt px-3 py-2 text-[12px] text-red">{error}</div>}
      {loading && (
        <div className="flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-3 py-4 text-[12px] text-text-3">
          <LoaderCircle size={14} className="animate-spin" /> Loading photos...
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div className="rounded-md border border-dashed border-bdr bg-sur-2 px-3 py-6 text-center text-[12px] text-text-3">
          No lead photos yet.
        </div>
      )}

      <div className={mobile ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2 md:grid-cols-3'}>
        {photos.map((photo) => {
          const meta = statusMeta(photo);
          const Icon = meta.icon;
          return (
            <div key={photo.id} className="overflow-hidden rounded-md border border-bdr bg-sur">
              <Link href={`/dmt/m/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photo.id)}`}>
                <div className={mobile ? 'aspect-square bg-sur-2' : 'aspect-[4/3] bg-sur-2'}>
                  <img
                    src={photo.thumbnailUrl ?? photo.photoUrl}
                    alt={`Lead inventory ${photo.id}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </Link>
              <div className="space-y-2 p-2">
                <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                  <Icon size={12} className={Icon === LoaderCircle ? 'animate-spin' : ''} />
                  {meta.label}
                </div>
                {photo.aiError && <div className="line-clamp-2 text-[10.5px] text-red">{photo.aiError}</div>}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void analyze(photo.id)}
                    disabled={analyzingId === photo.id}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 py-1.5 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:opacity-50"
                  >
                    {analyzingId === photo.id ? <LoaderCircle size={12} className="animate-spin" /> : <Bot size={12} />}
                    Analyze
                  </button>
                  <Link
                    href={`/dmt/m/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photo.id)}`}
                    className="inline-flex items-center justify-center rounded-md border border-bdr bg-sur-2 px-2 py-1.5 text-text-2 hover:border-blue hover:text-blue"
                    title="Open detail"
                  >
                    <Search size={12} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeadPhotoDetail({leadId, photoId}: {leadId: string; photoId: string}) {
  const router = useRouter();
  const [photo, setPhoto] = useState<DmtLeadInventoryPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [matchedInventoryId, setMatchedInventoryId] = useState<string | null>(null);
  const [matchedQty, setMatchedQty] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getLeadPhoto(leadId, photoId);
      setPhoto(data.photo);
      setNotes(data.photo.userNotes ?? '');
      setMatchedInventoryId(data.photo.matchedInventoryId);
      setMatchedQty(data.photo.matchedQty);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'photo load failed');
    } finally {
      setLoading(false);
    }
  }, [leadId, photoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await patchLeadPhoto(leadId, photoId, {userNotes: notes, matchedInventoryId, matchedQty});
      setPhoto(data.photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save failed');
    } finally {
      setSaving(false);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const data = await analyzeLeadPhoto(leadId, photoId);
      setPhoto(data.photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this photo from the lead?')) return;
    setSaving(true);
    try {
      await deleteLeadPhoto(leadId, photoId);
      router.push(`/dmt/m/leads/${encodeURIComponent(leadId)}/photos`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed');
      setSaving(false);
    }
  };

  const pickInventory = (item: InventoryCatalogItem) => {
    setMatchedInventoryId(item.id);
    setMatchedQty((prev) => prev ?? 1);
    setShowPicker(false);
  };

  const items = photo?.aiAnalysis?.items ?? [];

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-bdr bg-sur px-3 py-3">
        <Link
          href={`/dmt/m/leads/${encodeURIComponent(leadId)}/photos`}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-bdr bg-sur-2 px-3 text-[13px] font-semibold text-text-2"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-sm font-bold text-navy">{photoId}</div>
          <div className="text-[11px] text-text-3">{leadId}</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 p-3">
        {error && <div className="rounded-md border border-red/30 bg-red-lt px-3 py-2 text-[12px] text-red">{error}</div>}
        {loading && (
          <div className="flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-3 py-4 text-[12px] text-text-3">
            <LoaderCircle size={14} className="animate-spin" /> Loading photo...
          </div>
        )}
        {photo && (
          <>
            <div className="overflow-hidden rounded-md border border-bdr bg-sur">
              <img src={photo.photoUrl} alt={`Lead inventory ${photo.id}`} className="max-h-[72vh] w-full object-contain" />
            </div>

            <section className="rounded-md border border-bdr bg-sur p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-sm font-bold text-navy">
                  <Bot size={16} /> AI analysis
                </h2>
                <button
                  type="button"
                  onClick={analyze}
                  disabled={analyzing}
                  className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:opacity-60"
                >
                  {analyzing ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Analyze
                </button>
              </div>
              {photo.aiError && <div className="mb-2 rounded-md border border-red/30 bg-red-lt px-3 py-2 text-[12px] text-red">{photo.aiError}</div>}
              {items.length === 0 && !photo.aiError && (
                <div className="text-[12px] text-text-3">No AI items yet.</div>
              )}
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-md border border-bdr bg-sur-2 p-2">
                    <div className="text-[12px] font-semibold text-navy">{item.name ?? 'Item'}</div>
                    <div className="mt-1 text-[11px] text-text-2">
                      {item.category ?? 'other'} · qty {item.qty ?? 1} · {item.condition ?? 'unknown'}
                    </div>
                    {item.description && <div className="mt-1 text-[11px] text-text-3">{item.description}</div>}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-md border border-bdr bg-sur p-3">
              <h2 className="mb-3 text-sm font-bold text-navy">Inventory match</h2>
              <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
                <button
                  type="button"
                  onClick={() => setShowPicker((v) => !v)}
                  className="min-h-11 rounded-md border border-bdr bg-sur-2 px-3 text-left text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
                >
                  {matchedInventoryId ? `Selected: ${matchedInventoryId}` : 'Choose SKU...'}
                </button>
                <input
                  type="number"
                  value={matchedQty ?? ''}
                  onChange={(e) => setMatchedQty(e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="qty"
                  className="min-h-11 rounded-md border border-bdr bg-sur-2 px-3 text-right font-mono text-[12px]"
                />
              </div>
              {showPicker && <div className="mt-2"><InventoryPicker compact onPick={pickInventory} selectedId={matchedInventoryId} /></div>}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className="mt-3 min-h-24 w-full rounded-md border border-bdr bg-sur-2 p-3 text-[12px] focus:border-blue focus:outline-none"
              />
              <div className="mt-3 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={remove}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-red/30 bg-red-lt px-3 text-[12px] font-semibold text-red disabled:opacity-60"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-blue bg-blue px-3 text-[12px] font-semibold text-white disabled:opacity-60"
                >
                  {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export function MobileLeadPhotos({leadId}: {leadId: string}) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-bdr bg-sur px-3 py-3">
        <Link
          href="/dmt/leads/manual"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-bdr bg-sur-2 px-3 text-[13px] font-semibold text-text-2"
        >
          <ArrowLeft size={16} /> Leads
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-sm font-bold text-navy">{leadId} inventory</div>
          <div className="text-[11px] text-text-3">mobile photo capture</div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-3">
        <PhotoGrid leadId={leadId} mobile />
        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[11px] text-text-3">
          <Upload size={13} /> Take multiple photos one after another; each upload stays attached to this lead.
        </div>
      </main>
    </div>
  );
}
