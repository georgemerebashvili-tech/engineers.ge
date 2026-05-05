export type AiInventoryItem = {
  name?: string;
  category?: string;
  qty?: number;
  condition?: string;
  description?: string;
  suggested_sku_keywords?: string[];
};

export type LeadPhotoAnalysis = {
  items?: AiInventoryItem[];
  scene_description?: string;
  confidence?: number;
  raw?: string;
};

export type DmtLeadInventoryPhoto = {
  id: string;
  leadId: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  aiAnalyzed: boolean;
  aiAnalysis: LeadPhotoAnalysis | null;
  aiModel: string | null;
  aiAnalyzedAt: string | null;
  aiError: string | null;
  matchedInventoryId: string | null;
  matchedQty: number | null;
  userNotes: string;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type PhotoPatch = {
  matchedInventoryId?: string | null;
  matchedQty?: number | null;
  userNotes?: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData
      ? init.headers
      : {'content-type': 'application/json', ...(init?.headers ?? {})}
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((data as {error?: unknown}).error ?? `HTTP ${res.status}`));
  return data as T;
}

export function listLeadPhotos(leadId: string) {
  return fetchJson<{photos: DmtLeadInventoryPhoto[]}>(`/api/dmt/leads/${encodeURIComponent(leadId)}/photos`);
}

export function getLeadPhoto(leadId: string, photoId: string) {
  return fetchJson<{photo: DmtLeadInventoryPhoto}>(
    `/api/dmt/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photoId)}`
  );
}

export function uploadLeadPhoto(leadId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return fetchJson<{photo: DmtLeadInventoryPhoto}>(`/api/dmt/leads/${encodeURIComponent(leadId)}/photos`, {
    method: 'POST',
    body: form
  });
}

export function patchLeadPhoto(leadId: string, photoId: string, patch: PhotoPatch) {
  return fetchJson<{photo: DmtLeadInventoryPhoto}>(
    `/api/dmt/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photoId)}`,
    {method: 'PATCH', body: JSON.stringify(patch)}
  );
}

export function deleteLeadPhoto(leadId: string, photoId: string) {
  return fetchJson<{ok: true}>(`/api/dmt/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photoId)}`, {
    method: 'DELETE'
  });
}

export function analyzeLeadPhoto(leadId: string, photoId: string, model?: 'haiku' | 'sonnet') {
  const suffix = model ? `?model=${encodeURIComponent(model)}` : '';
  return fetchJson<{photo: DmtLeadInventoryPhoto}>(
    `/api/dmt/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photoId)}/analyze${suffix}`,
    {method: 'POST'}
  );
}
