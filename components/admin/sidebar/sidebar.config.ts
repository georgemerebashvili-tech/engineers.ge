import {
  Rocket,
  LayoutDashboard,
  Zap,
  ListTodo,
  Wind,
  Images,
  Crown,
  ArrowRightLeft,
  ScrollText,
  Users,
  Share2,
  Cookie,
  BarChart3,
  Bot,
  Bug,
  Activity,
  Gauge,
  Lock,
  Shield,
  ToggleRight,
  Sparkles,
  Mail,
  DatabaseBackup,
  KeyRound,
  FolderKanban,
  Building2,
  FlaskConical,
  Home,
  Droplets,
  Megaphone,
  Tag,
  LogOut,
  ExternalLink
} from 'lucide-react';
import type {NavGroup} from './sidebar.types';

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    title: 'მთავარი',
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        id: 'deploy',
        label: '🚀 Deploy production',
        href: '/admin/deploy',
        icon: Rocket,
        flagKey: 'admin.sitemap',
        roles: ['superadmin', 'developer']
      },
      {
        id: 'overview',
        label: 'მიმოხილვა',
        href: '/admin/overview',
        icon: LayoutDashboard,
        exact: true
      },
      {
        id: 'activity',
        label: 'Activity',
        href: '/admin/activity',
        icon: Zap,
        flagKey: 'admin.activity'
      },
      {
        id: 'todos',
        label: 'TODO pipeline',
        href: '/admin/todos',
        icon: ListTodo,
        flagKey: 'admin.todos'
      }
    ]
  },
  {
    id: 'content',
    title: 'კონტენტი',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'ahu-catalog',
        label: 'AHU კატალოგი',
        href: '/admin/ahu-catalog',
        icon: Wind,
        flagKey: 'admin.ahu-catalog'
      },
      {
        id: 'banners',
        label: 'ბანერები · Hero Ads',
        href: '/admin/banners',
        icon: Images,
        flagKey: 'admin.banners'
      },
      {
        id: 'story',
        label: 'storyabout.me',
        href: '/admin/story',
        icon: Crown
      },
      {
        id: 'redirects',
        label: 'URL redirects',
        href: '/admin/redirects',
        icon: ArrowRightLeft,
        flagKey: 'admin.redirects'
      },
      {
        id: 'regulations',
        label: 'წყაროები',
        href: '/admin/regulations',
        icon: ScrollText,
        flagKey: 'admin.regulations'
      }
    ]
  },
  {
    id: 'users',
    title: 'მომხმარებლები',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'users',
        label: 'რეგისტრაციები',
        href: '/admin/users',
        icon: Users,
        flagKey: 'admin.users'
      },
      {
        id: 'referrals',
        label: 'Referrals',
        href: '/admin/referrals',
        icon: Share2,
        flagKey: 'admin.referrals'
      },
      {
        id: 'consent-log',
        label: 'Consent log',
        href: '/admin/consent-log',
        icon: Cookie,
        flagKey: 'admin.consent-log'
      }
    ]
  },
  {
    id: 'analytics',
    title: 'ანალიტიკა',
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        id: 'analytics-stats',
        label: 'სტატისტიკა',
        href: '/admin/analytics',
        icon: BarChart3,
        flagKey: 'admin.stats'
      },
      {
        id: 'claude-sessions',
        label: 'Claude გამოყენება',
        href: '/admin/claude-sessions',
        icon: Bot,
        flagKey: 'admin.claude-sessions'
      },
      {
        id: 'bug-reports',
        label: 'ხარვეზები · Issues',
        href: '/admin/bug-reports',
        icon: Bug,
        flagKey: 'admin.bug-reports'
      }
    ]
  },
  {
    id: 'monitoring',
    title: 'მონიტორინგი',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'health',
        label: 'System health · Launch',
        href: '/admin/health',
        icon: Activity,
        flagKey: 'admin.health'
      },
      {
        id: 'web-vitals',
        label: 'Web Vitals',
        href: '/admin/web-vitals',
        icon: Gauge,
        flagKey: 'admin.web-vitals'
      },
      {
        id: 'rate-limits',
        label: 'Rate limits',
        href: '/admin/rate-limits',
        icon: Lock,
        flagKey: 'admin.rate-limits'
      },
      {
        id: 'csp-violations',
        label: 'CSP violations',
        href: '/admin/csp-violations',
        icon: Shield,
        flagKey: 'admin.csp-violations'
      },
      {
        id: 'audit-log',
        label: 'Audit log',
        href: '/admin/audit-log',
        icon: ScrollText,
        flagKey: 'admin.audit-log'
      }
    ]
  },
  {
    id: 'settings',
    title: 'პარამეტრები',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'features',
        label: 'ფიჩერ-მართვა',
        href: '/admin/features',
        icon: ToggleRight
      },
      {
        id: 'ai',
        label: 'AI (Claude)',
        href: '/admin/ai',
        icon: Sparkles,
        flagKey: 'admin.ai'
      },
      {
        id: 'emails',
        label: 'Email preview',
        href: '/admin/emails',
        icon: Mail,
        flagKey: 'admin.emails'
      },
      {
        id: 'backup',
        label: 'DB backup',
        href: '/admin/backup',
        icon: DatabaseBackup,
        flagKey: 'admin.backup',
        roles: ['superadmin']
      },
      {
        id: 'password',
        label: 'პაროლის შეცვლა',
        href: '/admin/password',
        icon: KeyRound
      }
    ]
  },
  {
    id: 'projects',
    title: 'პროექტები',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'projects-hub',
        label: 'მიმოხილვა',
        href: '/admin/projects',
        icon: FolderKanban
      },
      {
        id: 'tbc-admin',
        label: 'TBC',
        href: '/tbc/admin',
        icon: Building2,
        external: true,
        target: '_blank'
      },
      {
        id: 'tbc-products',
        label: 'TBC · მოწყობილობები',
        href: '/tbc/app#products',
        icon: Building2,
        external: true,
        target: '_blank'
      },
      {
        id: 'kaya-construction',
        label: 'KAYA Construction',
        href: '/construction/admin',
        icon: Building2,
        external: true,
        target: '_blank'
      },
      {
        id: 'procurement',
        label: 'შესყიდვები / ტენდ.',
        href: '/construction/procurement',
        icon: Building2,
        external: true,
        target: '_blank'
      },
      {
        id: 'procurement-contacts',
        label: 'მომწ. კონტაქტები',
        href: '/construction/procurement/contacts',
        icon: Building2,
        external: true,
        target: '_blank'
      },
      {
        id: 'staging-engineering',
        label: 'Staging · Engineering',
        href: 'https://engineers-ge-staging.vercel.app',
        icon: FlaskConical,
        external: true,
        target: '_blank'
      }
    ]
  },
  {
    id: 'quicklinks',
    title: 'სხვა / Quick Links',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'public-site',
        label: 'საჯარო საიტი',
        href: '/',
        icon: Home,
        exact: true
      },
      {
        id: 'calculators',
        label: 'კალკულატორები',
        href: '/calc',
        icon: FlaskConical,
        exact: true
      },
      {
        id: 'fan-coil',
        label: 'ფ/კ ჰიდრავლიკა',
        href: '/calc/fan-coil-hydraulics',
        icon: Droplets
      },
      {
        id: 'ahu-ashrae',
        label: 'AHU სელექცია ASHRAE',
        href: '/calc/ahu-ashrae',
        icon: Wind
      },
      {
        id: 'fan-library',
        label: 'Fan ბიბლიოთეკა',
        href: '/calc/ahu-ashrae/fans',
        icon: Wind
      },
      {
        id: 'ads-preview',
        label: 'რეკლამის preview',
        href: '/ads',
        icon: Megaphone,
        flagKey: 'admin.ads-preview',
        exact: true
      },
      {
        id: 'sprinkler-sim',
        label: 'სპრინკლერი 3D sim · prototype',
        href: '/experiments/sprinkler-sim.html',
        icon: Droplets,
        flagKey: 'admin.sprinkler-sim'
      },
      {
        id: 'dmt',
        label: 'DMT ops panel',
        href: '/dmt',
        icon: FolderKanban,
        flagKey: 'admin.dmt'
      },
      {
        id: 'tag-console',
        label: 'Tag Console',
        href: '/tag-console',
        icon: Tag
      },
      {
        id: 'logout',
        label: 'გასვლა',
        icon: LogOut,
        action: 'logout'
      }
    ]
  }
];

// IDs of groups that are open by default
export const DEFAULT_OPEN_GROUPS = NAV_GROUPS.filter((g) => g.defaultOpen).map((g) => g.id);
