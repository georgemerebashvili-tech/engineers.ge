'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

const TINT_KEY = 'bg-tint';
const LAST_LIGHT_KEY = 'bg-tint-last-light';
const LAST_DARK_KEY = 'bg-tint-last-dark';
// Hysteresis: dark→light requires crossing UP threshold, light→dark requires
// crossing DOWN threshold. Prevents dark/light flipping when the slider sits
// near the midpoint and the user jitters their mouse.
const DARK_THRESHOLD_DOWN = 45;
const DARK_THRESHOLD_UP = 55;
const DARK_THRESHOLD = 50; // neutral boundary for first-load + toggleTheme fallbacks
const DEFAULT_LIGHT = 80;
const DEFAULT_DARK = 20;

type Ctx = {
  tint: number;
  isDark: boolean;
  setTint: (n: number) => void;
  toggleTheme: () => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function resolveMode(tint: number, wasDark: boolean | null): boolean {
  // First paint (no prior class): strict rule.
  if (wasDark === null) return tint < DARK_THRESHOLD;
  // In dead zone: keep current mode.
  if (tint >= DARK_THRESHOLD_DOWN && tint <= DARK_THRESHOLD_UP) return wasDark;
  // Outside dead zone: hard decide.
  return tint < DARK_THRESHOLD_DOWN;
}

function apply(tint: number) {
  const r = document.documentElement;
  const wasDark = r.classList.contains('dark');
  const dark = resolveMode(tint, wasDark);
  // Clamp the CSS variable to the valid half of the range for the active mode
  // so color-mix() never produces negative or >100% values inside the dead zone.
  const cssTint = dark ? Math.min(tint, 49) : Math.max(tint, 50);
  r.style.setProperty('--bg-tint', String(cssTint));
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
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? false
      : readStored() < DARK_THRESHOLD
  );

  useEffect(() => {
    apply(tint);
    // Keep React state in sync with the class we actually wrote to <html>.
    const nextDark = document.documentElement.classList.contains('dark');
    if (nextDark !== isDark) setIsDark(nextDark);
    try {
      localStorage.setItem(TINT_KEY, String(tint));
      // Persist per-mode last value so toggleTheme can restore it.
      const key = nextDark ? LAST_DARK_KEY : LAST_LIGHT_KEY;
      localStorage.setItem(key, String(tint));
    } catch {}
  }, [tint, isDark]);

  const setTint = useCallback((n: number) => {
    setTintState(Math.min(100, Math.max(0, Math.round(n))));
  }, []);

  const toggleTheme = useCallback(() => {
    // Use the DOM class as the source of truth instead of comparing tint — with
    // hysteresis it's possible for tint to sit in the dead zone (45-55) while
    // the active mode is determined by history, not the raw number.
    const currentlyDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');
    const goingToLight = currentlyDark;
    const storedKey = goingToLight ? LAST_LIGHT_KEY : LAST_DARK_KEY;
    const fallback = goingToLight ? DEFAULT_LIGHT : DEFAULT_DARK;
    setTintState(() => {
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

export const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('${TINT_KEY}');var t=raw===null?${DEFAULT_LIGHT}:Number(raw);if(!isFinite(t))t=${DEFAULT_LIGHT};t=Math.min(100,Math.max(0,t));var r=document.documentElement;var d=t<${DARK_THRESHOLD};r.style.setProperty('--bg-tint',String(d?Math.min(t,49):Math.max(t,50)));if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
