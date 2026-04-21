import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type FeatureStatus = 'active' | 'test' | 'hidden';

export type FeatureDef = {
  key: string;
  label: string;
  section: string;
  /** Route(s) this feature guards. First route is primary. */
  routes?: string[];
  /** Short hint shown in admin panel. */
  description?: string;
  /** If true, feature cannot be hidden (core nav that would brick admin). */
  locked?: boolean;
};

export type FeatureFlag = {
  key: string;
  status: FeatureStatus;
  note: string | null;
  updated_at: string | null;
};

export type FeatureMap = Record<string, FeatureStatus>;

/**
 * Registry — single source of truth for every toggleable feature.
 * Keys match the sidebar item keys and /calc/* page slugs so UI can lookup.
 * Adding a feature here automatically makes it appear in /admin/features.
 */
export const FEATURE_REGISTRY: FeatureDef[] = [
  // --- Dashboard sidebar items ---
  {key: 'dash.projects', label: 'ჩემი პროექტები', section: 'Dashboard სიდბარი', description: 'მარცხენა მენიუ — unified hub, სადაც ერთი project (სპორტდარბაზი/სუპერმარკეტი) აერთიანებს ყველა კალკულაციას', routes: ['/dashboard/projects']},
  {key: 'dash.favorites', label: 'რჩეული ხელსაწყოები', section: 'Dashboard სიდბარი'},
  {key: 'dash.referrals', label: 'მოიწვიე · იშოვე 3000₾', section: 'Dashboard სიდბარი', routes: ['/dashboard/referrals']},
  {key: 'dash.promotions', label: 'აქციები', section: 'Dashboard სიდბარი', routes: ['/promotions']},
  {key: 'dash.ads', label: 'რეკლამა', section: 'Dashboard სიდბარი', routes: ['/ads']},

  // --- Calculators ---
  {key: 'calc.hvac', label: 'HVAC კალკულატორი', section: 'კალკულატორები', routes: ['/calc/hvac']},
  {key: 'calc.ahu-ashrae', label: 'AHU · ASHRAE რეპორტი', section: 'კალკულატორები', routes: ['/calc/ahu-ashrae']},
  {key: 'calc.stair-pressurization', label: 'სადარბაზოს დაწნეხვა', section: 'კალკულატორები', routes: ['/calc/stair-pressurization']},
  {key: 'calc.elevator-shaft-press', label: 'ლიფტის შახტის დაწნეხვა', section: 'კალკულატორები', routes: ['/calc/elevator-shaft-press']},
  {key: 'calc.parking-ventilation', label: 'პარკინგის ვენტილაცია', section: 'კალკულატორები', routes: ['/calc/parking-ventilation']},
  {key: 'calc.floor-pressurization', label: 'კორიდორის დაწნეხვა', section: 'კალკულატორები', routes: ['/calc/floor-pressurization']},
  {key: 'calc.wall-thermal', label: 'კედლის U-ფაქტორი', section: 'კალკულატორები', routes: ['/calc/wall-thermal']},
  {key: 'calc.heat-loss', label: 'EN 12831 Heat Load', section: 'კალკულატორები', routes: ['/calc/heat-loss']},
  {key: 'calc.silencer', label: 'ხმაურდამხშობი', section: 'კალკულატორები', routes: ['/calc/silencer']},
  {key: 'calc.silencer-kaya', label: 'ხმაურდამხშობის კატალოგი', section: 'კალკულატორები', routes: ['/calc/silencer-kaya']},
  {key: 'calc.wall-editor', label: 'გეგმის რედაქტორი', section: 'CAD', routes: ['/calc/wall-editor']},
  {key: 'calc.building-composer', label: 'შენობის აღმშენებლობა', section: 'CAD', routes: ['/calc/building-composer']},
  {key: 'calc.physics-docs', label: 'ფიზიკის ფორმულები', section: 'დოკუმენტაცია', routes: ['/calc/docs/physics']},

  // --- Admin sidebar items (non-core only — login/password/features themselves cannot be hidden) ---
  {key: 'admin.sitemap', label: 'Sitemap & deploy', section: 'Admin სიდბარი', routes: ['/admin/sitemap']},
  {key: 'admin.activity', label: 'Activity feed', section: 'Admin სიდბარი', routes: ['/admin/activity']},
  {key: 'admin.todos', label: 'TODO pipeline', section: 'Admin სიდბარი', routes: ['/admin/todos']},
  {key: 'admin.hero-ads', label: 'Hero Ads', section: 'Admin სიდბარი', routes: ['/admin/tiles']},
  {key: 'admin.regulations', label: 'სტანდარტები & წყაროები', section: 'Admin სიდბარი', routes: ['/admin/regulations']},
  {key: 'admin.banners', label: 'ბანერები', section: 'Admin სიდბარი', routes: ['/admin/banners']},
  {key: 'admin.redirects', label: 'URL redirects', section: 'Admin სიდბარი', routes: ['/admin/redirects']},
  {key: 'admin.users', label: 'რეგისტრაციები', section: 'Admin სიდბარი', routes: ['/admin/users']},
  {key: 'admin.referrals', label: 'Referrals', section: 'Admin სიდბარი', routes: ['/admin/referrals']},
  {key: 'admin.consent-log', label: 'Consent log', section: 'Admin სიდბარი', routes: ['/admin/consent-log']},
  {key: 'admin.stats', label: 'სტატისტიკა', section: 'Admin სიდბარი', routes: ['/admin/stats']},
  {key: 'admin.claude-sessions', label: 'Claude სესიები', section: 'Admin სიდბარი', routes: ['/admin/claude-sessions']},
  {key: 'admin.bug-reports', label: 'ხარვეზები', section: 'Admin სიდბარი', routes: ['/admin/bug-reports']},
  {key: 'admin.errors', label: 'Errors (frontend)', section: 'Admin სიდბარი', routes: ['/admin/errors']},
  {key: 'admin.404s', label: '404 tracking', section: 'Admin სიდბარი', routes: ['/admin/404s']},
  {key: 'admin.audit-log', label: 'Audit log', section: 'Admin სიდბარი', routes: ['/admin/audit-log']},
  {key: 'admin.launch-checklist', label: 'Launch checklist', section: 'Admin სიდბარი', routes: ['/admin/launch-checklist']},
  {key: 'admin.ai', label: 'AI (Claude)', section: 'Admin სიდბარი', routes: ['/admin/ai']},
  {key: 'admin.health', label: 'System health', section: 'Admin სიდბარი', routes: ['/admin/health']},
  {key: 'admin.rate-limits', label: 'Rate limits', section: 'Admin სიდბარი', routes: ['/admin/rate-limits']},
  {key: 'admin.csp-violations', label: 'CSP violations', section: 'Admin სიდბარი', routes: ['/admin/csp-violations']},
  {key: 'admin.web-vitals', label: 'Web Vitals', section: 'Admin სიდბარი', routes: ['/admin/web-vitals']},
  {key: 'admin.emails', label: 'Email preview', section: 'Admin სიდბარი', routes: ['/admin/emails']},
  {key: 'admin.backup', label: 'DB backup', section: 'Admin სიდბარი', routes: ['/admin/backup']},
  {key: 'admin.ads-preview', label: 'რეკლამის preview', section: 'Admin სიდბარი', routes: ['/ads']},

  // --- Admin + user notifications ---
  {
    key: 'notify.bug-reports',
    label: 'Email alert: ახალი bug report (admin)',
    section: 'Admin ნოტიფიკაციები',
    description: '🔴 დამალული = email-ი არ იგზავნება. ADMIN_EMAIL + RESEND_API_KEY env-ები საჭიროა.'
  },
  {
    key: 'notify.welcome-email',
    label: 'Welcome email (ახალი user)',
    section: 'Admin ნოტიფიკაციები',
    description: '🔴 დამალული = welcome-ი არ იგზავნება რეგისტრაციისას. RESEND_API_KEY env საჭიროა.'
  },
  {
    key: 'notify.regulations',
    label: 'Email alert: regulation source changed',
    section: 'Admin ნოტიფიკაციები',
    description: '🔴 დამალული = regulation watcher ცვლილებაზე email აღარ გავა. ADMIN_EMAIL + RESEND_API_KEY საჭიროა.'
  },

  // --- Top-level site pages ---
  {key: 'site.ads', label: 'საიტი · /ads (რეკლამის სიმულატორი)', section: 'საჯარო გვერდები', routes: ['/ads']},
  {key: 'site.donate', label: 'საიტი · დონაცია modal', section: 'საჯარო გვერდები'},
  {key: 'site.share', label: 'საიტი · Share bar', section: 'საჯარო გვერდები'},
  {key: 'site.referral-widget', label: 'საიტი · Referral floating widget', section: 'საჯარო გვერდები'},
  {
    key: 'site.web-vitals',
    label: 'Web Vitals tracking (LCP/CLS/INP…)',
    section: 'საჯარო გვერდები',
    description: 'Performance monitoring. მხოლოდ analytics-consent გაცემული user-ებისთვის. 🔴 დამალული = ტრეკინგი გაჩერდება.'
  },
  {
    key: 'site.cookie-consent',
    label: 'Cookie consent banner',
    section: 'საჯარო გვერდები',
    description: 'GDPR-style banner — essential/analytics/marketing. დამალვა შესაძლებელია ტესტირებისთვის, მაგრამ ოფიციალურ launch-ზე ყოველთვის active.'
  }
];

