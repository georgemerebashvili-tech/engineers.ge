import {
  getRegistrationsByDay,
  listCountries,
  listTopReferrers,
  listUsers,
  type UserWithCountry,
  type ReferrerSummary
} from '@/lib/users';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {UsersWorkspace} from './workspace';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'მომხმარებლები · Admin · engineers.ge'};

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{
    country?: string;
    lang?: string;
    source?: string;
    interest?: string;
    q?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const countryId = params.country ? Number(params.country) : null;
  const language = params.lang || null;
  const source = (params.source === 'self' || params.source === 'referred') ? params.source : null;
  const interest = params.interest || null;
  const q = params.q?.trim() || '';
  const view = params.view === 'trash' ? 'trash' : 'active';

  let countries: Awaited<ReturnType<typeof listCountries>> = [];
  let users: UserWithCountry[] = [];
  let trashedUsers: UserWithCountry[] = [];
  let topReferrers: ReferrerSummary[] = [];
  let regByDay: {date: string; self: number; referred: number}[] = [];
  let error: string | null = null;

  try {
    const [c, u, t, r, d] = await Promise.all([
      listCountries(),
      listUsers({country_id: countryId, language, source, interest, q, limit: 500}),
      listUsers({only_deleted: true, limit: 500}),
      listTopReferrers(8),
      getRegistrationsByDay(30)
    ]);
    countries = c;
    users = u;
    trashedUsers = t;
    topReferrers = r;
    regByDay = d;
  } catch (e) {
    error = e instanceof Error ? e.message : 'query failed';
  }

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მომხმარებლები'}]}
        title="რეგისტრირებული მომხმარებლები"
        description="თვით რეგისტრაცია + მოწვეული ლინკით. მარკეტინგული სტატისტიკა და მოქმედი ბაზა."
      />
      <AdminSection>
        <UsersWorkspace
          users={users}
          trashedUsers={trashedUsers}
          countries={countries}
          topReferrers={topReferrers}
          regByDay={regByDay}
          selectedCountry={countryId}
          selectedLang={language}
          selectedSource={source}
          selectedInterest={interest}
          query={q}
          initialView={view as 'active' | 'trash'}
          error={error}
        />
      </AdminSection>
    </>
  );
}
