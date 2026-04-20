import Link from 'next/link';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {listTopReferrers, listUsers} from '@/lib/users';
import {AlertTriangle, CheckCircle2, Users} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Referrals · Admin · engineers.ge'};

export default async function AdminReferralsPage() {
  let topReferrers: Awaited<ReturnType<typeof listTopReferrers>> = [];
  let referredUsers: Awaited<ReturnType<typeof listUsers>> = [];
  let error: string | null = null;

  try {
    [topReferrers, referredUsers] = await Promise.all([
      listTopReferrers(25),
      listUsers({source: 'referred', limit: 500})
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'query failed';
  }

  const verifiedCount = referredUsers.filter((u) => u.email_verified).length;
  const engineerCount = referredUsers.filter((u) => u.verified_engineer).length;
  const flaggedCount = referredUsers.filter(
    (u) => u.disposable_email || u.fraud_score > 0 || !u.email_verified
  ).length;

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მომხმარებლები'}, {label: 'Referrals'}]}
        title="Referral programi"
        description="ვინ ვის მოიწვია, verification/fraud სტატუსი, ჯამური პროგრესი 3000₾ cap-თან."
      />
      <AdminSection>
        {error && (
          <div className="mb-4 rounded-md border border-red-lt bg-red-lt px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <Kpi label="მოწვეული user" value={referredUsers.length} />
          <Kpi
            label="verified email"
            value={verifiedCount}
            accent="grn"
            icon={<CheckCircle2 size={12} />}
          />
          <Kpi
            label="verified ინჟინერი"
            value={engineerCount}
            accent="blue"
            icon={<CheckCircle2 size={12} />}
          />
          <Kpi
            label="flagged"
            value={flaggedCount}
            accent="ora"
            icon={<AlertTriangle size={12} />}
          />
        </div>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Users size={14} className="text-blue" />
            <h2 className="text-sm font-bold text-navy">Top referrers</h2>
          </div>
          {topReferrers.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-bdr bg-sur-2 text-text-3">
                <Users size={16} />
              </span>
              <p className="text-[12px] font-semibold text-text-2">
                ჯერ არცერთი referral არ გამოეგზავნილა
              </p>
              <p className="text-[11px] text-text-3">
                პირველი დარეგისტრირებული მოწვევის შემდეგ აქ top-referrers სია გამოჩნდება
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[12px]">
                <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                  <tr>
                    <th className="px-3 py-2 text-left">მომწვევი</th>
                    <th className="px-3 py-2 text-left">მოწვია</th>
                    <th className="px-3 py-2 text-left">verified</th>
                    <th className="px-3 py-2 text-left">₾ earned</th>
                  </tr>
                </thead>
                <tbody>
                  {topReferrers.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-navy">{r.name}</div>
                        <div className="font-mono text-[10px] text-text-3">
                          {r.email}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-text-2">
                        {r.total_invited}
                      </td>
                      <td className="px-3 py-2 font-mono text-grn">
                        {r.total_registered}
                      </td>
                      <td className="px-3 py-2 font-mono text-ora">
                        {r.reward_gel} ₾
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-bold text-navy">ბოლო referred მომხმარებლები</h2>
            <Link
              href="/admin/users?source=referred"
              className="ml-auto text-[11px] font-semibold text-blue hover:underline"
            >
              ყველა / ვერიფიკაცია →
            </Link>
          </div>
          {referredUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-bdr bg-sur-2 text-text-3">
                <Users size={16} />
              </span>
              <p className="text-[12px] font-semibold text-text-2">
                referred მომხმარებლები ჯერ არ არიან
              </p>
              <p className="text-[11px] text-text-3">
                ვინც referral ბმულით დარეგისტრირდება, იქ გამოჩნდება ვერიფიკაციისთვის
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[12px]">
                <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                  <tr>
                    <th className="px-3 py-2 text-left">მომხმარებელი</th>
                    <th className="px-3 py-2 text-left">მოიწვია</th>
                    <th className="px-3 py-2 text-left">email</th>
                    <th className="px-3 py-2 text-left">ინჟინერი</th>
                    <th className="px-3 py-2 text-left">flags</th>
                    <th className="px-3 py-2 text-left">თარიღი</th>
                  </tr>
                </thead>
                <tbody>
                  {referredUsers.slice(0, 100).map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-navy">{u.name}</div>
                        <div className="font-mono text-[10px] text-text-3">
                          {u.email}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-text-2">
                        {u.referrer?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {u.email_verified ? (
                          <Pill color="grn">verified</Pill>
                        ) : (
                          <Pill color="bdr">pending</Pill>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {u.verified_engineer ? (
                          <Pill color="blue">✓</Pill>
                        ) : (
                          <Pill color="bdr">—</Pill>
                        )}
                      </td>
                      <td className="px-3 py-2 space-x-1">
                        {u.disposable_email && <Pill color="red">disposable</Pill>}
                        {u.fraud_score > 0 && (
                          <Pill color="ora">fraud {u.fraud_score}</Pill>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                        {new Date(u.registered_at).toLocaleDateString('ka-GE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminSection>
    </>
  );
}

function Kpi({
  label,
  value,
  accent,
  icon
}: {
  label: string;
  value: number;
  accent?: 'grn' | 'ora' | 'blue';
  icon?: React.ReactNode;
}) {
  const color =
    accent === 'grn'
      ? 'text-grn'
      : accent === 'ora'
      ? 'text-ora'
      : accent === 'blue'
      ? 'text-blue'
      : 'text-navy';
  return (
    <div className="rounded-md border bg-sur p-3">
      <div className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-[22px] font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Pill({
  color,
  children
}: {
  color: 'grn' | 'red' | 'ora' | 'blue' | 'bdr';
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    grn: 'border-grn-bd bg-grn-lt text-grn',
    red: 'border-red-lt bg-red-lt text-red',
    ora: 'border-ora-bd bg-ora-lt text-ora',
    blue: 'border-blue-bd bg-blue-lt text-blue',
    bdr: 'border-bdr bg-sur-2 text-text-3'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${map[color]}`}
    >
      {children}
    </span>
  );
}
