import {Menu} from 'lucide-react';

type SidebarMobileToggleProps = {
  onClick: () => void;
};

export function SidebarMobileToggle({onClick}: SidebarMobileToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:bg-sur-2 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue md:hidden"
      aria-label="Open navigation menu"
    >
      <Menu size={16} strokeWidth={2} />
    </button>
  );
}
