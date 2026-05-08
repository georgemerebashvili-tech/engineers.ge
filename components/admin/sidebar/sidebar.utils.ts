import type {NavGroup, NavItem, FeatureStatus} from './sidebar.types';
import type {FeatureMap} from '@/lib/feature-flags';

export function isRouteActive(
  pathname: string,
  item: NavItem,
  currentHash?: string
): boolean {
  if (!item.href || item.external || item.action) return false;
  const [itemPath, itemHash] = item.href.split('#');
  if (itemHash !== undefined) {
    return pathname === itemPath && currentHash === `#${itemHash}`;
  }
  if (item.exact) return pathname === itemPath;
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

export function groupHasActiveChild(
  group: NavGroup,
  pathname: string,
  currentHash?: string
): boolean {
  return group.items.some((item) => isRouteActive(pathname, item, currentHash));
}

export function getItemFlagStatus(
  flags: FeatureMap,
  flagKey?: string
): FeatureStatus {
  if (!flagKey) return 'active';
  return (flags[flagKey] as FeatureStatus | undefined) ?? 'active';
}

export function filterNavByFeatureFlags(
  groups: NavGroup[],
  flags: FeatureMap
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => getItemFlagStatus(flags, item.flagKey) !== 'hidden'
      )
    }))
    .filter((group) => group.items.length > 0);
}

export function filterNavByPermissions(
  groups: NavGroup[],
  userRole?: string
): NavGroup[] {
  if (!userRole) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles?.length || item.roles.includes(userRole)
      )
    }))
    .filter((group) => group.items.length > 0);
}

export function getVisibleNavGroups(
  groups: NavGroup[],
  flags: FeatureMap,
  userRole?: string
): NavGroup[] {
  return filterNavByPermissions(filterNavByFeatureFlags(groups, flags), userRole);
}