export function getFeatureDef(key: string): FeatureDef | undefined {
  return FEATURE_REGISTRY.find((f) => f.key === key);
}

/**
 * Fetch all flags from DB, merged with registry defaults (= 'active').
 * If DB is unreachable, returns all features as 'active' (fail-open for safety).
 */
export async function getFeatureFlags(): Promise<FeatureMap> {
  const base: FeatureMap = {};
  for (const def of FEATURE_REGISTRY) base[def.key] = 'active';

  try {
    const {data, error} = await supabaseAdmin()
      .from('feature_flags')
      .select('key,status');
    if (error) throw error;
    for (const row of (data ?? []) as {key: string; status: FeatureStatus}[]) {
      if (row.key in base) base[row.key] = row.status;
    }
  } catch {
    // DB offline — keep defaults (all active). Admin page will show warning.
  }
  return base;
}

export async function getFeatureFlagsDetailed(): Promise<FeatureFlag[]> {
  const base = new Map<string, FeatureFlag>();
  for (const def of FEATURE_REGISTRY) {
    base.set(def.key, {key: def.key, status: 'active', note: null, updated_at: null});
  }
  try {
    const {data, error} = await supabaseAdmin()
      .from('feature_flags')
      .select('key,status,note,updated_at');
    if (error) throw error;
    for (const row of (data ?? []) as FeatureFlag[]) {
      if (base.has(row.key)) base.set(row.key, row);
    }
  } catch {}
  return FEATURE_REGISTRY.map((def) => base.get(def.key)!);
}

