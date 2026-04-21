'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Pin,
  PinOff,
  LayoutDashboard,
  Zap,
  Mail,
  DatabaseBackup,
  Megaphone,
  Images,
  BarChart3,
  KeyRound,
  Home,
  LogOut,
  ArrowLeft,
  Users,
  Sparkles,
  Cookie,
  Share2,
  Activity,
  Gauge,
  Shield,
  Lock,
  ListTodo,
  Bot,
  Bug,
  Rocket,
  ArrowRightLeft,
  ScrollText,
  ToggleRight,
  ChevronRight,
  Building2,
  FlaskConical,
  FolderKanban,
  Droplets,
  Crown,
  type LucideIcon
} from 'lucide-react';
import type {FeatureMap, FeatureStatus} from '@/lib/feature-flags';

type NavChild = {
  label: string;
  href: string;
  disabled?: boolean;
  badge?: string;
  flagKey?: string;
};

type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children?: NavChild[];
  flagKey?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function statusOf(flags: FeatureMap | undefined, key?: string): FeatureStatus {
  if (!key) return 'active';
  return flags?.[key] ?? 'active';
}

const PIN_KEY = 'eng_admin_sidebar_pinned';
const OPEN_KEY = 'eng_admin_sidebar_open_keys';

export function AdminSidebar({flags}: {flags?: FeatureMap} = {}) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hash, setHash] = useState('');
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({
    banners: true,
    analytics: true
  });

  useEffect(() => {
    try {
      setPinned(localStorage.getItem(PIN_KEY) === '1');
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) setOpenKeys((prev) => ({...prev, ...JSON.parse(raw)}));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [pathname]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(openKeys));
    } catch {}
  }, [openKeys, hydrated]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    try {
      localStorage.setItem(PIN_KEY, next ? '1' : '0');
    } catch {}
  };

  const toggleGroup = (key: string) =>
    setOpenKeys((prev) => ({...prev, [key]: !prev[key]}));

  const expanded = hydrated && (pinned || hover);

  const isActive = (href: string) => {
    if (!pathname) return false;
    const [p, h = ''] = href.split('#');
    if (pathname !== p) return false;
    const childHash = h ? `#${h}` : '';
    return hash === childHash;
  };

  async function handleLogout() {
    await fetch('/api/admin/logout', {method: 'POST'});
    // Full reload to flush admin session state after logout — intentional.
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = '/admin';
  }

  const SECTIONS: NavSection[] = [
    {
      title: 'მთავარი',
      items: [
        {
          key: 'deploy',
          label: '🚀 Deploy production',
          href: '/admin/sitemap',
          icon: Rocket,
          flagKey: 'admin.sitemap'
        },
        {
          key: 'overview',
          label: 'მიმოხილვა',
          href: '/admin/stats',
          icon: LayoutDashboard
        },
        {
          key: 'activity',
          label: 'Activity',
          href: '/admin/activity',
          icon: Zap,
          flagKey: 'admin.activity'
        },
        {
          key: 'todos',
          label: 'TODO pipeline',
          href: '/admin/todos',
          icon: ListTodo,
          flagKey: 'admin.todos'
        }
      ]
    },
    {
      title: 'კონტენტი',
      items: [
        {
          key: 'banners',
          label: 'ბანერები · Hero Ads',
          href: '/admin/banners',
          icon: Images,
          flagKey: 'admin.banners'
        },
        {
          key: 'story',
          label: 'storyabout.me',
          href: '/admin/story',
          icon: Crown
        },
        {
          key: 'redirects',
          label: 'URL redirects',
          href: '/admin/redirects',
          icon: ArrowRightLeft,
          flagKey: 'admin.redirects'
        },
        {
          key: 'regulations',
          label: 'წყაროები',
          href: '/admin/regulations',
          icon: ScrollText,
          flagKey: 'admin.regulations'
        }
      ]
    },
    {
      title: 'მომხმარებლები',
      items: [
        {
          key: 'users',
          label: 'რეგისტრაციები',
          href: '/admin/users',
          icon: Users,
          flagKey: 'admin.users'
        },
        {
          key: 'referrals',
          label: 'Referrals',
          href: '/admin/referrals',
          icon: Share2,
          flagKey: 'admin.referrals'
        },
        {
          key: 'consent-log',
          label: 'Consent log',
          href: '/admin/consent-log',
          icon: Cookie,
          flagKey: 'admin.consent-log'
        }
      ]
    },
    {
      title: 'ანალიტიკა',
      items: [
        {
          key: 'analytics',
          label: 'სტატისტიკა',
          href: '/admin/stats',
          icon: BarChart3,
          flagKey: 'admin.stats'
        },
        {
          key: 'claude-sessions',
          label: 'Claude გამოყენება',
          href: '/admin/claude-sessions',
          icon: Bot,
          flagKey: 'admin.claude-sessions'
        },
        {
          key: 'bug-reports',
          label: 'ხარვეზები · Issues',
          href: '/admin/bug-reports',
          icon: Bug,
          flagKey: 'admin.bug-reports'
        }
      ]
    },
    {
      title: 'მონიტორინგი',
      items: [
        {
          key: 'health',
          label: 'System health · Launch',
          href: '/admin/health',
          icon: Activity,
          flagKey: 'admin.health'
        },
        {
          key: 'web-vitals',
          label: 'Web Vitals',
          href: '/admin/web-vitals',
          icon: Gauge,
          flagKey: 'admin.web-vitals'
        },
        {
          key: 'rate-limits',
          label: 'Rate limits',
          href: '/admin/rate-limits',
          icon: Lock,
          flagKey: 'admin.rate-limits'
        },
        {
          key: 'csp-violations',
          label: 'CSP violations',
          href: '/admin/csp-violations',
          icon: Shield,
          flagKey: 'admin.csp-violations'
        },
        {
          key: 'audit-log',
          label: 'Audit log',
          href: '/admin/audit-log',
          icon: ScrollText,
          flagKey: 'admin.audit-log'
        }
      ]
    },
    {
      title: 'პარამეტრები',
      items: [
        {
          key: 'features',
          label: 'ფიჩერ-მართვა',
          href: '/admin/features',
          icon: ToggleRight
        },
        {
          key: 'ai',
          label: 'AI (Claude)',
          href: '/admin/ai',
          icon: Sparkles,
          flagKey: 'admin.ai'
        },
        {
          key: 'emails',
          label: 'Email preview',
          href: '/admin/emails',
          icon: Mail,
          flagKey: 'admin.emails'
        },
        {
          key: 'backup',
          label: 'DB backup',
          href: '/admin/backup',
          icon: DatabaseBackup,
          flagKey: 'admin.backup'
        },
        {
          key: 'password',
          label: 'პაროლის შეცვლა',
          href: '/admin/password',
          icon: KeyRound
        }
      ]
    },
    {
      title: 'პროექტები',
      items: [
        {
          key: 'projects-hub',
          label: 'მიმოხილვა',
          href: '/admin/projects',
          icon: FolderKanban
        },
        {
          key: 'tbc-project',
          label: 'TBC',
          icon: Building2,
          onClick: () => {
            window.open('/tbc/admin', '_blank', 'noopener,noreferrer');
          }
        },
        {
          key: 'staging-engineering',
          label: 'Staging · Engineering',
          icon: FlaskConical,
          onClick: () => {
            window.open(
              'https://engineers-ge-staging.vercel.app',
              '_blank',
              'noopener,noreferrer'
            );
          }
        }
      ]
    },
    {
      title: 'სხვა',
      items: [
        {key: 'site', label: 'საჯარო საიტი', href: '/', icon: Home},
        {key: 'calc-preview', label: 'კალკულატორები', href: '/calc', icon: FlaskConical},
        {key: 'ads-preview', label: 'რეკლამის preview', href: '/ads', icon: Megaphone, flagKey: 'admin.ads-preview'},
        {
          key: 'sprinkler-sim',
          label: 'სპრინკლერი (3D sim) · prototype',
          href: '/experiments/sprinkler-sim.html',
          icon: Droplets,
          flagKey: 'admin.sprinkler-sim'
        },
        {
          key: 'dmt',
          label: 'DMT ops panel',
          href: '/dmt',
          icon: FolderKanban,
          flagKey: 'admin.dmt'
        },
        {
          key: 'logout',
          label: 'გასვლა',
          icon: LogOut,
          onClick: handleLogout
        }
      ]
    }
  ];

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="დახურე admin sidebar"
          onClick={() => { setPinned(false); setHover(false); }}
          className="fixed inset-0 top-14 z-20 bg-navy/40 backdrop-blur-sm md:hidden"
        />
      )}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{width: pinned ? 240 : 56}}
        className="relative shrink-0 transition-[width] duration-150 ease-out"
      >
    <aside
      style={{width: expanded ? 240 : 56}}
      className={`${
        expanded ? 'fixed md:sticky' : 'sticky'
      } top-[calc(3.5rem+1.5rem)] md:top-[calc(4rem+1.5rem)] z-30 flex h-[calc(100vh-5rem)] md:h-[calc(100vh-5.5rem)] flex-col border-r border-bdr bg-sur shadow-lg md:shadow-none transition-[width] duration-150 ease-out ${
        !pinned && hover ? 'shadow-xl' : ''
      }`}
      aria-expanded={expanded}
    >
      <div className={`flex items-center border-b border-bdr px-2 py-2.5 ${expanded ? 'justify-between' : 'justify-center'}`}>
        {expanded && (
          <Link
            href="/dashboard"
            className="group relative inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold text-text-2 transition-colors hover:bg-sur-2 hover:text-blue"
            aria-label="უკან მთავარ dashboard-ზე"
          >
            <ArrowLeft size={14} />
            <span>dashboard</span>
          </Link>
        )}
        <button
          type="button"
          onClick={togglePin}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
            pinned
              ? 'border-ora-bd bg-ora-lt text-ora'
              : 'border-bdr bg-sur-2 text-text-3 hover:text-navy hover:border-bdr-2'
          }`}
          aria-label={pinned ? 'unpin sidebar' : 'pin sidebar'}
          title={pinned ? 'unpin' : 'pin'}
        >
          {pinned ? (
            <Pin size={14} strokeWidth={2.2} />
          ) : (
            <PinOff size={14} strokeWidth={2} />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => statusOf(flags, item.flagKey) !== 'hidden'
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className={expanded ? 'mb-3' : 'mb-1'}>
              {expanded && (
                <div className="px-3 pb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-3">
                  {section.title}
                </div>
              )}
              <ul className="space-y-0.5 px-1.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = !!item.children?.length;
                  const isOpen = !!openKeys[item.key];
                  const active = item.href ? isActive(item.href) : false;
                  const groupHasActiveChild = !!item.children?.some((c) =>
                    isActive(c.href)
                  );
                  const itemStatus = statusOf(flags, item.flagKey);
                  const rowBase =
                    'group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors w-full text-left';
                  const rowState = item.disabled
                    ? 'text-text-3 opacity-60 cursor-not-allowed'
                    : active || groupHasActiveChild
                    ? 'bg-blue-lt text-blue font-semibold'
                    : 'text-text-2 hover:bg-sur-2 hover:text-navy';

                  const rowInner = (
                    <>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        <Icon size={16} strokeWidth={1.8} />
                      </span>
                      <span
                        className={`flex-1 truncate transition-opacity ${
                          expanded ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {item.label}
                      </span>
                      {itemStatus === 'test' && expanded && (
                        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-[1px] font-mono text-[9px] font-semibold text-amber-700" title="სატესტო რეჟიმი">
                          test
                        </span>
                      )}
                      {hasChildren && expanded && (
                        <ChevronRight
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                          className={`shrink-0 text-text-3 transition-transform ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        />
                      )}
                      {!expanded && (
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                        >
                          {item.label}
                        </span>
                      )}
                    </>
                  );

                  return (
                    <li key={item.key}>
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.key)}
                          className={`${rowBase} ${rowState}`}
                          aria-expanded={isOpen}
                        >
                          {rowInner}
                        </button>
                      ) : item.onClick ? (
                        <button
                          type="button"
                          onClick={item.onClick}
                          className={`${rowBase} ${rowState}`}
                        >
                          {rowInner}
                        </button>
                      ) : item.disabled ? (
                        <span className={`${rowBase} ${rowState}`}>{rowInner}</span>
                      ) : (
                        <Link href={item.href!} className={`${rowBase} ${rowState}`}>
                          {rowInner}
                        </Link>
                      )}

                      {hasChildren && expanded && isOpen && (
                        <ul className="mt-0.5 ml-[22px] space-y-0.5 border-l border-bdr pl-2">
                          {item.children!.map((child) => {
                            const cActive = isActive(child.href);
                            const cState = child.disabled
                              ? 'text-text-3 opacity-50 cursor-not-allowed'
                              : cActive
                              ? 'text-blue font-semibold bg-blue-lt'
                              : 'text-text-2 hover:bg-sur-2 hover:text-navy';
                            const cBase =
                              'flex h-8 items-center gap-2 rounded-md px-2.5 text-[12px] transition-colors';
                            const inner = (
                              <>
                                <span className="flex-1 truncate">{child.label}</span>
                                {child.badge && (
                                  <span className="shrink-0 rounded-full border border-bdr bg-sur-2 px-1.5 py-[1px] font-mono text-[9px] font-semibold text-text-3">
                                    {child.badge}
                                  </span>
                                )}
                              </>
                            );
                            return (
                              <li key={`${child.label}-${child.href}`}>
                                {child.disabled ? (
                                  <span className={`${cBase} ${cState}`}>{inner}</span>
                                ) : (
                                  <Link
                                    href={child.href}
                                    className={`${cBase} ${cState}`}
                                    onClick={() => {
                                      const h = child.href.split('#')[1];
                                      setHash(h ? `#${h}` : '');
                                    }}
                                  >
                                    {inner}
                                  </Link>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {expanded && (
        <div className="border-t border-bdr p-2">
          <div className="px-2 font-mono text-[9px] text-text-3">
            admin · engineers.ge
          </div>
        </div>
      )}
    </aside>
    </div>
    </>
  );
}
