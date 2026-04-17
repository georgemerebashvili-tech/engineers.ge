'use client';

import {useEffect, useState} from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';

const STORAGE_KEY = 'bg-tint';
const DEFAULT = 50;

export function BgSlider() {
  const [value, setValue] = useState<number>(DEFAULT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw === null ? DEFAULT : Number(raw);
    const clamped = Number.isFinite(saved) ? Math.min(100, Math.max(0, saved)) : DEFAULT;
    setValue(clamped);
    document.documentElement.style.setProperty('--bg-tint', String(clamped));
    setMounted(true);
  }, []);

  function onChange(_: Event, next: number | number[]) {
    const n = Array.isArray(next) ? next[0] : next;
    setValue(n);
    document.documentElement.style.setProperty('--bg-tint', String(n));
    localStorage.setItem(STORAGE_KEY, String(n));
  }

  return (
    <Box sx={{width: 90, display: 'flex', alignItems: 'center', px: 1}}>
      <Slider
        size="small"
        value={mounted ? value : DEFAULT}
        onChange={onChange}
        aria-label="ფონის ტონი"
        valueLabelDisplay="auto"
        sx={{
          color: 'var(--blue)',
          '& .MuiSlider-thumb': {
            width: 14,
            height: 14,
            backgroundColor: 'var(--blue)',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 0 6px color-mix(in srgb, var(--blue) 18%, transparent)'
            },
            '&.Mui-active': {
              boxShadow: '0 0 0 10px color-mix(in srgb, var(--blue) 22%, transparent)'
            }
          },
          '& .MuiSlider-rail': {
            opacity: 1,
            backgroundColor: 'var(--bdr)'
          },
          '& .MuiSlider-track': {
            border: 'none',
            backgroundColor: 'var(--blue)'
          }
        }}
      />
    </Box>
  );
}
