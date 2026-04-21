'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Pin,
  PinOff,
  Flame,
  Wind,
  Siren,
  Layers,
  Thermometer,
  Gauge,
  FolderKanban,
  Star,
  UserPlus,
  Home,
  Megaphone,
  ShieldCheck,
  Coins,
  Tag,
  BookOpen,
  Blocks,
  Ruler,
  Building2,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import {RegisterPromptModal} from './register-prompt-modal';
import type {FeatureMap, FeatureStatus} from '@/lib/feature-flags';

type NavChild = {
  label: string;
  href: string;
  disabled?: boolean;
  badge?: string;
  /** Feature flag key — child is hidden when flag is 'hidden'. */
  flagKey?: string;
};

type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
  children?: NavChild[];
  action?: 'register';
  /** Feature flag key — item is hidden when flag is 'hidden'. */
  flagKey?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    title: 'მთავარი',
    items: [
      {key: 'home', label: 'მთავარი', href: '/', icon: Home},
      {
        key: 'projects',
        label: 'ჩემი პროექტები',
        href: '/dashboard/projects',
        icon: FolderKanban,
        flagKey: 'dash.projects'
      },
      {
        key: 'favorites',
        label: 'რჩეული ხელსაწყოები',
        icon: Star,
        action: 'register',
        flagKey: 'dash.favorites'
      },
      {
        key: 'referrals',
        label: 'მოიწვიე · იშოვე 3000₾',
        href: '/dashboard/referrals',
        icon: Coins,
        flagKey: 'dash.referrals'
      }
    ]
  },
  {
    title: 'საინჟინრო მიმართულებები',
    items: [
      {
        key: 'heating-cooling',
        label: 'გათბობა · კონდიცირება',
        icon: Flame,
        children: [
          {label: 'HVAC კალკულატორი', href: '/calc/hvac', badge: 'ASHRAE 62.1', flagKey: 'calc.hvac'}
        ]
      },
      {
        key: 'ventilation',
        label: 'ვენტილაცია',
        icon: Wind,
        children: [
          {label: 'AHU · ASHRAE რეპორტი', href: '/calc/ahu-ashrae', flagKey: 'calc.ahu-ashrae'}
        ]
      },
      {
        key: 'fire-safety',
        label: 'სახანძრო სისტემები',
        icon: Siren,
        children: [
          {label: 'სადარბაზოს დაწნეხვა', href: '/calc/stair-pressurization', badge: 'EN 12101-6', flagKey: 'calc.stair-pressurization'},
          {label: 'ლიფტის შახტის დაწნეხვა', href: '/calc/elevator-shaft-press', badge: 'Elevator', flagKey: 'calc.elevator-shaft-press'},
          {label: 'პარკინგის ვენტილაცია', href: '/calc/parking-ventilation', badge: 'CO + Smoke', flagKey: 'calc.parking-ventilation'},
          {label: 'კორიდორის დაწნეხვა', href: '/calc/floor-pressurization', badge: 'Refuge', flagKey: 'calc.floor-pressurization'}
        ]
      },
      {
        key: 'thermal-envelope',
        label: 'თბოგადაცემა',
        icon: Layers,
        children: [
          {label: 'კედლის U-ფაქტორი', href: '/calc/wall-thermal', badge: 'ISO 6946', flagKey: 'calc.wall-thermal'}
        ]
      },
      {
        key: 'heat-load',
        label: 'თბოდანაკარგები',
        icon: Thermometer,
        children: [
          {label: 'EN 12831 Heat Load', href: '/calc/heat-loss', flagKey: 'calc.heat-loss'}
        ]
      },
      {
        key: 'fluid-acoustics',
        label: 'ჰიდრავლიკა · აკუსტიკა',
        icon: Gauge,
        children: [
          {label: 'ხმაურდამხშობი', href: '/calc/silencer', badge: 'ISO 7235', flagKey: 'calc.silencer'},
          {label: 'ხმაურდამხშობის კატალოგი', href: '/calc/silencer-kaya', flagKey: 'calc.silencer-kaya'}
        ]
      },
      {
        key: 'promotions',
        label: 'აქციები',
        icon: Tag,
        href: '/promotions',
        flagKey: 'dash.promotions'
      }
    ]
  },
  {
    title: 'CAD · გეგმები',
    items: [
      {
        key: 'wall-editor',
        label: 'გეგმის რედაქტორი',
        href: '/calc/wall-editor',
        icon: Ruler,
        flagKey: 'calc.wall-editor'
      },
      {
        key: 'building-composer',
        label: 'შენობის აღმშენებლობა',
        href: '/calc/building-composer',
        icon: Building2,
        flagKey: 'calc.building-composer'
      }
    ]
  },
  {
    title: 'დოკუმენტაცია',
    items: [
      {
        key: 'physics-docs',
        label: 'ფიზიკის ფორმულები',
        href: '/calc/docs/physics',
        icon: BookOpen,
        flagKey: 'calc.physics-docs'
      },
      {
        key: 'standards-docs',
        label: 'სტანდარტები',
        href: '/calc/docs/standards',
        icon: ShieldCheck,
        flagKey: 'calc.standards-docs'
      }
    ]
  },
  {
    title: 'სხვა',
    items: [
      {key: 'ads', label: 'რეკლამა', href: '/ads', icon: Megaphone, flagKey: 'dash.ads'},
      {key: 'admin', label: 'ადმინი', href: '/admin', icon: ShieldCheck}
    ]
  }
];

