'use client';

import {
  HERO_OWNER_NAME,
  formatGel,
  formatOccupiedUntil,
  type HeroAdSlot,
  type HeroSlotKey
} from '@/lib/hero-ads';

type TileFrame = {
  key: HeroSlotKey | 'headline';
  x: number;
  y: number;
  width: number;
  height: number;
};

const COLS = {left: 272, cta: 266, stack: 244, hvac: 170, tall: 148} as const;
const ROWS = {top: 100, mid: 116, bottom: 140} as const;

const VIEWBOX_WIDTH = COLS.left + COLS.cta + COLS.stack + COLS.hvac + COLS.tall;
const VIEWBOX_HEIGHT = ROWS.top + ROWS.mid + ROWS.bottom;

const TILE_LAYOUT: TileFrame[] = [
  {key: 'headline', x: 0, y: 0, width: COLS.left, height: ROWS.top + ROWS.mid},
  {key: 'site', x: 0, y: ROWS.top + ROWS.mid, width: COLS.left, height: ROWS.bottom},
  {key: 'cta', x: COLS.left, y: 0, width: COLS.cta, height: VIEWBOX_HEIGHT},
  {key: 'slogan', x: COLS.left + COLS.cta, y: 0, width: COLS.stack, height: ROWS.top},
  {key: 'business', x: COLS.left + COLS.cta, y: ROWS.top, width: COLS.stack, height: ROWS.mid},
  {
    key: 'childhood',
    x: COLS.left + COLS.cta,
    y: ROWS.top + ROWS.mid,
    width: COLS.stack,
    height: ROWS.bottom
  },
  {
    key: 'b1',
    x: COLS.left + COLS.cta + COLS.stack,
    y: 0,
    width: COLS.hvac,
    height: ROWS.top + ROWS.mid
  },
  {
    key: 'b3',
    x: COLS.left + COLS.cta + COLS.stack,
    y: ROWS.top + ROWS.mid,
    width: COLS.hvac,
    height: ROWS.bottom
  },
  {
    key: 'b2',
    x: COLS.left + COLS.cta + COLS.stack + COLS.hvac,
    y: 0,
    width: COLS.tall,
    height: VIEWBOX_HEIGHT
  }
];

type Props = {
  slots: HeroAdSlot[];
  selectedKey: HeroSlotKey;
  previewImage?: string | null;
  onSelect?: (key: HeroSlotKey) => void;
};

export function HeroAdsOutline({slots, selectedKey, previewImage, onSelect}: Props) {
  const slotMap = new Map(slots.map((slot) => [slot.slot_key, slot]));

  return (
    <div className="w-full h-[320px] md:h-[400px]">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ads-outline-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(8,18,40,0.55)" />
          </linearGradient>
          <pattern
            id="ads-outline-hatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(29,78,216,0.12)" strokeWidth="1" />
          </pattern>
        </defs>

        {TILE_LAYOUT.map((frame) => {
          if (frame.key === 'headline') {
            return <HeadlineCell key="headline" frame={frame} />;
          }
          const slot = slotMap.get(frame.key);
          if (!slot) return null;
          const isSelected = selectedKey === frame.key;
          return (
            <OutlineCell
              key={frame.key}
              frame={frame}
              slot={slot}
              isSelected={isSelected}
              previewImage={isSelected ? previewImage ?? null : null}
              onSelect={onSelect}
            />
          );
        })}
      </svg>
    </div>
  );
}

function HeadlineCell({frame}: {frame: TileFrame}) {
  const padding = 4;
  const x = frame.x + padding;
  const y = frame.y + padding;
  const w = Math.max(0, frame.width - padding * 2);
  const h = Math.max(0, frame.height - padding * 2);
  const r = 12;
  const nameFs = Math.max(13, Math.min(20, w / 14));
  const titleFs = Math.max(10, Math.min(12, w / 22));
  const px = Math.max(12, Math.min(18, w * 0.05));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="rgba(12,26,54,0.92)"
        stroke="rgba(29,78,216,0.55)"
        strokeWidth={1.4}
      />
      <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="url(#ads-outline-hatch)" />
      <text
        x={x + px}
        y={y + 28}
        fill="rgba(184,208,240,0.85)"
        fontSize={10}
        fontWeight={700}
        style={{letterSpacing: '0.08em', textTransform: 'uppercase'}}
      >
        Owner · მესაკუთრე
      </text>
      <text
        x={x + px}
        y={y + h - (titleFs + 18)}
        fill="#fff"
        fontSize={nameFs}
        fontWeight={700}
        style={{letterSpacing: '-0.01em'}}
      >
        {HERO_OWNER_NAME}
      </text>
      <text
        x={x + px}
        y={y + h - 14}
        fill="rgba(255,255,255,0.78)"
        fontSize={titleFs}
        fontWeight={500}
      >
        engineers.ge · HVAC ინჟინერი
      </text>
    </g>
  );
}

type CellProps = {
  frame: TileFrame;
  slot: HeroAdSlot;
  isSelected: boolean;
  previewImage: string | null;
  onSelect?: (key: HeroSlotKey) => void;
};

