import 'server-only';

import {createHash} from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  isSourceStale,
  type RegulationDashboardData,
  type RegulationMonitorSummary,
  type RegulationSource,
  type RegulationSourceSnapshot
} from '@/lib/regulation-sources-shared';

type SeedSource = Pick<
  RegulationSource,
  'key' | 'title' | 'url' | 'source_group' | 'selector' | 'notes'
>;

const RECENT_CHANGE_HOURS = 24 * 14;

const DEFAULT_REGULATION_SOURCES: SeedSource[] = [
  {
    key: 'ge-fire-regulation',
    title: 'სახანძრო უსაფრთხოების ტექნიკური რეგლამენტი',
    url: 'https://matsne.gov.ge/',
    source_group: 'Georgia',
    selector: null,
    notes: 'matsne fallback seed — შემდეგ ეტაპზე ზუსტი document URL ჩაიწერება.'
  },
  {
    key: 'ge-building-regulation',
    title: 'სამშენებლო უსაფრთხოების ტექნიკური რეგლამენტი',
    url: 'https://matsne.gov.ge/',
    source_group: 'Georgia',
    selector: null,
    notes: 'matsne fallback seed — შემდეგ ეტაპზე ზუსტი document URL ჩაიწერება.'
  },
  {
    key: 'en-12101-6',
    title: 'EN 12101-6 reference page',
    url: 'https://www.en-standard.eu/bs-en-12101-6-2022',
    source_group: 'Fire safety',
    selector: null,
    notes: 'Smoke control / pressurization reference'
  },
  {
    key: 'nfpa-92',
    title: 'NFPA 92 standard page',
    url: 'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=92',
    source_group: 'Fire safety',
    selector: null,
    notes: 'Smoke control reference'
  },
  {
    key: 'ashrae-62-1',
    title: 'ASHRAE 62.1 / 62.2 standards',
    url: 'https://www.ashrae.org/technical-resources/bookstore/standards-62-1-62-2',
    source_group: 'HVAC',
    selector: null,
    notes: 'Ventilation / IAQ reference'
  }
];

function fallbackSource(seed: SeedSource, index: number): RegulationSource {
  return {
    id: -(index + 1),
    key: seed.key,
    title: seed.title,
    url: seed.url,
    source_group: seed.source_group,
    selector: seed.selector,
    status: 'active',
    last_hash: null,
    last_checked_at: null,
    last_changed_at: null,
    last_error: null,
    latest_excerpt: null,
    notes: seed.notes
  };
}

function getFallbackSources(): RegulationSource[] {
  return DEFAULT_REGULATION_SOURCES.map(fallbackSource);
}

