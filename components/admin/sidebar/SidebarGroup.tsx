'use client';

import {ChevronRight} from 'lucide-react';
import {SidebarItem} from './SidebarItem';
import {SidebarTooltip} from './SidebarTooltip';
import {isRouteActive, groupHasActiveChild, getItemFlagStatus} from './sidebar.utils';
import type {NavGroup} from './sidebar.types';
import type {FeatureMap} from '@/lib/feature-flags';

type SidebarGroupProps = {
  group: NavGroup;
  expanded: boolean;
  pathname: string;
  hash: string;
  openGroups: Set<string>;
  flags?: FeatureMap;
  onToggleGroup: (id: string) => void;
  onLogout: () => void;
  onMobileClose: () => void;
};

export function SidebarGroup({
  group,
  expanded,
  pathname,
  hash,
  openGroups,
  flags = {},
  onToggleGroup,
  onLogout,
  onMobileClose
}: SidebarGroupProps) {
  const isOpen = !group.collapsible || openGroups.has(group.id);
  const hasActiveChild = groupHasActiveChild(group, pathname, hash);

  // In collapsed mode, render items as flat icons (no group header)
  if (!expanded) {
    return (
      <div className="mb-1 px-1.5">
        {/* Group section divider in collapsed mode */}
        {group.id !== 'main' && (
          <div className="my-1 mx-2 border-t border-bdr" />
        )}
        <ul className="space-y-0.5">
          {group.items.map((item) => {
            const flagStatus = getItemFlagStatus(flags, item.flagKey);
            const active = isRouteActive(pathname, item, hash);
            return (
              <SidebarItem
                key={item.id}
                item={item}
                expanded={false}
                active={active}
                flagStatus={flagStatus}
                onLogout={onLogout}
                onMobileClose={onMobileClose}
              />
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-1">
      {/* Group header */}
      {group.collapsible ? (
        <button
          type="button"
          onClick={() => onToggleGroup(group.id)}
          aria-expanded={isOpen}
          className={`group relative flex w-full items-center gap-1 px-3 pb-1 pt-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue ${
            hasActiveChild && !isOpen ? 'text-blue' : 'text-text-3 hover:text-text-2'
          }`}
        >
          <span className="flex-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em]">
            {group.title}
          </span>
          <ChevronRight
            size={11}
            strokeWidth={2.5}
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <div className="px-3 pb-1 pt-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-3">
          {group.title}
        </div>
      )}

      {/* Items */}
      {isOpen && (
        <ul className="space-y-0.5 px-1.5">
          {group.items.map((item) => {
            const flagStatus = getItemFlagStatus(flags, item.flagKey);
            const active = isRouteActive(pathname, item, hash);
            return (
              <SidebarItem
                key={item.id}
                item={item}
                expanded={true}
                active={active}
                flagStatus={flagStatus}
                onLogout={onLogout}
                onMobileClose={onMobileClose}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
