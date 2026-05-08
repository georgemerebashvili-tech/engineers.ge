'use client';

import {useEffect, useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, PanelLeftClose} from 'lucide-react';
import {useSidebarState} from './useSidebarState';
import {SidebarGroup} from './SidebarGroup';
import {SidebarPinButton} from './SidebarPinButton';
import {SidebarMobileToggle} from './SidebarMobileToggle';
import {NAV_GROUPS} from './sidebar.config';
import {getVisibleNavGroups} from './sidebar.utils';
import type {FeatureMap} from '@/lib/feature-flags';

type AdminSidebarProps = {
  flags?: FeatureMap;
  userRole?: string;
};

export function AdminSidebar({flags = {}, userRole}: AdminSidebarProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  const {
    hydrated,
    pinned,
    hover,
    mobileOpen,
    expanded,
    openGroups,
    setHover,
    setPinned,
    setMobileOpen,
    toggleGroup,
    collapse
  } = useSidebarState();

  // Track hash for hash-based route matching
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

  // Close mobile sidebar on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, setMobileOpen]);

  async function handleLogout() {
    await fetch('/api/admin/logout', {method: 'POST'});
    // Full reload to flush admin session state — intentional.
    window.location.href = '/admin';
  }

  const visibleGroups = getVisibleNavGroups(NAV_GROUPS, flags, userRole);

  const navContent = (forceExpanded: boolean) =>
    visibleGroups.map((group) => (
      <SidebarGroup
        key={group.id}
        group={group}
        expanded={forceExpanded}
        pathname={pathname ?? ''}
        hash={hash}
        openGroups={openGroups}
        flags={flags}
        onToggleGroup={toggleGroup}
        onLogout={handleLogout}
        onMobileClose={() => setMobileOpen(false)}
      />
    ));

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────── */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-navy/40 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ── Mobile floating toggle ───────────────────────────────── */}
      {!mobileOpen && (
        <div className="fixed bottom-4 left-4 z-40 md:hidden">
          <SidebarMobileToggle onClick={() => setMobileOpen(true)} />
        </div>
      )}

      {/* ── Mobile sidebar (full overlay) ───────────────────────── */}
      <aside
        style={{transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}}
        className="fixed left-0 top-0 z-30 flex h-full w-[240px] flex-col border-r border-bdr bg-sur pt-14 shadow-xl transition-transform duration-150 ease-out md:hidden"
        aria-label="Admin navigation"
        aria-hidden={!mobileOpen}
      >
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Admin menu">
          {navContent(true)}
        </nav>
        <div className="border-t border-bdr px-3 py-2">
          <div className="font-mono text-[9px] text-text-3">admin · engineers.ge</div>
        </div>
      </aside>

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      {/*
        Outer div: reserves space in flex layout.
        Width = pinned ? 240px : 56px (collapsed slot).
        Inner aside: actual sidebar, can overlap content when hover-expanded.
      */}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{width: hydrated && pinned ? 240 : 56}}
        className="relative hidden shrink-0 transition-[width] duration-150 ease-out md:block"
      >
        <aside
          style={{width: expanded ? 240 : 56}}
          className={`sticky top-[calc(3.5rem+1.5rem)] md:top-[calc(4rem+1.5rem)] z-30 flex h-[calc(100vh-5rem)] md:h-[calc(100vh-5.5rem)] flex-col border-r border-bdr bg-sur transition-[width] duration-150 ease-out ${
            hover && !pinned ? 'shadow-xl' : ''
          }`}
          aria-label="Admin navigation"
          aria-expanded={expanded}
        >
          {/* Header */}
          <div
            className={`flex items-center border-b border-bdr px-2 py-2.5 ${
              expanded ? 'justify-between' : 'justify-center'
            }`}
          >
            {expanded && (
              <Link
                href="/dashboard"
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold text-text-2 transition-colors hover:bg-sur-2 hover:text-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={14} />
                <span>dashboard</span>
              </Link>
            )}
            <div className="flex items-center gap-1">
              {expanded && (
                <button
                  type="button"
                  onClick={collapse}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr bg-sur-2 text-text-3 transition-colors hover:border-bdr-2 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose size={14} />
                </button>
              )}
              <SidebarPinButton pinned={pinned} onToggle={() => setPinned(!pinned)} />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2" aria-label="Admin menu">
            {navContent(expanded)}
          </nav>

          {/* Footer */}
          {expanded && (
            <div className="border-t border-bdr px-3 py-2">
              <div className="font-mono text-[9px] text-text-3">admin · engineers.ge</div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