function parseIso(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function changedRecently(source: RegulationSource): boolean {
  const changedAt = parseIso(source.last_changed_at);
  if (!changedAt) return false;
  return Date.now() - changedAt <= RECENT_CHANGE_HOURS * 60 * 60 * 1000;
}

function summarizeSources(sources: RegulationSource[]): RegulationMonitorSummary {
  return {
    total: sources.length,
    active: sources.filter((source) => source.status === 'active').length,
    paused: sources.filter((source) => source.status === 'paused').length,
    error: sources.filter((source) => source.status === 'error').length,
    stale: sources.filter(isSourceStale).length,
    changedRecently: sources.filter(changedRecently).length
  };
}

export async function getRegulationDashboardData(): Promise<RegulationDashboardData> {
  let sources: RegulationSource[] = [];
  let usingFallback = false;
  let databaseReady = true;

  try {
    const {data, error} = await supabaseAdmin()
      .from('regulation_sources')
      .select('*')
      .order('source_group')
      .order('title');
    if (error) throw error;
    sources = (data ?? []) as RegulationSource[];
    if (sources.length === 0) {
      usingFallback = true;
      sources = getFallbackSources();
    }
  } catch {
    databaseReady = false;
    usingFallback = true;
    sources = getFallbackSources();
  }

  let snapshotsBySource: Record<number, RegulationSourceSnapshot[]> = {};
  if (databaseReady) {
    try {
      const {data, error} = await supabaseAdmin()
        .from('regulation_source_snapshots')
        .select(
          'id,source_id,content_hash,excerpt,changed,approved_at,approved_by,published,published_at,review_note,fetched_at'
        )
        .order('fetched_at', {ascending: false})
        .limit(200);
      if (error) throw error;
      snapshotsBySource = groupRecentSnapshots(
        (data ?? []) as RegulationSourceSnapshot[]
      );
    } catch {
      snapshotsBySource = {};
    }
  }

  return {
    summary: summarizeSources(sources),
    sources,
    snapshotsBySource,
    usingFallback,
    databaseReady
  };
}

function groupRecentSnapshots(
  snapshots: RegulationSourceSnapshot[]
): Record<number, RegulationSourceSnapshot[]> {
  const out: Record<number, RegulationSourceSnapshot[]> = {};
  for (const snapshot of snapshots) {
    if (!out[snapshot.source_id]) out[snapshot.source_id] = [];
    if (out[snapshot.source_id].length < 4) out[snapshot.source_id].push(snapshot);
  }
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function excerptOf(text: string): string {
  if (!text) return '';
  return text.slice(0, 320);
}

async function fetchSourceText(source: RegulationSource): Promise<string> {
  const response = await fetch(source.url, {
    headers: {
      'user-agent': 'engineers.ge regulation monitor/1.0 (+https://engineers.ge/admin/regulations)'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const raw = await response.text();
  // Selector is stored for future refinement; current MVP hashes normalized page text.
  return stripHtml(raw).slice(0, 50_000);
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export type RegulationRunResult = {
  checked: number;
  changed: number;
  failed: number;
  unchanged: number;
  changedSources: Array<{
    key: string;
    title: string;
    url: string;
    source_group: string;
    excerpt: string;
  }>;
};

export async function runRegulationChecks(limit = 12): Promise<RegulationRunResult> {
  const admin = supabaseAdmin();
  const {data, error} = await admin
    .from('regulation_sources')
    .select('*')
    .neq('status', 'paused')
    .order('id')
    .limit(limit);

  if (error) throw error;

  const sources = (data ?? []) as RegulationSource[];
  const now = new Date().toISOString();
  let checked = 0;
  let changed = 0;
  let failed = 0;
  let unchanged = 0;
  const changedSources: RegulationRunResult['changedSources'] = [];

  for (const source of sources) {
    try {
      const contentText = await fetchSourceText(source);
      const contentHash = hashText(contentText);
      const excerpt = excerptOf(contentText);
      const didChange = !source.last_hash || source.last_hash !== contentHash;

      const {error: updateError} = await admin
        .from('regulation_sources')
        .update({
          last_hash: contentHash,
          last_checked_at: now,
          last_changed_at: didChange ? now : source.last_changed_at,
          latest_excerpt: excerpt,
          last_error: null,
          status: 'active'
        })
        .eq('id', source.id);
      if (updateError) throw updateError;

      if (didChange) {
        const {error: insertError} = await admin
          .from('regulation_source_snapshots')
          .insert({
            source_id: source.id,
            content_hash: contentHash,
            content_text: contentText,
            excerpt,
            changed: true
          });
        if (insertError && !/duplicate/i.test(insertError.message)) {
          throw insertError;
        }
        changed += 1;
        changedSources.push({
          key: source.key,
          title: source.title,
          url: source.url,
          source_group: source.source_group,
          excerpt
        });
      } else {
        unchanged += 1;
      }

      checked += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message.slice(0, 500) : 'fetch failed';
      await admin
        .from('regulation_sources')
        .update({
          last_checked_at: now,
          last_error: message,
          status: 'error'
        })
        .eq('id', source.id);
    }
  }

  return {checked, changed, failed, unchanged, changedSources};
}