function statusOf(flags: FeatureMap | undefined, key?: string): FeatureStatus {
  if (!key) return 'active';
  return flags?.[key] ?? 'active';
}

const PIN_KEY = 'eng_sidebar_pinned';
const OPEN_KEY = 'eng_sidebar_open_keys';

export function DashboardSidebar({flags}: {flags?: FeatureMap} = {}) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hash, setHash] = useState('');
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setPinned(localStorage.getItem(PIN_KEY) === '1');
        const raw = localStorage.getItem(OPEN_KEY);
        if (raw) setOpenKeys(JSON.parse(raw));
      } catch {}
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PIN_KEY, pinned ? '1' : '0');
    } catch {}
  }, [pinned, hydrated]);

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned((prev) => !prev);
  };

  const toggleGroup = (key: string) =>
    setOpenKeys((prev) => ({...prev, [key]: !prev[key]}));

  const expanded = hydrated && (pinned || hover);

  const isChildActive = (href: string) => {
    if (!pathname) return false;
    const [p, h = ''] = href.split('#');
    const base = p || href;
    if (pathname !== base) return false;
    const childHash = h ? `#${h}` : '';
    return hash === childHash;
  };

  return (
    <>
      {/* Mobile backdrop — dim main content when expanded on narrow viewports */}
      {expanded && (
        <button
          type="button"
          aria-label="დახურე sidebar"
          onClick={() => setPinned(false)}
          className="fixed inset-0 top-14 z-20 bg-navy/40 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{width: expanded ? 240 : 56}}
        className={`${
          expanded ? 'fixed md:sticky' : 'sticky'
        } top-14 md:top-16 z-30 flex h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] shrink-0 flex-col border-r border-bdr bg-sur shadow-lg md:shadow-none transition-[width] duration-150 ease-out`}
      >
        <div className={`flex items-center border-b border-bdr px-2 py-2.5 ${expanded ? 'justify-between' : 'justify-center'}`}>
          {expanded && (
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-bd bg-blue-lt px-2.5 text-[12px] font-semibold text-blue transition-colors hover:bg-blue hover:text-white"
              aria-label="რეგისტრაცია"
            >
              <UserPlus size={14} />
              <span>რეგისტრაცია</span>
            </button>
          )}
          <button
            type="button"
            onClick={togglePin}
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
              pinned
                ? 'border-ora-bd bg-ora-lt text-ora'
                : 'border-bdr bg-sur-2 text-text-3 hover:text-navy hover:border-bdr-2'
            }`}
            aria-label={pinned ? 'sidebar მოხსნილია' : 'sidebar დამაგრდა'}
            aria-pressed={pinned}
            title={pinned ? 'მოხსენი' : 'დააფიქსირე'}
          >
            {pinned ? <Pin size={14} strokeWidth={2.2} /> : <PinOff size={14} strokeWidth={2} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => {
            const visibleItems = section.items
              .map((item) => {
                if (statusOf(flags, item.flagKey) === 'hidden') return null;
                if (item.children) {
                  const kids = item.children.filter(
                    (c) => statusOf(flags, c.flagKey) !== 'hidden'
                  );
                  if (kids.length === 0 && item.children.length > 0) return null;
                  return {...item, children: kids};
                }
                return item;
              })
              .filter(Boolean) as NavItem[];
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
                    const active = item.href ? isChildActive(item.href) : false;
                    const groupHasActiveChild = !!item.children?.some((c) => isChildActive(c.href));
                    const itemStatus = statusOf(flags, item.flagKey);
                    const childTestCount = item.children?.filter((c) => statusOf(flags, c.flagKey) === 'test').length ?? 0;
                    const showTestBadge = itemStatus === 'test' || childTestCount > 0;
                    const rowBase =
                      'group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors w-full text-left';
                    const rowState = item.disabled
                      ? 'text-text-3 opacity-60 cursor-not-allowed'
                      : active || groupHasActiveChild
                      ? 'bg-blue-lt text-blue font-semibold'
                      : 'text-text-2 hover:bg-sur-2 hover:text-navy';

                    const iconColor =
                      item.key === 'favorites' ? 'text-ora' : '';

                    const rowInner = (
                      <>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${iconColor}`}>
                          <Icon
                            size={16}
                            strokeWidth={1.8}
                            fill={item.key === 'favorites' ? 'currentColor' : 'none'}
                          />
                        </span>
                        <span
                          className={`flex-1 truncate transition-opacity ${
                            expanded ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.disabled && expanded && (
                          <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-ora bg-ora-lt border border-ora-bd rounded-full px-1.5 py-0.5">
                            მალე
                          </span>
                        )}
                        {!item.disabled && showTestBadge && expanded && (
                          <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5" title="სატესტო რეჟიმი">
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
                            {item.label}{item.disabled ? ' · მალე' : ''}
                          </span>
                        )}
                      </>
                    );

                    return (
                      <li key={item.key}>
                        {item.action === 'register' ? (
                          <button
                            type="button"
                            onClick={() => setRegisterOpen(true)}
                            className={`${rowBase} ${rowState}`}
                          >
                            {rowInner}
                          </button>
                        ) : hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.key)}
                            className={`${rowBase} ${rowState}`}
                            aria-expanded={isOpen}
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
                              const cActive = isChildActive(child.href);
                              const cState = child.disabled
                                ? 'text-text-3 opacity-50 cursor-not-allowed'
                                : cActive
                                ? 'text-blue font-semibold bg-blue-lt'
                                : 'text-text-2 hover:bg-sur-2 hover:text-navy';
                              const cBase =
                                'flex h-8 items-center gap-2 rounded-md px-2.5 text-[12px] transition-colors';
                              const cIsTest = statusOf(flags, child.flagKey) === 'test';
                              const inner = (
                                <>
                                  <span className="flex-1 truncate">{child.label}</span>
                                  {cIsTest && (
                                    <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-[1px] font-mono text-[9px] font-semibold text-amber-700" title="სატესტო რეჟიმი">
                                      test
                                    </span>
                                  )}
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
              engineers.ge · v0.1.0
            </div>
          </div>
        )}
      </aside>
      <RegisterPromptModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </>
  );
}
