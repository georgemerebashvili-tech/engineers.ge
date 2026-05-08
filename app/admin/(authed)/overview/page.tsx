import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  Users,
  Activity,
  Bug,
  BarChart3,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {title: 'მიმოხილვა · Admin · engineers.ge'};

async function getOverviewStats() {
  try {
    const db = supabaseAdmin();
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [users, views30d, views7d, bugs] = await Promise.all([
      db.from('users').select('id', {count: 'exact', head: true}),
      db
        .from('page_views')
        .select('id', {count: 'exact', head: true})
        .gte('entered_at', since30d)
        .eq('bot', false),
      db
        .from('page_views')
        .select('id', {count: 'exact', head: true})
        .gte('entered_at', since7d)
        .eq('bot', false),
      db
        .from('bug_reports')
        .select('id', {count: 'exact', head: true})
        .eq('resolved', false)
    ]);

    return {
      totalUsers: users.count ?? 0,
      views30d: views30d.count ?? 0,
      views7d: views7d.count ?? 0,
      openBugs: bugs.count ?? 0
    };
  } catch {
    return null;
  }
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue'
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{size?: number; strokeWidth?: number; className?: string}>;
  color?: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colorMap = {
    blue: 'text-blue bg-blue-lt border-blue-bd',
    green: 'text-grn bg-grn-lt border-grn-bd',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red: 'text-red bg-red-lt border-red-200'
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-bdr bg-sur p-4 shadow-card">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${colorMap[color]}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-text-3">{label}</div>
        <div className="text-xl font-semibold text-text tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-text-3">{sub}</div>}
      </div>
    </div>
  );
}

export default async function OverviewPage() {
  const stats = await getOverviewStats();

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მიმოხილვა'}]}
        title="მიმოხილვა"
        description="საერთო სტატისტიკა — users, traffic, open issues."
      />
      <AdminSection>
        {stats === null ? (
          <div className="rounded-xl border border-red-200 bg-red-lt p-5 text-sm text-red">
            <p className="font-medium">Supabase-ს ვერ ვუკავშირდები.</p>
            <p className="mt-1 text-xs text-text-2">შეამოწმე env variables: SUPABASE_URL და SUPABASE_SERVICE_ROLE_KEY.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="სულ მომხმარებლები"
              value={stats.totalUsers.toLocaleString()}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Page views (30d)"
              value={stats.views30d.toLocaleString()}
              sub={`${stats.views7d.toLocaleString()} ბოლო 7 დღეში`}
              icon={BarChart3}
              color="green"
            />
            <StatCard
              label="ღია ხარვეზები"
              value={stats.openBugs}
              icon={Bug}
              color={stats.openBugs > 0 ? 'amber' : 'green'}
            />
            <StatCard
              label="სისტემა"
              value="OK"
              sub="ყველა სერვისი მუშაობს"
              icon={CheckCircle2}
              color="green"
            />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-bdr bg-sur p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-text-3">
              <Activity size={13} />
              სწრაფი ბმულები
            </div>
            <div className="space-y-1 text-[13px]">
              {[
                {label: '→ სტატისტიკა', href: '/admin/analytics'},
                {label: '→ მომხმარებლები', href: '/admin/users'},
                {label: '→ ხარვეზები', href: '/admin/bug-reports'},
                {label: '→ Audit log', href: '/admin/audit-log'},
                {label: '→ System health', href: '/admin/health'}
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-2 py-1.5 text-text-2 transition-colors hover:bg-sur-2 hover:text-blue"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-bdr bg-sur p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-text-3">
              <Clock size={13} />
              შემდეგი ნაბიჯები
            </div>
            <p className="text-[13px] text-text-2">
              გახსენი{' '}
              <a href="/admin/health" className="text-blue underline-offset-2 hover:underline">
                System health
              </a>{' '}
              launch checklist-ისთვის, ან{' '}
              <a href="/admin/analytics" className="text-blue underline-offset-2 hover:underline">
                Analytics
              </a>{' '}
              დეტალური traffic ანალიზისთვის.
            </p>
          </div>
        </div>
      </AdminSection>
    </>
  );
}
