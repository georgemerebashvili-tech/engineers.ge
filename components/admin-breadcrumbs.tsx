'use client';

import {usePathname} from 'next/navigation';
import {Breadcrumbs, type Crumb} from './breadcrumbs';

/**
 * Admin-area breadcrumbs. Derives trail from current pathname using a
 * static map of known admin routes. Falls back to the raw segment if an
 * unknown route is visited.
 */
const ADMIN_ROUTE_MAP: Record<string, {label: string; section?: string}> = {
  '/admin': {label: 'მიმოხილვა'},
  '/admin/stats': {label: 'სტატისტიკა', section: 'ანალიტიკა'},
  '/admin/claude-sessions': {label: 'Claude სესიები', section: 'ანალიტიკა'},
  '/admin/banners': {label: 'ბანერები', section: 'კონტენტი'},
  '/admin/banners/manage': {label: 'Hero Ads მართვა', section: 'კონტენტი'},
  '/admin/banners/table': {label: 'ცხრილი', section: 'კონტენტი'},
  '/admin/banners/stats': {label: 'სტატისტიკა', section: 'კონტენტი'},
  '/admin/banners/preview': {label: 'Preview', section: 'კონტენტი'},
  '/admin/tiles': {label: 'Hero Tiles', section: 'კონტენტი'},
  '/admin/users': {label: 'რეგისტრაციები', section: 'მომხმარებლები'},
  '/admin/referrals': {label: 'Referrals', section: 'მომხმარებლები'},
  '/admin/ai': {label: 'AI (Claude)', section: 'პარამეტრები'},
  '/admin/health': {label: 'System health', section: 'პარამეტრები'},
  '/admin/password': {label: 'პაროლი', section: 'პარამეტრები'},
  '/admin/sitemap': {label: 'Sitemap', section: 'მთავარი'},
  '/admin/todos': {label: 'TODO', section: 'მთავარი'}
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  if (!pathname || !pathname.startsWith('/admin')) return null;

  const route = ADMIN_ROUTE_MAP[pathname];
  const crumbs: Crumb[] = [{label: 'ადმინისტრაცია', href: '/admin'}];
  if (!route || pathname === '/admin') {
    // root of admin — just "Admin"
    return (
      <Breadcrumbs items={[{label: 'ადმინისტრაცია'}]} className="px-4 py-1.5" />
    );
  }
  if (route.section) {
    crumbs.push({label: route.section});
  }
  crumbs.push({label: route.label});
  return <Breadcrumbs items={crumbs} className="px-4 py-1.5" />;
}
