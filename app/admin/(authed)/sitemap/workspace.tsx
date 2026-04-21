'use client';

import {useMemo, useState, useTransition} from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  FileCode,
  Folder,
  FolderOpen,
  Globe,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Search,
  Server,
  Sparkles,
  X
} from 'lucide-react';
import type {RouteNode} from '@/lib/route-scanner';

type Props = {
  app: RouteNode;
  calcs: RouteNode[];
  stats: {pages: number; api: number};
  deployHookConfigured: boolean;
  deployEnv: string;
  deployUrl: string;
};

export function SitemapWorkspace({
  app,
  calcs,
  stats,
  deployHookConfigured,
  deployEnv,
  deployUrl
}: Props) {
  const [selected, setSelected] = useState<RouteNode | null>(null);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [deploying, startDeploy] = useTransition();
  const [deployMsg, setDeployMsg] = useState<{
    kind: 'ok' | 'err' | 'info';
    text: string;
  } | null>(null);

  const fullTree = useMemo<RouteNode[]>(() => {
    const base: RouteNode[] = [app];
    if (calcs.length > 0) {
      base.push({
        name: 'public/calc (static HTML)',
        path: '/calc',
        file: null,
        kind: 'group',
        dynamic: false,
        isRouteGroup: false,
        children: calcs
      });
    }
    return base;
  }, [app, calcs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fullTree;
    const visit = (n: RouteNode): RouteNode | null => {
      const match =
        n.path.toLowerCase().includes(q) || n.name.toLowerCase().includes(q);
      const kids = n.children.map(visit).filter(Boolean) as RouteNode[];
      if (match || kids.length > 0) return {...n, children: kids};
      return null;
    };
    return fullTree.map(visit).filter(Boolean) as RouteNode[];
  }, [fullTree, query]);

  const triggerDeploy = () => {
    setDeployMsg(null);
    startDeploy(async () => {
      try {
        const res = await fetch('/api/admin/deploy', {method: 'POST'});
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setDeployMsg({
            kind: 'err',
            text: data?.message ?? data?.error ?? 'deploy ვერ გაეშვა'
          });
          return;
        }
        setDeployMsg({
          kind: 'ok',
          text: 'Deploy hook გააქტიურდა. Vercel-ი ააშენებს ახალ deployment-ს (~1-3 წთ).'
        });
      } catch (e) {
        setDeployMsg({
          kind: 'err',
          text: e instanceof Error ? e.message : 'network error'
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
    <div className="rounded-[var(--radius-card)] border-2 border-blue bg-gradient-to-r from-blue-lt to-sur p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Rocket size={22} className="text-blue" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-navy">Deploy production</h3>
            <span className="rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-ora">
              env: {deployEnv}
            </span>
            {deployUrl && (
              <a
                href={deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue hover:underline"
              >
                current <ExternalLink size={10} />
              </a>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-text-2">
            Vercel Deploy Hook-ი — ახალი production build გავუშვათ ერთი კლიკით (~1-3 წთ).
          </p>
        </div>
        <button
          type="button"
          onClick={triggerDeploy}
          disabled={deploying || !deployHookConfigured}
          title={
            deployHookConfigured
              ? 'Vercel Deploy Hook-ი გააქტიურდება'
              : 'VERCEL_DEPLOY_HOOK_URL env-ი არაა დაყენებული'
          }
          className="inline-flex h-10 items-center gap-2 rounded-full bg-blue px-5 text-[13px] font-bold text-white shadow-md transition-colors hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Rocket size={14} />
          {deploying ? 'იდება…' : 'Deploy'}
        </button>
      </div>
      {!deployHookConfigured && (
        <p className="mt-2 text-[11px] text-text-3">
          დასაყენებლად: Vercel Dashboard → Project → Settings → Git → Deploy Hooks →
          &ldquo;Create Hook&rdquo; (production). URL-ი ჩაწერე{' '}
          <code className="rounded bg-sur-2 px-1">VERCEL_DEPLOY_HOOK_URL</code> env-ში.
        </p>
      )}
      {deployMsg && (
        <p
          className={`mt-2 text-[12px] ${
            deployMsg.kind === 'ok'
              ? 'text-grn'
              : deployMsg.kind === 'err'
              ? 'text-danger'
              : 'text-text-2'
          }`}
        >
          {deployMsg.text}
        </p>
      )}
    </div>
    <div
      className={`grid gap-4 ${
        collapsed
          ? 'lg:grid-cols-[36px_1fr]'
          : 'lg:grid-cols-[minmax(320px,420px)_1fr]'
      }`}
    >
      {collapsed ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="მენიუს გახსნა"
            aria-label="მენიუს გახსნა"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border bg-sur text-text-2 hover:border-blue hover:text-blue"
          >
            <PanelLeftOpen size={15} />
          </button>
          <div className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border bg-sur py-2 text-[9px] font-mono text-text-3">
            <span className="flex items-center gap-0.5">
              <Layers size={10} />
              {stats.pages}
            </span>
            <span className="flex items-center gap-0.5">
              <Server size={10} />
              {stats.api}
            </span>
            <span className="flex items-center gap-0.5">
              <FileCode size={10} />
              {calcs.length}
            </span>
          </div>
        </div>
      ) : (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border bg-sur p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2 py-0.5 font-mono text-[10px] font-semibold text-blue">
            <Layers size={11} /> {stats.pages} pages
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-sur-2 px-2 py-0.5 font-mono text-[10px] font-semibold text-text-2">
            <Server size={11} /> {stats.api} APIs
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-sur-2 px-2 py-0.5 font-mono text-[10px] font-semibold text-text-2">
            <FileCode size={11} /> {calcs.length} static
          </span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-ora">
            env: {deployEnv}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="მენიუს დაკეცვა"
            aria-label="მენიუს დაკეცვა"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-text-3 hover:border-blue hover:text-blue"
          >
            <PanelLeftClose size={12} />
          </button>
        </div>

        <div className="rounded-[var(--radius-card)] border bg-sur">
          <div className="border-b p-2">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ძიება path-ით…"
                className="w-full rounded-md border bg-sur-2 py-1.5 pl-7 pr-7 text-[12px] text-navy placeholder:text-text-3 focus:border-blue focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-text-3 hover:bg-sur"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-1">
            {filtered.map((n) => (
              <Tree
                key={n.path + n.name}
                node={n}
                depth={0}
                onSelect={setSelected}
                selectedPath={selected?.path ?? null}
                defaultOpen
              />
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="sticky top-20 rounded-[var(--radius-card)] border bg-sur p-3">
        {selected ? (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Sparkles size={14} className="text-blue" />
              <code className="truncate font-mono text-[12px] font-semibold text-navy">
                {selected.path}
              </code>
              <KindPill kind={selected.kind} dynamic={selected.dynamic} />
              <div className="ml-auto flex gap-1.5">
                {isPreviewable(selected) && (
                  <a
                    href={selected.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
                  >
                    <ExternalLink size={11} /> open
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-text-3 hover:text-navy"
                  aria-label="close preview"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {selected.file && (
              <p className="mb-2 font-mono text-[10px] text-text-3">
                {selected.file}
              </p>
            )}

            {selected.dynamic && (
              <p className="mb-3 rounded-md border border-ora-bd bg-ora-lt px-3 py-2 text-[12px] text-ora">
                ⚠ დინამიური route ({selected.path}). URL-ში [slug]-ის ადგილას რეალური
                მნიშვნელობა უნდა ჩასვა preview-სთვის.
              </p>
            )}

            {isPreviewable(selected) ? (
              <iframe
                key={selected.path}
                src={selected.path}
                className="h-[70vh] w-full rounded-md border bg-bg"
                title={`preview ${selected.path}`}
              />
            ) : selected.kind === 'api' ? (
              <div className="rounded-md border border-blue-bd bg-blue-lt p-3 text-[12px] text-blue">
                API route. პრიური preview არ აქვს — გამოიყენე{' '}
                <code className="font-mono">curl</code> ან Postman:
                <pre className="mt-2 overflow-x-auto rounded bg-sur p-2 text-[11px] text-navy">
                  {`curl -i "${originOrEmpty()}${selected.path}"`}
                </pre>
              </div>
            ) : (
              <div className="rounded-md border bg-sur-2 p-3 text-[12px] text-text-2">
                Folder / group — preview არაა ხელმისაწვდომი.
              </div>
            )}
          </>
        ) : (
          <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-text-3">
            <Eye size={28} strokeWidth={1.2} />
            <p className="text-[12px]">დააკლიკე node-ზე preview-სთვის</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function originOrEmpty() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function isPreviewable(n: RouteNode) {
  return (n.kind === 'page' || n.kind === 'static') && !n.dynamic;
}

function KindPill({kind, dynamic}: {kind: RouteNode['kind']; dynamic: boolean}) {
  if (dynamic) {
    return (
      <span className="inline-flex items-center rounded-full border border-ora-bd bg-ora-lt px-1.5 py-0.5 font-mono text-[9px] font-semibold text-ora">
        dynamic
      </span>
    );
  }
  const map: Record<string, string> = {
    page: 'border-blue-bd bg-blue-lt text-blue',
    api: 'border-grn-bd bg-grn-lt text-grn',
    static: 'border-ora-bd bg-ora-lt text-ora',
    group: 'border-bdr bg-sur-2 text-text-3',
    layout: 'border-bdr bg-sur-2 text-text-3'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${map[kind] ?? map.group}`}
    >
      {kind}
    </span>
  );
}

function Tree({
  node,
  depth,
  onSelect,
  selectedPath,
  defaultOpen = false
}: {
  node: RouteNode;
  depth: number;
  onSelect: (n: RouteNode) => void;
  selectedPath: string | null;
  defaultOpen?: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(defaultOpen || depth < 1);
  const selected = selectedPath === node.path && !!node.file;
  const clickable =
    node.kind === 'page' || node.kind === 'api' || node.kind === 'static';

  return (
    <div>
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : -1}
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          if (clickable) onSelect(node);
        }}
        onKeyDown={(e) => {
          if (!clickable) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(node);
          }
        }}
        style={{paddingLeft: depth * 12 + 6}}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 text-[12.5px] transition-colors hover:bg-sur-2 ${
          selected ? 'bg-blue-lt text-blue' : 'text-text-2'
        }`}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-text-3">
          {hasChildren ? (
            open ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <span className="inline-block h-1 w-1 rounded-full bg-text-3" />
          )}
        </span>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {node.kind === 'page' ? (
            <Globe size={12} className={selected ? 'text-blue' : 'text-text-3'} />
          ) : node.kind === 'api' ? (
            <Server size={12} className="text-grn" />
          ) : node.kind === 'static' ? (
            <FileCode size={12} className="text-ora" />
          ) : open ? (
            <FolderOpen size={12} className="text-text-3" />
          ) : (
            <Folder size={12} className="text-text-3" />
          )}
        </span>
        <span className={`truncate ${node.isRouteGroup ? 'italic text-text-3' : ''}`}>
          {node.isRouteGroup ? node.name + ' (group)' : node.name}
        </span>
        {node.dynamic && (
          <span className="rounded-full border border-ora-bd bg-ora-lt px-1.5 font-mono text-[9px] text-ora">
            dyn
          </span>
        )}
        {node.kind !== 'group' && !node.isRouteGroup && (
          <code className="ml-auto truncate font-mono text-[10px] text-text-3">
            {node.path}
          </code>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map((c) => (
            <Tree
              key={c.path + c.name}
              node={c}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
