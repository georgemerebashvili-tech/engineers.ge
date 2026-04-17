'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';

export type Banner = {
  id: string;
  image_url: string;
  link_url?: string | null;
  alt?: string | null;
};

type Props = {
  banners: Banner[];
  intervalMs?: number;
};

export function BannerCarousel({banners, intervalMs = 5000}: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setI((x) => (x + 1) % banners.length), intervalMs);
    return () => clearInterval(id);
  }, [banners.length, intervalMs]);

  if (!banners.length) {
    return (
      <div className="aspect-[16/6] w-full rounded-2xl bg-surface-alt border flex items-center justify-center text-fg-muted">
        No banners
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border aspect-[16/6]">
      {banners.map((b, idx) => {
        const content = (
          <Image
            src={b.image_url}
            alt={b.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 1152px"
            className="object-cover"
            priority={idx === 0}
          />
        );
        return (
          <div
            key={b.id}
            className="absolute inset-0 transition-opacity duration-500"
            style={{opacity: idx === i ? 1 : 0}}
            aria-hidden={idx !== i}
          >
            {b.link_url ? (
              <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                {content}
              </a>
            ) : (
              content
            )}
          </div>
        );
      })}

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === i ? 'w-6 bg-white' : 'w-2 bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
