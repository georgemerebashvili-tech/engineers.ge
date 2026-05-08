import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {SitemapWorkspace} from '../sitemap/workspace';
import {
  scanAppRoutes,
  scanStaticCalcPages,
  countRoutes,
  type RouteNode
} from '@/lib/route-scanner';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Deploy production · Admin · engineers.ge'};

function stripFile(node: RouteNode): RouteNode {
  return {
    ...node,
    file: node.file ? node.file.replace(process.cwd() + '/', '') : null,
    children: node.children.map(stripFile)
  };
}

export default function DeployPage() {
  const app = scanAppRoutes();
  const calcs = scanStaticCalcPages();
  const stats = countRoutes(app);
  const deployHookConfigured = Boolean(process.env.VERCEL_DEPLOY_HOOK_URL);
  const deployEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  const deployUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: '🚀 Deploy production'}]}
        title="🚀 Deploy production"
        description="Vercel Deploy Hook — ახალი production build-ის გაშვება. ქვემოთ ასევე ხე ყველა გვერდის, API route-ის და static კალკის."
      />
      <AdminSection>
        <SitemapWorkspace
          app={stripFile(app)}
          calcs={calcs.map(stripFile)}
          stats={stats}
          deployHookConfigured={deployHookConfigured}
          deployEnv={deployEnv}
          deployUrl={deployUrl}
        />
      </AdminSection>
    </>
  );
}
