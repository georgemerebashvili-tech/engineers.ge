'use client';

import {Treemap, ResponsiveContainer} from 'recharts';

type Tile = {
  name: string;
  size: number;
  kind: 'headline' | 'photo' | 'slogan' | 'banner';
  label?: string;
  sublabel?: string;
  img?: string;
  accent?: string;
  children?: Tile[];
};

/* Placeholder images (replace with real personal photos later). */
const DATA: Tile[] = [
  {
    name: 'anchor',
    size: 0,
    kind: 'headline',
    children: [
      {
        name: 'headline',
        size: 600,
        kind: 'headline'
      },
      {
        name: 'site',
        size: 400,
        kind: 'photo',
        label: 'ობიექტზე',
        sublabel: 'ინჟინერია ველზე',
        img: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=70'
      },
      {
        name: 'cta',
        size: 1000,
        kind: 'photo',
        label: 'კალკულატორები',
        sublabel: '7 ინსტრუმენტი · უფასო',
        img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=70',
        accent: 'var(--blue)'
      }
    ]
  },
  {
    name: 'brand',
    size: 0,
    kind: 'banner',
    children: [
      {
        name: 'slogan',
        size: 360,
        kind: 'photo',
        label: 'ინჟინერია.',
        sublabel: 'ქართულად · ზუსტად',
        img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=70'
      },
      {
        name: 'business',
        size: 320,
        kind: 'photo',
        label: 'ბიზნესი',
        sublabel: 'საინჟინრო სამუშაოზე',
        img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&q=70'
      },
      {
        name: 'childhood',
        size: 280,
        kind: 'photo',
        label: 'ბავშვობა',
        sublabel: 'საწყისი',
        img: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=70'
      },
      {
        name: 'b1',
        size: 240,
        kind: 'photo',
        label: 'HVAC',
        sublabel: 'გათბობა · გაგრილება',
        img: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=900&q=70',
        accent: 'var(--blue)'
      },
      {
        name: 'b2',
        size: 210,
        kind: 'photo',
        label: 'თბოდანაკარგი',
        sublabel: 'EN 12831',
        img: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=900&q=70',
        accent: 'var(--ora)'
      },
      {
        name: 'b3',
        size: 180,
        kind: 'photo',
        label: 'იზოლაცია',
        sublabel: 'ISO 6946',
        img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=70',
        accent: 'var(--grn)'
      }
    ]
  }
];

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
  accent?: string;
};

function Cell(props: CellProps) {
  const {x = 0, y = 0, width = 0, height = 0, depth = 0} = props;

  if (depth !== 2 || width < 2 || height < 2) return null;

  const kind = props.kind ?? props.payload?.kind;
  const label = props.label ?? props.payload?.label ?? '';
  const sublabel = props.sublabel ?? props.payload?.sublabel ?? '';
  const img = props.img ?? props.payload?.img;
  const accent = props.accent ?? props.payload?.accent ?? 'var(--navy)';

  const padding = 5;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerW = Math.max(0, width - padding * 2);
  const innerH = Math.max(0, height - padding * 2);
  const radius = 12;

  if (kind === 'headline') {
    /* Font-size scales with cell's actual width — fits 3 Georgian lines without overflow.
     * Height also caps it so tall-narrow cells don't render oversized text. */
    const maxByWidth = innerW / 8.2;
    const maxByHeight = innerH / 4.2;
    const titleSize = Math.max(14, Math.min(48, maxByWidth, maxByHeight));
    const pad = Math.max(10, Math.min(28, innerW * 0.045));
    return (
      <g>
        <rect
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          rx={radius}
          ry={radius}
          fill="var(--sur)"
          stroke="var(--bdr)"
          strokeWidth={1}
        />
        {innerW > 120 && innerH > 70 && (
          <foreignObject x={innerX} y={innerY} width={innerW} height={innerH}>
            <div
              style={{
                width: '100%',
                height: '100%',
                padding: pad,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  fontSize: titleSize,
                  lineHeight: 1.05,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--navy)'
                }}
              >
                საინჟინრო
                <br />
                ხელსაწყოები
                <br />
                <span style={{color: 'var(--blue)'}}>ერთ ინტერფეისში.</span>
              </div>
            </div>
          </foreignObject>
        )}
      </g>
    );
  }

  if (kind === 'photo' && img) {
    const clipId = `clip-${label}-${Math.round(x)}-${Math.round(y)}`;
    return (
      <g>
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
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
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

  const bg =
    kind === 'slogan'
      ? 'var(--navy)'
      : `color-mix(in srgb, ${accent} 14%, var(--sur))`;
  const fg = kind === 'slogan' ? '#fff' : accent;

  const labelSize = Math.max(
    10,
    Math.min(
      kind === 'slogan' ? 24 : 16,
      innerW / (kind === 'slogan' ? 7 : 8),
      innerH / 4
    )
  );
  const subSize = Math.max(9, Math.min(12, innerW / 14));
  const padX = Math.max(10, Math.min(18, innerW * 0.08));

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        rx={radius}
        ry={radius}
        fill={bg}
        stroke={`color-mix(in srgb, ${accent} 30%, transparent)`}
        strokeWidth={1}
      />
      {innerW > 70 && innerH > 40 && (
        <>
          <text
            x={innerX + padX}
            y={innerY + innerH / 2 - (sublabel ? 4 : -labelSize / 3)}
            fill={fg}
            fontSize={labelSize}
            fontWeight={800}
            style={{letterSpacing: '0.01em'}}
          >
            {label}
          </text>
          {sublabel && (
            <text
              x={innerX + padX}
              y={innerY + innerH / 2 + subSize + 2}
              fill={kind === 'slogan' ? 'rgba(255,255,255,0.75)' : 'var(--text-3)'}
              fontSize={subSize}
            >
              {sublabel}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function HeroTreemap() {
  return (
    <div className="w-full h-[308px] md:h-[364px]">
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="tile-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={DATA}
          dataKey="size"
          aspectRatio={16 / 9}
          stroke="transparent"
          fill="transparent"
          isAnimationActive={false}
          content={<Cell />}
        />
      </ResponsiveContainer>
    </div>
  );
}
