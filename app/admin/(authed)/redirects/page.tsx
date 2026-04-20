import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {listRedirects} from '@/lib/redirects';
import {getNotFoundStats} from '@/lib/not-found-events';
import {RedirectsWorkspace} from './workspace';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Redirects · Admin · engineers.ge'};

type Search = {prefill_source?: string};

export default async function AdminRedirectsPage({
  searchParams
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const [redirects, notFoundStats] = await Promise.all([
    listRedirects(),
    getNotFoundStats(30)
  ]);

  // 404 paths that don't yet have a redirect — suggest as quick-add candidates
  const redirectSources = new Set(redirects.map((r) => r.source));
  const suggestions = notFoundStats.top_paths
    .filter((p) => !redirectSources.has(p.pathname))
    .slice(0, 10);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'კონტენტი'}, {label: 'Redirects'}]}
        title="URL redirects"
        description="Admin-editable redirect map. Proxy-ი ამოწმებს თითოეულ request-ს (60s cache). Broken 404 URL → ახალი გვერდი — deploy-ის გარეშე."
      />
      <AdminSection>
        <RedirectsWorkspace
          initial={redirects}
          suggestions={suggestions}
          prefillSource={sp.prefill_source ?? ''}
        />
      </AdminSection>
    </>
  );
}
