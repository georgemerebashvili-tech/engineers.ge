import {redirect} from 'next/navigation';

// Canonical URL is now /admin/analytics — keep old path working.
export default function StatsRedirectPage() {
  redirect('/admin/analytics');
}
