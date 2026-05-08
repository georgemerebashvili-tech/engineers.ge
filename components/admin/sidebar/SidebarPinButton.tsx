import {Pin, PinOff} from 'lucide-react';

type SidebarPinButtonProps = {
  pinned: boolean;
  onToggle: () => void;
};

export function SidebarPinButton({pinned, onToggle}: SidebarPinButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue ${
        pinned
          ? 'border-ora-bd bg-ora-lt text-ora'
          : 'border-bdr bg-sur-2 text-text-3 hover:border-bdr-2 hover:text-navy'
      }`}
      aria-label={pinned ? 'Unpin sidebar (keep expanded)' : 'Pin sidebar (keep expanded)'}
      aria-pressed={pinned}
    >
      {pinned ? <Pin size={14} strokeWidth={2.2} /> : <PinOff size={14} strokeWidth={2} />}
    </button>
  );
}
