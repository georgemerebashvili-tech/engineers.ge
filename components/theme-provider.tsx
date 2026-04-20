'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

const TINT_KEY = 'bg-tint';
const LAST_LIGHT_KEY = 'bg-tint-last-light';
const LAST_DARK_KEY = 'bg-tint-last-dark';
const DARK_THRESHOLD = 50;
const DEFAULT_LIGHT = 80;
const DEFAULT_DARK = 20;

type Ctx = {
  tint: number;
  isDark: boolean;
  setTint: (n: number) => void;
  toggleTheme: () => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function apply(tint: number) {
  const r = document.documentElement;
  r.style.setProperty('--bg-tint', String(tint));
  const dark = tint < DARK_THRESHOLD;
  r.classList.toggle('dark', dark);
  r.style.colorScheme = dark ? 'dark' : 'light';
}

function readStored(): number {
  try {
    const raw = localStorage.getItem(TINT_KEY);
    if (raw === null) return DEFAULT_LIGHT;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_LIGHT;
    return Math.min(100, Math.max(0, n));
  } catch {
    return DEFAULT_LIGHT;
  }
}

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [tint, setTintState] = useState<number>(() =>
    typeof window === 'undefined' ? DEFAULT_LIGHT : readStored()
  );

  useEffect(() => {
    apply(tint);
    try {
      localStorage.setItem(TINT_KEY, String(tint));
      const key = tint < DARK_THRESHOLD ? LAST_DARK_KEY : LAST_LIGHT_KEY;
      localStorage.setItem(key, String(tint));
    } catch {}
  }, [tint]);

  const setTint = useCallback((n: number) => {
    setTintState(Math.min(100, Math.max(0, Math.round(n))));
  }, []);

  const toggleTheme = useCallback(() => {
    setTintState((prev) => {
      const goingToLight = prev < DARK_THRESHOLD;
      const storedKey = goingToLight ? LAST_LIGHT_KEY : LAST_DARK_KEY;
      const fallback = goingToLight ? DEFAULT_LIGHT : DEFAULT_DARK;
      try {
        const raw = localStorage.getItem(storedKey);
        if (raw !== null) {
          const n = Number(raw);
          if (Number.isFinite(n)) {
            const clamped = Math.min(100, Math.max(0, n));
            const inCorrectZone = goingToLight
              ? clamped >= DARK_THRESHOLD
              : clamped < DARK_THRESHOLD;
            if (inCorrectZone) return clamped;
          }
        }
      } catch {}
      return fallback;
    });
  }, []);

  const isDark = tint < DARK_THRESHOLD;
  const value = useMemo<Ctx>(
    () => ({tint, isDark, setTint, toggleTheme}),
    [tint, isDark, setTint, toggleTheme]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const v = useContext(ThemeCtx);
  if (!v) {
    return {tint: DEFAULT_LIGHT, isDark: false, setTint: () => {}, toggleTheme: () => {}};
  }
  return v;
}

export const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('${TINT_KEY}');var t=raw===null?${DEFAULT_LIGHT}:Number(raw);if(!isFinite(t))t=${DEFAULT_LIGHT};t=Math.min(100,Math.max(0,t));var r=document.documentElement;r.style.setProperty('--bg-tint',String(t));var d=t<${DARK_THRESHOLD};if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
