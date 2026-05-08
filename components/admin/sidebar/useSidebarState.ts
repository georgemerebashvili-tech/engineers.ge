'use client';

import {useState, useEffect, useCallback} from 'react';
import {DEFAULT_OPEN_GROUPS} from './sidebar.config';

const PINNED_KEY = 'sazeo.admin.sidebar.pinned';
const GROUPS_KEY = 'sazeo.admin.sidebar.openGroups';

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function useSidebarState() {
  const [hydrated, setHydrated] = useState(false);
  const [pinned, setPinnedState] = useState(false);
  const [hover, setHover] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroupsState] = useState<Set<string>>(
    new Set(DEFAULT_OPEN_GROUPS)
  );

  useEffect(() => {
    const storedPinned = safeRead(PINNED_KEY);
    if (storedPinned === 'true') setPinnedState(true);

    const storedGroups = safeRead(GROUPS_KEY);
    if (storedGroups) {
      try {
        const arr = JSON.parse(storedGroups) as string[];
        if (Array.isArray(arr)) {
          setOpenGroupsState(new Set([...DEFAULT_OPEN_GROUPS, ...arr]));
        }
      } catch {}
    }
    setHydrated(true);
  }, []);

  const setPinned = useCallback((next: boolean) => {
    setPinnedState(next);
    safeWrite(PINNED_KEY, String(next));
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroupsState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      safeWrite(GROUPS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const collapse = useCallback(() => {
    setPinned(false);
    setHover(false);
    // Close all groups except defaults on explicit collapse
    setOpenGroupsState(new Set(DEFAULT_OPEN_GROUPS));
    safeWrite(GROUPS_KEY, JSON.stringify(DEFAULT_OPEN_GROUPS));
  }, [setPinned]);

  // expanded: only after hydration to avoid SSR mismatch
  const expanded = hydrated && (pinned || hover);

  return {
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
  };
}
