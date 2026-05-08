type SidebarTooltipProps = {
  label: string;
};

// Rendered inside a `group` parent — appears on hover with 200ms delay.
// Only mount this when the sidebar is collapsed (caller's responsibility).
export function SidebarTooltip({label}: SidebarTooltipProps) {
  return (
    <span
      role="tooltip"
      style={{transitionDelay: '200ms'}}
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-navy px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
    >
      {label}
    </span>
  );
}
