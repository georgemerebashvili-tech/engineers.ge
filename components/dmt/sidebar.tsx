'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Pin,
  PinOff,
  FileText,
  Users,
  Package,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Facebook,
  Table2,
  TrendingUp,
  Palette,
  UsersRound,
  ScrollText,
  LayoutGrid,
  ClipboardCheck,
  Handshake,
  Building2,
  Boxes,
  type LucideIcon
} from 'lucide-react';

const PIN_KEY = 'dmt_sidebar_pinned';
const OPEN_KEY = 'dmt_sidebar_open_keys';

type NavChild = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
};

type NavItem = {
  key: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavChild[];
  requireRole?: 'owner' | 'admin+';
};

type NavSection = {
  title: string;
  items: NavItem[];
  requireRole?: 'owner' | 'admin+';
};

const SECTIONS: NavSection[] = [
  {
    title: 'მთავარი',
    items: [
      {key: 'overview', label: 'მიმოხილვა', href: '/dmt', icon: LayoutDashboard},
      {key: 'dashboards', label: 'დესკბორდები', href: '/dmt/dashboards', icon: LayoutGrid}
    ]
  },
  {
    title: 'ოპერაციები',
    items: [
      {
        key: 'leads',
        label: '1 · ლიდები',
        href: '/dmt/leads',
        icon: Users,
        badge: '47',
        children: [
          {key: 'leads-overview', label: 'Pipeline · მიმოხილვა', href: '/dmt/leads', icon: TrendingUp},
          {key: 'leads-fb', label: 'Facebook ლიდები', href: '/dmt/leads/facebook', icon: Facebook, badge: '18'},
          {key: 'leads-manual', label: 'ყველა ლიდი · grid', href: '/dmt/leads/manual', icon: Table2},
          {key: 'leads-negotiations', label: 'მოლაპარაკებები', href: '/dmt/leads?stage=negotiating', icon: Handshake}
        ]
      },
      {key: 'inspections', label: '2 · ინსპექტირება', href: '/dmt/inspections', icon: ClipboardCheck, badge: '6'},
      {key: 'invoices', label: '3 · ინვოისები', href: '/dmt/invoices', icon: FileText},
      {
        key: 'inventory',
        label: 'ინვენტარიზაცია',
        href: '/dmt/inventory',
        icon: Package,
        children: [
          {key: 'inv-objects', label: 'ობიექტები', href: '/dmt/inventory?tab=objects', icon: Building2},
          {key: 'inv-stock', label: 'მარაგი · SKU', href: '/dmt/inventory?tab=stock', icon: Boxes}
        ]
      }
    ]
  },
  {
    title: 'კონფიგურაცია',
    items: [
      {key: 'variables', label: 'ცვლადები', href: '/dmt/variables', icon: Palette},
      {key: 'users', label: 'მომხმარებლები', href: '/dmt/users', icon: UsersRound, requireRole: 'admin+'}
    ]
  },
  {
    title: 'უსაფრთხოება',
    requireRole: 'admin+',
    items: [
      {key: 'audit', label: 'audit log', href: '/dmt/audit', icon: ScrollText, requireRole: 'admin+'}
    ]
  },
  {
    title: 'სხვა',
    items: [
      {key: 'settings', label: 'პარამეტრები', href: '/dmt/settings', icon: Settings}
    ]
  }
];

type SidebarUser = {name: string; email: string; role: string};

