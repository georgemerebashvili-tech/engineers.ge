import Link from 'next/link';

type Crumb = {label: string; href?: string};

export function AdminPageHeader({
  crumbs,
  title,
  description,
  actions
}: {
  crumbs: Crumb[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="border-b border-bdr bg-sur py-6">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <nav
          aria-label="breadcrumb"
          className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-3"
        >
          <Link href="/dashboard" className="hover:text-blue transition-colors">
            Dashboard
          </Link>
          <span>·</span>
          <Link href="/admin/stats" className="hover:text-blue transition-colors">
            Admin
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span>·</span>
              {c.href ? (
                <Link href={c.href} className="hover:text-blue transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className="text-navy">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-[12px] text-text-2">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

export function AdminSection({children}: {children: React.ReactNode}) {
  return (
    <section className="py-6">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">{children}</div>
    </section>
  );
}
