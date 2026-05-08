'use client';

import Link from 'next/link';
import {ExternalLink} from 'lucide-react';
import type {NavItem, FeatureStatus} from './sidebar.types';
import {SidebarTooltip} from './SidebarTooltip';

type SidebarItemProps = {
  item: NavItem;
  expanded: boolean;
  active: boolean;
  flagStatus: FeatureStatus;
  onLogout: () => void;
  onMobileClose: () => void;
};

const ROW_BASE =
  'group relative flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue';

const ROW_ACTIVE = 'bg-blue-lt text-blue font-semibold';
const ROW_DEFAULT = 'text-text-2 hover:bg-sur-2 hover:text-navy';

export function SidebarItem({
  item,
  expanded,
  active,
  flagStatus,
  onLogout,
  onMobileClose
}: SidebarItemProps) {
  const Icon = item.icon;

  const inner = (
    <>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      </span>

      {/* Label — hidden in collapsed mode via opacity so layout stays stable */}
      <span
        className={`flex-1 truncate transition-opacity duration-100 ${
          expanded ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {item.label}
      </span>

      {/* Test badge */}
      {flagStatus === 'test' && expanded && (
        <span
          className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-[1px] font-mono text-[9px] font-semibold text-amber-700"
          title="სატესტო რეჟიმი"
        >
          test
        </span>
      )}

      {/* Collapsed: amber dot for test items */}
      {flagStatus === 'test' && !expanded && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
      )}

      {/* External link icon */}
      {item.external && expanded && (
        <ExternalLink size={11} strokeWidth={1.8} className="shrink-0 text-text-3" aria-hidden="true" />
      )}

      {/* Tooltip — only in collapsed mode */}
      {!expanded && <SidebarTooltip label={item.label} />}
    </>
  );

  const rowClass = `${ROW_BASE} ${active ? ROW_ACTIVE : ROW_DEFAULT}`;

  // Action item (e.g. logout)
  if (item.action === 'logout') {
    return (
      <li>
        <button
          type="button"
          onClick={onLogout}
          className={rowClass}
          aria-label={item.label}
        >
          {inner}
        </button>
      </li>
    );
  }

  // External link
  if (item.external && item.href) {
    return (
      <li>
        <a
          href={item.href}
          target={item.target ?? '_blank'}
          rel="noopener noreferrer"
          className={rowClass}
          aria-label={item.label}
        >
          {inner}
        </a>
      </li>
    );
  }

  // Internal link
  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          onClick={onMobileClose}
          className={rowClass}
          aria-current={active ? 'page' : undefined}
        >
          {inner}
        </Link>
      </li>
    );
  }

  return null;
}
