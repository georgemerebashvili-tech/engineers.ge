import type {LucideIcon} from 'lucide-react';

export type FeatureStatus = 'hidden' | 'active' | 'test';

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  external?: boolean;
  target?: '_self' | '_blank';
  icon: LucideIcon;
  description?: string;
  flagKey?: string;
  roles?: string[];
  badge?: string;
  exact?: boolean;
  action?: 'logout';
};

export type NavGroup = {
  id: string;
  title: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: NavItem[];
};