function OutlineCell({frame, slot, isSelected, previewImage, onSelect}: CellProps) {
  const padding = 4;
  const x = frame.x + padding;
  const y = frame.y + padding;
  const w = Math.max(0, frame.width - padding * 2);
  const h = Math.max(0, frame.height - padding * 2);
  const r = 12;

  const stroke = isSelected ? 'rgb(37,99,235)' : 'rgba(37,99,235,0.55)';
  const strokeWidth = isSelected ? 2.2 : 1.5;
  const fill = previewImage ? 'transparent' : isSelected ? 'rgba(37,99,235,0.09)' : 'rgba(37,99,235,0.03)';

  const priceText = slot.price_gel > 0 ? `${formatGel(slot.price_gel)} ₾` : 'შეთანხმებით';
  const chipW = Math.max(70, priceText.length * 6.4 + 18);
  const chipH = 22;
  const chipX = x + w - chipW - 8;
  const chipY = y + 8;
  const promo = slot.promo_badge?.trim();
  const promoW = promo ? Math.max(48, promo.length * 6.2 + 18) : 0;
  const promoX = x + 8;
  const promoY = y + 8;

  const clipId = `ads-clip-${slot.slot_key}`;
  const busy = !!slot.occupied_until;
  const occupiedText = busy ? `დაკავებულია: ${formatOccupiedUntil(slot.occupied_until)}` : 'თავისუფალია';
  const occupiedW = Math.max(100, occupiedText.length * 5.8 + 18);
  const occupiedH = 20;
  const occupiedX = x + w - occupiedW - 8;
  const occupiedY = y + h - occupiedH - 8;

  const ownerFs = Math.max(8, Math.min(10, w / 26));

  const labelFs = Math.max(11, Math.min(15, w / 14));
  const subFs = Math.max(9, Math.min(11, w / 18));
  const px = Math.max(10, Math.min(16, w * 0.06));

  return (
    <g
      onClick={() => onSelect?.(slot.slot_key)}
      style={{cursor: 'pointer'}}
      role="button"
      aria-label={`არჩევა: ${slot.display_name}`}
    >
      {previewImage && (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x={x} y={y} width={w} height={h} rx={r} ry={r} />
            </clipPath>
          </defs>
          <image
            href={previewImage}
            x={x}
            y={y}
            width={w}
            height={h}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={r}
            ry={r}
            fill="url(#ads-outline-shade)"
            pointerEvents="none"
          />
        </>
      )}

      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={isSelected || previewImage ? '0' : '6 5'}
      />

      {promo && (
        <g pointerEvents="none">
          <rect
            x={promoX}
            y={promoY}
            width={promoW}
            height={20}
            rx={10}
            ry={10}
            fill="rgba(251,191,36,0.96)"
          />
          <text
            x={promoX + promoW / 2}
            y={promoY + 13}
            textAnchor="middle"
            fill="#7c2d12"
            fontSize={10}
            fontWeight={800}
          >
            {promo}
          </text>
        </g>
      )}

      {w > 92 && h > 44 && (
        <>
          <rect
            x={chipX}
            y={chipY}
            width={chipW}
            height={chipH}
            rx={11}
            ry={11}
            fill={previewImage ? 'rgba(8,18,40,0.45)' : 'rgba(239,246,255,0.95)'}
            stroke="rgb(37,99,235)"
            strokeWidth={1.4}
          />
          <text
            x={chipX + chipW / 2}
            y={chipY + chipH / 2 + 4}
            textAnchor="middle"
            fill={previewImage ? '#f4f8ff' : 'rgb(29,78,216)'}
            fontSize={10}
            fontWeight={700}
          >
            {priceText}
          </text>
          <text
            x={x + w - 8}
            y={chipY + chipH + 12}
            textAnchor="end"
            fill={previewImage ? 'rgba(232,241,253,0.92)' : 'rgba(29,78,216,0.75)'}
            fontSize={ownerFs}
            fontWeight={600}
          >
            {HERO_OWNER_NAME}
          </text>
        </>
      )}

      {w > 80 && h > 50 && (
        <>
          <text
            x={x + px}
            y={y + h - (subFs + occupiedH + 14)}
            fill={previewImage ? '#fff' : 'rgb(12,26,54)'}
            fontSize={labelFs}
            fontWeight={700}
            style={{letterSpacing: '0.01em'}}
          >
            {slot.display_name}
          </text>
          <text
            x={x + px}
            y={y + h - (occupiedH + 12)}
            fill={previewImage ? 'rgba(255,255,255,0.82)' : 'rgba(29,78,216,0.75)'}
            fontSize={subFs}
            fontWeight={500}
          >
            {slot.sublabel || slot.size_hint}
          </text>
        </>
      )}

      {w > 120 && (
        <>
          <rect
            x={occupiedX}
            y={occupiedY}
            width={occupiedW}
            height={occupiedH}
            rx={10}
            ry={10}
            fill={busy ? 'rgba(37,99,235,0.12)' : 'rgba(16,185,129,0.14)'}
            stroke={busy ? 'rgba(37,99,235,0.55)' : 'rgba(16,185,129,0.55)'}
            strokeWidth={1.1}
          />
          <text
            x={occupiedX + occupiedW / 2}
            y={occupiedY + occupiedH / 2 + 3}
            textAnchor="middle"
            fill={busy ? 'rgb(29,78,216)' : 'rgb(4,120,87)'}
            fontSize={9}
            fontWeight={700}
          >
            {occupiedText}
          </text>
        </>
      )}
    </g>
  );
}