export async function setFeatureFlag(
  key: string,
  status: FeatureStatus,
  updatedBy: string,
  note?: string
): Promise<FeatureFlag> {
  const def = getFeatureDef(key);
  if (!def) throw new Error(`Unknown feature key: ${key}`);
  if (def.locked && status !== 'active') {
    throw new Error(`Feature "${def.label}" is locked and cannot be disabled.`);
  }

  const {data, error} = await supabaseAdmin()
    .from('feature_flags')
    .upsert(
      {
        key,
        status,
        note: note ?? null,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      },
      {onConflict: 'key'}
    )
    .select('key,status,note,updated_at')
    .single();
  if (error) throw error;
  return data as FeatureFlag;
}

/** Convenience: is this feature visible to end users? */
export function isVisible(status: FeatureStatus): boolean {
  return status !== 'hidden';
}

/** Convenience: is this feature in test mode (show banner)? */
export function isTestMode(status: FeatureStatus): boolean {
  return status === 'test';
}

/** Lookup feature key by route — used to gate pages server-side. */
export function featureKeyForRoute(pathname: string): string | null {
  const match = FEATURE_REGISTRY.find((f) =>
    f.routes?.some((r) => r === pathname || pathname.startsWith(r + '/'))
  );
  return match?.key ?? null;
}

export function isValidStatus(value: unknown): value is FeatureStatus {
  return value === 'active' || value === 'test' || value === 'hidden';
}
