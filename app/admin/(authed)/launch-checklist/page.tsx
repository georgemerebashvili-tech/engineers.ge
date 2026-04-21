import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {
  checkEnv,
  getQuickCounts,
  probeAnthropic,
  probeMigrations,
  probeStorageBucket,
  probeSupabaseLatency
} from '@/lib/system-health';
import {
  CheckCircle2,
  XCircle,
  Circle,
  ExternalLink,
  Rocket,
  Database,
  Key,
  Globe,
  Mail,
  Cpu,
  HardDrive,
  Bug,
  Code2,
  type LucideIcon
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Launch checklist · Admin · engineers.ge'};

type ItemStatus = 'done' | 'pending' | 'unknown';

type Item = {
  label: string;
  status: ItemStatus;
  detail?: string;
  links?: {label: string; href: string; external?: boolean}[];
  howTo?: string;
};

type Group = {
  title: string;
  icon: LucideIcon;
  items: Item[];
};

export default async function LaunchChecklistPage() {
  const envs = checkEnv();
  const [migrations, bucketProbe, supabasePing, anthropicPing, counts] = await Promise.all([
    probeMigrations(),
    probeStorageBucket('public-assets'),
    probeSupabaseLatency(),
    probeAnthropic(),
    getQuickCounts()
  ]);

  const envMap = new Map(envs.map((e) => [e.key, e]));
  const envStatus = (key: string): ItemStatus =>
    envMap.get(key)?.set ? 'done' : 'pending';

  const pendingMigrations = migrations.filter(
    (m) => m.tableExists === false || m.missingColumns.length > 0
  );
  const unknownMigrations = migrations.filter((m) => m.tableExists === null);

  const groups: Group[] = [
    {
      title: 'Database (Supabase)',
      icon: Database,
      items: [
        {
          label: 'Supabase project provisioned',
          status: supabasePing.ok ? 'done' : 'pending',
          detail: supabasePing.detail,
          links: [
            {label: 'Supabase Dashboard', href: 'https://supabase.com/dashboard/projects', external: true}
          ],
          howTo: 'Supabase Dashboard → New Project. Region: მიუახლოვდი საქართველოს (Frankfurt/Stockholm). Password: გრძელი + უნიკალური → 1Password-ში.'
        },
        {
          label: `Migrations applied (${migrations.length - pendingMigrations.length - unknownMigrations.length}/${migrations.length})`,
          status:
            unknownMigrations.length > 0
              ? 'unknown'
              : pendingMigrations.length === 0
              ? 'done'
              : 'pending',
          detail:
            unknownMigrations.length > 0
              ? `${unknownMigrations.length} probe ver შემოწმდა (Supabase env აკლია)`
              : pendingMigrations.length === 0
              ? 'up-to-date'
              : `${pendingMigrations.length} pending: ${pendingMigrations.map((m) => m.file).join(', ')}`,
          links: [{label: '/admin/health', href: '/admin/health'}],
          howTo: 'Local: `DATABASE_URL=<supabase-uri> npm run db:migrate`. Supabase-ს URI-ი Settings → Database → Connection string-ში. შემდეგ განაახლე ეს გვერდი. ან — Dashboard → SQL Editor → ჩააკოპირე ფაილი → Run (ხელით, fallback).'
        },
        {
          label: 'Storage bucket: public-assets',
          status: bucketProbe.ok ? 'done' : 'pending',
          detail: bucketProbe.detail,
          howTo: 'პირველი ბანერის upload-ზე ავტომატურად იქმნება, ან Supabase → Storage → New bucket: `public-assets` (public, ≤5MB/file).'
        }
      ]
    },
    {
      title: 'Environment variables',
      icon: Key,
      items: [
        {
          label: 'AUTH_SECRET (admin JWT signing)',
          status: envStatus('AUTH_SECRET'),
          howTo: 'Terminal: `openssl rand -base64 32`. შემდეგ Vercel → Settings → Env Variables → Production.'
        },
        {
          label: 'ADMIN_USER + ADMIN_PASS_HASH',
          status:
            envStatus('ADMIN_USER') === 'done' && envStatus('ADMIN_PASS_HASH') === 'done'
              ? 'done'
              : 'pending',
          howTo: 'ADMIN_PASS_HASH-ის გენერაცია: `node -e "require(\'bcryptjs\').hash(\'YOUR_PASS\',10).then(console.log)"`. Vercel env-ში შეინახე.'
        },
        {
          label: 'ADMIN_RECOVERY_EMAIL',
          status: envStatus('ADMIN_RECOVERY_EMAIL'),
          detail:
            'ერთადერთი მისამართი რომელიც `/admin/forgot`-ის ბმულებს იღებს. საჭიროებს RESEND_API_KEY-ს და VERCEL_TOKEN/VERCEL_PROJECT_ID-ს.',
          howTo:
            'Vercel → Env Variables → Production: `ADMIN_RECOVERY_EMAIL=your@email.com`.'
        },
        {
          label: 'VERCEL_TOKEN + VERCEL_PROJECT_ID (+optional TEAM_ID, DEPLOY_HOOK_URL)',
          status:
            envStatus('VERCEL_TOKEN') === 'done' &&
            envStatus('VERCEL_PROJECT_ID') === 'done'
              ? 'done'
              : 'pending',
          detail:
            'საჭიროა admin პაროლის შეცვლისთვის (`/admin/password`) და აღდგენისთვის (`/admin/reset`) — rotate-ს Vercel env API-ზე.',
          howTo:
            'Token: https://vercel.com/account/tokens (scope: Full Account). Project ID: Vercel → Settings → General. Optional DEPLOY_HOOK_URL triggers auto-redeploy after rotation.'
        },
        {
          label: 'NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY',
          status:
            envStatus('NEXT_PUBLIC_SUPABASE_URL') === 'done' &&
            envStatus('SUPABASE_SERVICE_ROLE_KEY') === 'done'
              ? 'done'
              : 'pending',
          howTo: 'Supabase → Settings → API → ჩამოაკოპირე Project URL და service_role key.'
        },
        {
          label: 'RESEND_API_KEY + MAIL_FROM + ADMIN_EMAIL',
          status:
            envStatus('RESEND_API_KEY') === 'done' &&
            envStatus('ADMIN_EMAIL') === 'done'
              ? 'done'
              : 'pending',
          detail: 'საჭიროა email verification + bug notifications + welcome email-ისთვის.',
          links: [
            {label: 'Resend Dashboard', href: 'https://resend.com/api-keys', external: true}
          ],
          howTo: 'Resend-ზე დარეგისტრირდი, domain verify (`engineers.ge` + DKIM DNS). Production API key → Vercel env.'
        },
        {
          label: 'ANTHROPIC_API_KEY',
          status: anthropicPing.ok ? 'done' : envStatus('ANTHROPIC_API_KEY'),
          detail: anthropicPing.detail,
          links: [
            {label: 'Anthropic Console', href: 'https://console.anthropic.com/', external: true}
          ],
          howTo: 'Claude API key AI wall-detection + translation-ისთვის. Alternatively, admin panel → AI settings-ში.'
        },
        {
          label: 'NEXT_PUBLIC_SITE_URL',
          status: envStatus('NEXT_PUBLIC_SITE_URL'),
          detail: 'Canonical URL (sitemap, email links): `https://engineers.ge`',
          howTo: 'Vercel env-ში → Production: `https://engineers.ge`, Preview: Vercel-ის auto-URL.'
        },
        {
          label: 'CRON_SECRET',
          status: envStatus('CRON_SECRET'),
          detail: 'ავტომატური job-ების auth (users trash purge).',
          howTo: '`openssl rand -base64 32` → Vercel env (Production + Preview).'
        }
      ]
    },
    {
      title: 'Deployment',
      icon: Rocket,
      items: [
        {
          label: 'Vercel project linked',
          status: envStatus('VERCEL_PROJECT_ID'),
          detail: 'საჭიროა admin password-change UI-სთვის (self-service env update).',
          howTo: 'Vercel CLI: `npx vercel link`. Project ID დაკოპირდება `.vercel/project.json`-ში.'
        },
        {
          label: 'Deploy hook (one-click redeploy)',
          status: envStatus('VERCEL_DEPLOY_HOOK_URL'),
          howTo: 'Vercel → Settings → Git → Deploy Hooks → Create. URL-ი → ამავე env-ში.'
        },
        {
          label: 'Custom domain (engineers.ge)',
          status: 'unknown',
          detail: 'ავტომატურად ვერ შემოწმდება — გადაამოწმე Vercel-ში.',
          links: [{label: 'Vercel Domains', href: 'https://vercel.com/dashboard/domains', external: true}],
          howTo: 'Vercel → Domains → Add `engineers.ge` + `www`. DNS: A record → `76.76.21.21` (Vercel IP) ან CNAME → `cname.vercel-dns.com`.'
        }
      ]
    },
    {
      title: 'Health & monitoring',
      icon: Cpu,
      items: [
        {
          label: 'Launch readiness scorecard',
          status: supabasePing.ok && pendingMigrations.length === 0 && bucketProbe.ok ? 'done' : 'pending',
          links: [{label: '/admin/health', href: '/admin/health'}]
        },
        {
          label: 'Bug reports monitoring',
          status: 'done',
          detail: `${counts.bug_reports_open} open reports`,
          links: [{label: '/admin/bug-reports', href: '/admin/bug-reports'}]
        },
        {
          label: 'Audit log',
          status: 'done',
          links: [{label: '/admin/audit-log', href: '/admin/audit-log'}]
        },
        {
          label: 'Feature flags',
          status: 'done',
          detail: `${counts.features_test} test · ${counts.features_hidden} hidden`,
          links: [{label: '/admin/features', href: '/admin/features'}]
        }
      ]
    },
    {
      title: 'CI / quality gates',
      icon: Code2,
      items: [
        {
          label: 'GitHub Actions CI',
          status: 'done',
          detail: 'typecheck + lint (advisory) + build + smoke.',
          links: [{label: '.github/workflows/ci.yml', href: 'https://github.com/georgemerebashvili-tech/engineers.ge/actions', external: true}]
        },
        {
          label: 'Local launch-check',
          status: 'done',
          detail: '`npm run launch-check` → typecheck + lint + smoke.'
        },
        {
          label: 'Smoke suite (25 checks)',
          status: 'done',
          detail: '`npm run smoke` — CI-ready exit code.'
        }
      ]
    }
  ];

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
  const doneItems = groups.reduce(
    (acc, g) => acc + g.items.filter((i) => i.status === 'done').length,
    0
  );
  const pendingItems = groups.reduce(
    (acc, g) => acc + g.items.filter((i) => i.status === 'pending').length,
    0
  );

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მთავარი'}, {label: 'Launch checklist'}]}
        title="Launch checklist"
        description="ერთიანი სია იმისა, რაც საჭიროა საიტის ოფიციალური გაშვებისთვის. ავტომატური checks + manual steps კონტექსტური ინსტრუქციებით."
      />
      <AdminSection>
        <section
          className={`mb-6 rounded-card border-2 p-5 ${
            pendingItems === 0
              ? 'border-emerald-300 bg-emerald-50'
              : doneItems >= totalItems * 0.75
              ? 'border-amber-300 bg-amber-50'
              : 'border-red-300 bg-red-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Rocket
                  size={20}
                  className={
                    pendingItems === 0
                      ? 'text-emerald-600'
                      : doneItems >= totalItems * 0.75
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }
                />
                <h2 className="text-[17px] font-bold text-navy">
                  {pendingItems === 0
                    ? '🚀 Launch-ი მზადაა'
                    : `${pendingItems} ელემენტი დარჩა`}
                </h2>
              </div>
              <p className="mt-1 text-[12px] text-text-2">
                {doneItems}/{totalItems} ბიჯი შესრულდა
              </p>
            </div>
            <div className="rounded-full border-2 border-current bg-white/60 px-3 py-1 font-mono text-[16px] font-bold">
              {doneItems}/{totalItems}
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/60">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{width: `${Math.round((doneItems / totalItems) * 100)}%`}}
            />
          </div>
        </section>

        <div className="space-y-6">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <section key={group.title} className="rounded-card border border-bdr bg-sur overflow-hidden">
                <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                  <Icon size={14} className="text-blue" />
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                    {group.title}
                    <span className="ml-2 font-sans text-text-3">
                      ·{' '}
                      {group.items.filter((i) => i.status === 'done').length}/
                      {group.items.length}
                    </span>
                  </h2>
                </header>
                <ul className="divide-y divide-bdr">
                  {group.items.map((item, i) => (
                    <ChecklistItem key={i} item={item} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </AdminSection>
    </>
  );
}

function ChecklistItem({item}: {item: Item}) {
  const icon =
    item.status === 'done' ? (
      <CheckCircle2 size={18} className="text-emerald-600" />
    ) : item.status === 'pending' ? (
      <Circle size={18} className="text-text-3" />
    ) : (
      <XCircle size={18} className="text-amber-500" />
    );

  return (
    <li className={`flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start md:justify-between ${item.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-[13px] ${
              item.status === 'done' ? 'text-text-2 line-through' : 'font-semibold text-navy'
            }`}
          >
            {item.label}
          </p>
          {item.detail && (
            <p className="mt-0.5 font-mono text-[10px] text-text-3">{item.detail}</p>
          )}
          {item.howTo && item.status !== 'done' && (
            <p className="mt-1.5 text-[11px] text-text-2 leading-relaxed">
              <strong className="text-text-3">როგორ:</strong> {item.howTo}
            </p>
          )}
          {item.links && item.links.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {item.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[10px] text-blue hover:bg-blue-lt"
                >
                  {link.label}
                  {link.external && <ExternalLink size={10} />}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
