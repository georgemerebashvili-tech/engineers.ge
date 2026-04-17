'use client';

import {useTheme} from 'next-themes';
import {useEffect, useState} from 'react';
import {Moon, Sun} from 'lucide-react';
import {useTranslations} from 'next-intl';

export function ThemeToggle() {
  const {theme, setTheme, resolvedTheme} = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('theme');

  useEffect(() => setMounted(true), []);

  const current = mounted ? resolvedTheme : undefined;
  const isDark = current === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? t('light') : t('dark')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-surface-alt transition-colors"
    >
      {mounted && isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
