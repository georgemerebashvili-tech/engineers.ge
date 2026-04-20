'use client';

import {useTheme} from './theme-provider';

export function BgSlider() {
  const {tint, setTint} = useTheme();
  return (
    <div className="hidden w-14 items-center px-1 sm:flex sm:w-16 md:w-[90px]">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={tint}
        onChange={(e) => setTint(Number(e.target.value))}
        aria-label="სიკაშკაშე"
        title="სიკაშკაშე — slide for brightness, left half = dark mode"
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bdr accent-blue [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue"
      />
    </div>
  );
}
