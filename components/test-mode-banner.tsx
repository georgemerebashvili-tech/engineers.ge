import {featureKeyForRoute, getFeatureFlags} from '@/lib/feature-flags';
import {TestModeBannerClient} from './test-mode-banner-client';

/**
 * Server component. Renders a yellow warning banner when the current route
 * points to a feature flagged as 'test'. Includes a client-side "report bug"
 * button that opens ReportIssueModal.
 */
export async function TestModeBanner({pathname}: {pathname: string}) {
  const key = featureKeyForRoute(pathname);
  if (!key) return null;
  const flags = await getFeatureFlags();
  if (flags[key] !== 'test') return null;

  return <TestModeBannerClient pathname={pathname} featureKey={key} />;
}
