'use client';

import {useEffect, useState} from 'react';
import {
  HERO_OWNER_DEFAULTS,
  HERO_OWNER_NAME,
  getDefaultHeroAdSlots,
  type HeroAdSlot,
  type HeroOwner
} from '@/lib/hero-ads';

type Tile = {
  name: string;
  kind: 'headline' | 'photo';
  label?: string;
  sublabel?: string;
  img?: string;
  linkUrl?: string;
  accent?: string;
  adSlot?: boolean;
  priceGel?: number;
  occupiedUntil?: string | null;
  clientName?: string;
  ownerName?: string;
  promoBadge?: string;
  personalName?: string;
  personalTitle?: string;
  bio?: string;
};

type LightboxState = {img: string; label: string} | null;
type BioState = {name: string; title: string; bio: string; img?: string} | null;

const DEFAULT_SLOTS = getDefaultHeroAdSlots();

type TileFrame = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const COLS = {
  left: 272,
  cta: 266,
  stack: 244,
  hvac: 170,
  tall: 148
} as const;

const ROWS = {
  top: 100,
  mid: 116,
  bottom: 140
} as const;

const VIEWBOX_WIDTH = COLS.left + COLS.cta + COLS.stack + COLS.hvac + COLS.tall;
const VIEWBOX_HEIGHT = ROWS.top + ROWS.mid + ROWS.bottom;

const TILE_LAYOUT: TileFrame[] = [
  {name: 'headline', x: 0, y: 0, width: COLS.left, height: ROWS.top + ROWS.mid},
  {name: 'site', x: 0, y: ROWS.top + ROWS.mid, width: COLS.left, height: ROWS.bottom},
  {name: 'cta', x: COLS.left, y: 0, width: COLS.cta, height: VIEWBOX_HEIGHT},
  {name: 'slogan', x: COLS.left + COLS.cta, y: 0, width: COLS.stack, height: ROWS.top},
  {
    name: 'business',
    x: COLS.left + COLS.cta,
    y: ROWS.top,
    width: COLS.stack,
    height: ROWS.mid
  },
  {
    name: 'childhood',
    x: COLS.left + COLS.cta,
    y: ROWS.top + ROWS.mid,
    width: COLS.stack,
    height: ROWS.bottom
  },
  {
    name: 'b1',
    x: COLS.left + COLS.cta + COLS.stack,
    y: 0,
    width: COLS.hvac,
    height: ROWS.top + ROWS.mid
  },
  {
    name: 'b3',
    x: COLS.left + COLS.cta + COLS.stack,
    y: ROWS.top + ROWS.mid,
    width: COLS.hvac,
    height: ROWS.bottom
  },
  {
    name: 'b2',
    x: COLS.left + COLS.cta + COLS.stack + COLS.hvac,
    y: 0,
    width: COLS.tall,
    height: VIEWBOX_HEIGHT
  }
];

function buildTileMap(slots: HeroAdSlot[], owner: HeroOwner) {
  const byKey = new Map(slots.map((slot) => [slot.slot_key, slot]));
  const slot = (key: HeroAdSlot['slot_key']) => byKey.get(key) ?? DEFAULT_SLOTS.find((item) => item.slot_key === key)!;

  return {
    headline: {
      name: 'headline',
      kind: 'headline' as const,
      img: owner.image_url,
      personalName: owner.name,
      personalTitle: owner.title,
      bio: owner.bio
    },
    site: toPhotoTile(slot('site'), owner.name),
    cta: toPhotoTile(slot('cta'), owner.name),
    slogan: toPhotoTile(slot('slogan'), owner.name),
    business: toPhotoTile(slot('business'), owner.name),
    childhood: toPhotoTile(slot('childhood'), owner.name),
    b1: toPhotoTile(slot('b1'), owner.name),
    b2: toPhotoTile(slot('b2'), owner.name),
    b3: toPhotoTile(slot('b3'), owner.name)
  };
}

function toPhotoTile(slot: HeroAdSlot, ownerName: string): Tile {
  return {
    name: slot.slot_key,
    kind: 'photo',
    label: slot.label,
    sublabel: slot.sublabel,
    img: slot.image_url,
    linkUrl: slot.link_url,
    accent: 'var(--blue)',
    adSlot: slot.is_ad_slot,
    priceGel: slot.price_gel,
    occupiedUntil: slot.occupied_until,
    clientName: slot.client_name,
    ownerName: slot.client_name || ownerName,
    promoBadge: slot.promo_badge
  };
}

type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  payload?: Tile;
  kind?: Tile['kind'];
  label?: string;
  sublabel?: string;
  img?: string;
  linkUrl?: string;
  accent?: string;
  adSlot?: boolean;
  priceGel?: number;
  occupiedUntil?: string | null;
  ownerName?: string;
  promoBadge?: string;
  onOpen?: (state: LightboxState) => void;
  onBio?: (state: BioState) => void;
};

