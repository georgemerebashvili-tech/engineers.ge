'use client';

import {Moon, Sun} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useTheme} from './theme-provider';

export function ThemeToggle() {
  const {isDark, toggleTheme} = useTheme();
  const t = useTranslations('theme');

  return (
    <button
      type="button"
      aria-label={isDark ? t('light') : t('dark')}
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-surface-alt transition-colors"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
