export function ActorChip({name, maxWidth = '11rem'}: {name: string; maxWidth?: string}) {
  const display = name?.trim() || '—';
  const initial = display === '—' ? '?' : display.charAt(0).toUpperCase();

  // Chip is rendered as `flex` so the truncating text element actually shrinks
  // inside narrow td cells. `min-w-0` on both wrapper + inner span enables the
  // truncation. `maxWidth` clamps the overall chip width so it never bleeds
  // into the next column when the actor name is long.
  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-bdr bg-sur-2 px-2 py-0.5 text-[11px] text-text-2 align-middle"
      style={{maxWidth}}
      title={display}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-lt text-[9px] font-bold text-blue">
        {initial}
      </span>
      <span className="min-w-0 flex-1 truncate">{display}</span>
    </span>
  );
}
