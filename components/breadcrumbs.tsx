import Link from 'next/link';
import {ChevronRight, Home} from 'lucide-react';

export type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
  className?: string;
};

/**
 * Minimal breadcrumb trail. Renders a single-line chain:
 *   Home > category > … > current
 * The last item has no href (is the current page). Intermediate items with
 * `href` are rendered as <Link>, others as plain spans.
 */
export function Breadcrumbs({items, className}: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={
        'flex items-center gap-1 text-[11px] font-medium text-text-3 overflow-x-auto whitespace-nowrap ' +
        (className || '')
      }
    >
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-text-3 hover:text-blue transition-colors"
      >
        <Home size={12} />
        <span className="sr-only">მთავარი</span>
      </Link>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight size={11} className="text-bdr-2 shrink-0" />
          {it.href ? (
            <Link
              href={it.href}
              className="text-text-3 hover:text-blue transition-colors"
            >
              {it.label}
            </Link>
          ) : (
            <span className="text-navy font-semibold">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
