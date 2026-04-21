'use client';

import {
  AlertTriangle,
  Activity,
  ArrowRightLeft,
  BarChart3,
  Bot,
  Bug,
  Cookie,
  DatabaseBackup,
  FileQuestion,
  Gauge,
  HardDrive,
  Home,
  Images,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Lock,
  Mail,
  Megaphone,
  Rocket,
  ScrollText,
  Share2,
  Shield,
  Sparkles,
  ToggleRight,
  Users,
  Zap
} from 'lucide-react';
import {AdminCommandPalette, type CommandItem} from './admin-command-palette';

/**
 * Static registry of all command-palette entries. Keeping it here (not in
 * admin-sidebar.tsx) avoids cycles and lets the command palette stay a
 * lightweight client-only component.
 */
const COMMANDS: CommandItem[] = [
  // — Dashboard / overview
  {id: 'stats', label: 'მიმოხილვა', section: 'მთავარი', href: '/admin/stats', icon: LayoutDashboard},
  {id: 'activity', label: 'Activity feed', description: 'ყოველი incident — bugs, errors, 404s, users', section: 'მთავარი', href: '/admin/activity', icon: Zap, keywords: ['live', 'feed', 'recent', 'incidents']},
  {id: 'launch-checklist', label: 'Launch checklist', description: 'Env / DB / deploy progress', section: 'მთავარი', href: '/admin/launch-checklist', icon: Rocket, keywords: ['ready', 'prelaunch']},
  {id: 'deploy', label: '🚀 Deploy production', description: 'Sitemap & Vercel deploy hook', section: 'მთავარი', href: '/admin/sitemap', icon: Rocket, keywords: ['sitemap', 'vercel', 'ship', 'prod']},
  {id: 'todos', label: 'TODO pipeline', section: 'მთავარი', href: '/admin/todos', icon: ListTodo},

  // — Content
  {id: 'banners', label: 'ბანერები · Hero Ads', description: 'Landing page treemap ads', section: 'კონტენტი', href: '/admin/banners', icon: Images, keywords: ['treemap', 'landing', 'tiles']},
  {id: 'redirects', label: 'URL redirects', description: 'Admin-editable redirect map', section: 'კონტენტი', href: '/admin/redirects', icon: ArrowRightLeft, keywords: ['301', '404']},
  {id: 'regulations', label: 'სტანდარტები & წყაროები', description: 'Matsne / EN / NFPA / ASHRAE monitor', section: 'კონტენტი', href: '/admin/regulations', icon: ScrollText, keywords: ['sources', 'monitor', 'matsne', 'standards']},

  // — Users
  {id: 'users', label: 'რეგისტრაციები', section: 'მომხმარებლები', href: '/admin/users', icon: Users, keywords: ['registrations', 'accounts']},
  {id: 'referrals', label: 'Referrals', section: 'მომხმარებლები', href: '/admin/referrals', icon: Share2},
  {id: 'consent-log', label: 'Cookie consent log', description: 'GDPR audit trail', section: 'მომხმარებლები', href: '/admin/consent-log', icon: Cookie, keywords: ['gdpr', 'privacy']},

  // — Analytics / observability
  {id: 'general-stats', label: 'სტატისტიკა', description: 'Page views, devices, referrers', section: 'ანალიტიკა', href: '/admin/stats', icon: BarChart3},
  {id: 'claude-sessions', label: 'Claude სესიები', section: 'ანალიტიკა', href: '/admin/claude-sessions', icon: Bot},
  {id: 'bug-reports', label: 'ხარვეზები', description: 'User-submitted bug reports', section: 'ანალიტიკა', href: '/admin/bug-reports', icon: Bug, keywords: ['bugs', 'issues']},
  {id: 'errors', label: 'Errors (frontend)', description: 'Client-side crash reports', section: 'ანალიტიკა', href: '/admin/errors', icon: AlertTriangle, keywords: ['crashes', 'exceptions']},
  {id: '404s', label: '404 tracking', description: 'Broken inbound links', section: 'ანალიტიკა', href: '/admin/404s', icon: FileQuestion, keywords: ['not found', 'broken']},
  {id: 'web-vitals', label: 'Web Vitals', description: 'LCP / CLS / INP / FCP / TTFB', section: 'ანალიტიკა', href: '/admin/web-vitals', icon: Gauge, keywords: ['performance', 'lcp', 'cls', 'inp']},

  // — Settings / ops
  {id: 'features', label: 'ფიჩერ-მართვა', description: 'Feature flags (active/test/hidden)', section: 'პარამეტრები', href: '/admin/features', icon: ToggleRight, keywords: ['flags', 'toggle']},
  {id: 'audit-log', label: 'Audit log', description: 'Admin action history', section: 'პარამეტრები', href: '/admin/audit-log', icon: ScrollText},
  {id: 'emails', label: 'Email preview', description: 'Welcome / bug / verify templates', section: 'პარამეტრები', href: '/admin/emails', icon: Mail},
  {id: 'backup', label: 'DB backup', description: 'Download JSON export', section: 'პარამეტრები', href: '/admin/backup', icon: DatabaseBackup, keywords: ['export', 'download']},
  {id: 'ai', label: 'AI (Claude)', section: 'პარამეტრები', href: '/admin/ai', icon: Sparkles},
  {id: 'health', label: 'System health', description: 'Readiness scorecard 5/5', section: 'პარამეტრები', href: '/admin/health', icon: HardDrive, keywords: ['status', 'ready']},
  {id: 'rate-limits', label: 'Rate limits', description: 'Locked IPs + unlock', section: 'პარამეტრები', href: '/admin/rate-limits', icon: Lock},
  {id: 'csp-violations', label: 'CSP violations', section: 'პარამეტრები', href: '/admin/csp-violations', icon: Shield},
  {id: 'password', label: 'პაროლის შეცვლა', section: 'პარამეტრები', href: '/admin/password', icon: KeyRound},

  // — Other
  {id: 'site', label: 'საჯარო საიტი', section: 'სხვა', href: '/', icon: Home},
  {id: 'ads-preview', label: 'რეკლამის preview', section: 'სხვა', href: '/ads', icon: Megaphone},
  {
    id: 'logout',
    label: 'გასვლა',
    section: 'სხვა',
    icon: Activity,
    action: async () => {
      await fetch('/api/admin/logout', {method: 'POST'});
      window.location.href = '/admin';
    }
  }
];

export function AdminCommandPaletteMount() {
  return <AdminCommandPalette items={COMMANDS} />;
}
