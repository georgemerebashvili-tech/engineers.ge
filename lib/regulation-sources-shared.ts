export type RegulationSourceStatus = 'active' | 'paused' | 'error';

export type RegulationSource = {
  id: number;
  key: string;
  title: string;
  url: string;
  source_group: string;
  selector: string | null;
  status: RegulationSourceStatus;
  last_hash: string | null;
  last_checked_at: string | null;
  last_changed_at: string | null;
  last_error: string | null;
  latest_excerpt: string | null;
  published_hash: string | null;
  published_excerpt: string | null;
  published_snapshot_id: number | null;
  published_at: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RegulationSourceSnapshot = {
  id: number;
  source_id: number;
  content_hash: string;
  excerpt: string | null;
  changed: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  published?: boolean;
  published_at?: string | null;
  review_note?: string | null;
  fetched_at: string;
};

export type RegulationMonitorSummary = {
  total: number;
  active: number;
  paused: number;
  error: number;
  stale: number;
  changedRecently: number;
};

export type RegulationDashboardData = {
  summary: RegulationMonitorSummary;
  sources: RegulationSource[];
  snapshotsBySource: Record<number, RegulationSourceSnapshot[]>;
  usingFallback: boolean;
  databaseReady: boolean;
};

const STALE_HOURS = 72;

function parseIso(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function isSourceStale(source: RegulationSource): boolean {
  const checkedAt = parseIso(source.last_checked_at);
  if (!checkedAt) return true;
  return Date.now() - checkedAt > STALE_HOURS * 60 * 60 * 1000;
}

export function formatRelative(iso: string): string {
  const time = parseIso(iso);
  if (!time) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds} წმ წინ`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} წთ წინ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} სთ წინ`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} დღე წინ`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} თვე წინ`;
  return `${Math.floor(months / 12)} წელი წინ`;
}