function Cell(props: CellProps) {
  const {x = 0, y = 0, width = 0, height = 0, depth = 0, onOpen, onBio} = props;

  if (depth !== 2 || width < 2 || height < 2) return null;

  const kind = props.kind ?? props.payload?.kind;
  const label = props.label ?? props.payload?.label ?? '';
  const sublabel = props.sublabel ?? props.payload?.sublabel ?? '';
  const img = props.img ?? props.payload?.img;
  const adSlot = props.adSlot ?? props.payload?.adSlot ?? false;
  const priceGel = props.priceGel ?? props.payload?.priceGel ?? 0;
  const occupiedUntil = props.occupiedUntil ?? props.payload?.occupiedUntil ?? null;
  const ownerName = props.ownerName ?? props.payload?.ownerName ?? HERO_OWNER_NAME;
  const promoBadge = (props.promoBadge ?? props.payload?.promoBadge ?? '').trim();

  const padding = 4;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerW = Math.max(0, width - padding * 2);
  const innerH = Math.max(0, height - padding * 2);
  const radius = 12;

  if (kind === 'headline') {
    const personalName = props.payload?.personalName ?? '';
    const personalTitle = props.payload?.personalTitle ?? '';
    const bioText = props.payload?.bio ?? '';
    const clipId = `clip-headline-${Math.round(x)}-${Math.round(y)}`;
    const nameFs = Math.max(13, Math.min(20, innerW / 14));
    const titleFs = Math.max(10, Math.min(12, innerW / 22));
    const px = Math.max(12, Math.min(18, innerW * 0.05));

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect
              x={innerX}
              y={innerY}
              width={innerW}
              height={innerH}
              rx={radius}
              ry={radius}
            />
          </clipPath>
        </defs>
        {img ? (
          <image
            href={img}
            x={innerX}
            y={innerY}
            width={innerW}
            height={innerH}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : (
          <rect
            x={innerX}
            y={innerY}
            width={innerW}
            height={innerH}
            rx={radius}
            ry={radius}
            fill="var(--sur)"
          />
        )}
        <rect
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          rx={radius}
          ry={radius}
          fill="url(#tile-shade)"
          pointerEvents="none"
        />
        <rect
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          rx={radius}
          ry={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
        {bioText && innerW > 80 && (() => {
          const btnW = 42;
          const btnH = 22;
          const bx = innerX + innerW - btnW - 8;
          const by = innerY + 8;
          return (
            <g
              onClick={(e) => {
                e.stopPropagation();
                onBio?.({
                  name: personalName,
                  title: personalTitle,
                  bio: bioText,
                  img
                });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onBio?.({
                    name: personalName,
                    title: personalTitle,
                    bio: bioText,
                    img
                  });
                }
              }}
              tabIndex={0}
              style={{cursor: 'pointer'}}
              role="button"
              aria-label={`ბიოგრაფია${personalName ? `: ${personalName}` : ''}`}
            >
              <rect
                x={bx}
                y={by}
                width={btnW}
                height={btnH}
                rx={11}
                ry={11}
                fill="rgba(0,0,0,0.55)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
              <text
                x={bx + btnW / 2}
                y={by + btnH / 2 + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize={11}
                fontWeight={600}
                style={{letterSpacing: '0.02em'}}
              >
                ბიო
              </text>
            </g>
          );
        })()}
        {innerW > 100 && innerH > 70 && (
          <>
            <text
              x={innerX + px}
              y={innerY + innerH - (personalTitle ? titleFs + 16 : 14)}
              fill="#fff"
              fontSize={nameFs}
              fontWeight={700}
              style={{letterSpacing: '-0.01em'}}
            >
              {personalName}
            </text>
            {personalTitle && (
              <text
                x={innerX + px}
                y={innerY + innerH - 12}
                fill="rgba(255,255,255,0.85)"
                fontSize={titleFs}
                fontWeight={500}
              >
                {personalTitle}
              </text>
            )}
          </>
        )}
      </g>
    );
  }

  if (kind === 'photo' && img) {
    const clipId = `clip-${label}-${Math.round(x)}-${Math.round(y)}`;
    const linkUrl = (props.linkUrl ?? props.payload?.linkUrl ?? '').trim();
    const handleClick = () => {
      if (linkUrl) {
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      onOpen?.({img, label});
    };
    const ariaLabel = linkUrl
      ? `გახსენი ბმული: ${label}`
      : `გახსენი დიდი ზომით: ${label}`;
    return (
      <g
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        style={{cursor: 'pointer'}}
        role="button"
        aria-label={ariaLabel}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={innerX} y={innerY} width={innerW} height={innerH} rx={radius} ry={radius} />
          </clipPath>
        </defs>
        <image
          href={img}
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
        <rect
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          rx={radius}
          ry={radius}
          fill="url(#tile-shade)"
          pointerEvents="none"
        />
        <rect
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          rx={radius}
          ry={radius}
          fill="none"
          stroke={adSlot ? 'rgba(184,208,240,0.95)' : 'rgba(255,255,255,0.15)'}
          strokeWidth={adSlot ? 1.6 : 1}
        />
        {innerW > 55 && innerH > 35 && (() => {
          const btn = 18;
          const by = innerY + 7;
          const bxZoom = innerX + 7;
          const c = 4;
          const k = btn - c;
          return (
            <>
              <g pointerEvents="none" opacity={0.9}>
                <rect x={bxZoom} y={by} width={btn} height={btn} rx={4} ry={4} fill="rgba(0,0,0,0.5)" />
                <path
                  d={`M ${bxZoom + c} ${by + c + 4} L ${bxZoom + c} ${by + c} L ${bxZoom + c + 4} ${by + c} M ${bxZoom + k - 4} ${by + c} L ${bxZoom + k} ${by + c} L ${bxZoom + k} ${by + c + 4} M ${bxZoom + c} ${by + k - 4} L ${bxZoom + c} ${by + k} L ${bxZoom + c + 4} ${by + k} M ${bxZoom + k - 4} ${by + k} L ${bxZoom + k} ${by + k} L ${bxZoom + k} ${by + k - 4}`}
                  stroke="#fff"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            </>
          );
        })()}
        {ownerName && innerW > 92 && innerH > 44 && (() => {
          const ownerFs = Math.max(8, Math.min(10, innerW / 26));
          return (
            <text
              x={innerX + innerW - 10}
              y={innerY + 18}
              textAnchor="end"
              fill="rgba(232,241,253,0.92)"
              fontSize={ownerFs}
              fontWeight={600}
            >
              {ownerName}
            </text>
          );
        })()}
        {promoBadge && innerW > 70 && innerH > 34 && (() => {
          const badgeW = Math.max(46, promoBadge.length * 6.2 + 16);
          return (
            <g pointerEvents="none">
              <rect
                x={innerX + 8}
                y={innerY + 8}
                width={badgeW}
                height={20}
                rx={10}
                ry={10}
                fill="rgba(251,191,36,0.96)"
              />
              <text
                x={innerX + 8 + badgeW / 2}
                y={innerY + 21}
                textAnchor="middle"
                fill="#7c2d12"
                fontSize={10}
                fontWeight={800}
              >
                {promoBadge}
              </text>
            </g>
          );
        })()}
        {innerW > 80 && innerH > 50 && (() => {
          const ls = Math.max(11, Math.min(15, innerW / 14));
          const ss = Math.max(9, Math.min(11, innerW / 18));
          const px = Math.max(10, Math.min(16, innerW * 0.06));
          return (
            <>
              <text
                x={innerX + px}
                y={innerY + innerH - (sublabel && innerH > 70 ? ss + 10 : 12)}
                fill="#fff"
                fontSize={ls}
                fontWeight={700}
                style={{letterSpacing: '0.01em'}}
              >
                {label}
              </text>
              {sublabel && innerH > 70 && (
                <text
                  x={innerX + px}
                  y={innerY + innerH - 8}
                  fill="rgba(255,255,255,0.8)"
                  fontSize={ss}
                >
                  {sublabel}
                </text>
              )}
            </>
          );
        })()}
      </g>
    );
  }
  return null;
}

export function HeroTreemap({
  slots = DEFAULT_SLOTS,
  owner = HERO_OWNER_DEFAULTS
}: {slots?: HeroAdSlot[]; owner?: HeroOwner}) {
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [bio, setBio] = useState<BioState>(null);
  const modalOpen = !!lightbox || !!bio;
  const tiles = buildTileMap(slots, owner);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
        setBio(null);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [modalOpen]);

  return (
    <>
      <div className="w-full h-[308px] md:h-[364px]">
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="tile-shade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
            </linearGradient>
          </defs>
          {TILE_LAYOUT.map((tile) => (
            <Cell
              key={tile.name}
              depth={2}
              payload={tiles[tile.name as keyof typeof tiles]}
              x={tile.x}
              y={tile.y}
              width={tile.width}
              height={tile.height}
              onOpen={setLightbox}
              onBio={setBio}
            />
          ))}
        </svg>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.label}
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-8"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="დახურვა"
            className="absolute top-4 right-4 md:top-6 md:right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
          <figure className="relative max-w-[min(1400px,92vw)] max-h-[88vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.img.replace(/w=\d+/, 'w=1800').replace(/q=\d+/, 'q=90')}
              alt={lightbox.label}
              loading="lazy"
              decoding="async"
              className="max-h-[80vh] w-auto rounded-lg shadow-2xl"
            />
            <figcaption className="text-white/90 text-sm font-medium">
              {lightbox.label}
            </figcaption>
          </figure>
        </div>
      )}

      {bio && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ბიოგრაფია"
          onClick={() => setBio(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 md:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[540px] rounded-2xl bg-sur shadow-2xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setBio(null)}
              aria-label="დახურვა"
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40 transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
            {bio.img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bio.img.replace(/w=\d+/, 'w=1200').replace(/q=\d+/, 'q=85')}
                alt={bio.name}
                loading="lazy"
                decoding="async"
                className="w-full h-64 object-cover"
              />
            )}
            <div className="p-6 md:p-7">
              <h2 className="text-xl md:text-2xl font-bold text-navy leading-tight">
                {bio.name}
              </h2>
              <p className="mt-1 text-sm text-text-2 font-medium">{bio.title}</p>
              <p className="mt-4 text-sm md:text-base text-text leading-relaxed whitespace-pre-line">
                {bio.bio}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