export function DmtSidebar({user}: {user?: SidebarUser} = {}) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({leads: true});

  useEffect(() => {
    try {
      setPinned(localStorage.getItem(PIN_KEY) === '1');
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) setOpenKeys((prev) => ({...prev, ...JSON.parse(raw)}));
    } catch {}
    setHydrated(true);
  }, []);

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

  const role = user?.role || 'member';
  const isPrivileged = role === 'owner' || role === 'admin';
  const isOwner = role === 'owner';
  const canSee = (req?: 'owner' | 'admin+') => {
    if (!req) return true;
    if (req === 'owner') return isOwner;
    return isPrivileged;
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/dmt') return pathname === '/dmt';
    if (href === '/dmt/leads') return pathname === '/dmt/leads';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="დახურე sidebar"
          onClick={() => {
            setPinned(false);
            setHover(false);
          }}
          className="fixed inset-0 z-20 bg-navy/40 backdrop-blur-sm md:hidden"
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
          pinned
            ? 'sticky'
            : expanded
              ? 'fixed md:absolute md:left-0'
              : 'sticky'
        } top-0 z-30 flex h-screen flex-col border-r border-bdr bg-sur shadow-lg md:shadow-none transition-[width] duration-150 ease-out ${
          !pinned && hover ? 'md:shadow-xl' : ''
        }`}
        aria-expanded={expanded}
      >
        {/* Brand + pin */}
        <div
          className={`flex items-center border-b border-bdr px-2 py-3 ${
            expanded ? 'justify-between' : 'justify-center'
          }`}
        >
          <Link
            href="/dmt"
            className="inline-flex items-center gap-2"
            aria-label="DMT home"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white tracking-tight">
              D
            </span>
            {expanded && (
              <span className="truncate text-[14px] font-bold text-navy tracking-tight">
                DMT
              </span>
            )}
          </Link>
          {expanded && (
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
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.filter((s) => canSee(s.requireRole)).map((section) => {
            const visibleItems = section.items.filter((i) => canSee(i.requireRole));
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
                  const activeSelf = item.href ? isActive(item.href) : false;
                  const activeChild = item.children?.some((c) => isActive(c.href));
                  const rowBase =
                    'group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors w-full text-left';
                  const rowState =
                    activeSelf || activeChild
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
                      {item.badge && expanded && (
                        <span className="shrink-0 rounded-full bg-sur-2 px-1.5 py-[1px] font-mono text-[9.5px] font-semibold text-text-3 group-hover:bg-white">
                          {item.badge}
                        </span>
                      )}
                      {hasChildren && expanded && (
                        <ChevronRight
                          size={14}
                          strokeWidth={2}
                          className={`shrink-0 text-text-3 transition-transform ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        />
                      )}
                    </>
                  );
                  return (
                    <li key={item.key}>
                      {hasChildren && expanded ? (
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.key)}
                          className={`${rowBase} ${rowState}`}
                          aria-expanded={isOpen}
                        >
                          {rowInner}
                        </button>
                      ) : item.href ? (
                        <Link
                          href={item.href}
                          title={!expanded ? item.label : undefined}
                          className={`${rowBase} ${rowState}`}
                        >
                          {rowInner}
                        </Link>
                      ) : null}
                      {hasChildren && expanded && isOpen && (
                        <ul className="mt-0.5 space-y-0.5 pl-7">
                          {item.children!.map((c) => {
                            const CIcon = c.icon;
                            const cActive = isActive(c.href);
                            return (
                              <li key={c.key}>
                                <Link
                                  href={c.href}
                                  className={`flex h-8 items-center gap-2 rounded-md px-2 text-[12px] transition-colors ${
                                    cActive
                                      ? 'bg-blue-lt text-blue font-semibold'
                                      : 'text-text-2 hover:bg-sur-2 hover:text-navy'
                                  }`}
                                >
                                  {CIcon && (
                                    <CIcon
                                      size={13}
                                      strokeWidth={1.8}
                                      className="shrink-0"
                                    />
                                  )}
                                  <span className="flex-1 truncate">{c.label}</span>
                                  {c.badge && (
                                    <span className="rounded-full bg-sur-2 px-1.5 py-[1px] font-mono text-[9px] font-semibold text-text-3">
                                      {c.badge}
                                    </span>
                                  )}
                                </Link>
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

        {/* User + exit */}
        <div className="border-t border-bdr p-1.5">
          {user && (
            <div
              className={`mb-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 ${
                expanded ? 'bg-sur-2' : ''
              }`}
              title={!expanded ? `${user.name} · ${user.role}` : undefined}
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold uppercase text-white">
                {(user.name || user.email).trim()[0] || '?'}
              </span>
              {expanded && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] font-semibold text-navy">
                    {user.name || user.email}
                  </div>
                  <div className="truncate font-mono text-[9.5px] text-text-3">
                    {user.role}
                  </div>
                </div>
              )}
            </div>
          )}
          {user ? (
            <button
              onClick={async () => {
                await fetch('/api/dmt/auth/logout', {method: 'POST'});
                window.location.href = '/dmt/login';
              }}
              title={!expanded ? 'გასვლა' : undefined}
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-text-2 transition-colors hover:bg-sur-2 hover:text-red"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <LogOut size={16} strokeWidth={1.8} />
              </span>
              <span
                className={`flex-1 truncate transition-opacity text-left ${
                  expanded ? 'opacity-100' : 'opacity-0'
                }`}
              >
                გასვლა
              </span>
            </button>
          ) : (
            <Link
              href="/"
              title={!expanded ? 'engineers.ge-ზე დაბრუნება' : undefined}
              className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-text-2 transition-colors hover:bg-sur-2 hover:text-navy"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <LogOut size={16} strokeWidth={1.8} />
              </span>
              <span
                className={`flex-1 truncate transition-opacity ${
                  expanded ? 'opacity-100' : 'opacity-0'
                }`}
              >
                engineers.ge
              </span>
            </Link>
          )}
        </div>
      </aside>
      </div>
    </>
  );
}
