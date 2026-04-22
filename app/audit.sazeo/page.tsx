'use client';

import {useMemo, useState} from 'react';
import {ChevronLeft, ChevronRight, ExternalLink, FileText, Hash, Lock} from 'lucide-react';

type MenuItem = {
  id: string;
  label: string;
  caption?: string;
  src?: string;
  anchor?: string;
  disabled?: boolean;
  children?: MenuItem[];
};

const BLUEPRINT = '/audit.sazeo/iot-bms-blueprint.html';

const MENU_GROUPS: {id: string; title: string; items: MenuItem[]}[] = [
  {
    id: 'blueprints',
    title: 'Blueprints',
    items: [
      {
        id: 'iot-bms-blueprint',
        label: 'IoT BMS — Infrastructure',
        caption: '22 ADRs · 2026-04-22',
        src: BLUEPRINT,
        children: [
          {id: 'l1',  label: 'Cloud foundation',          caption: 'ADR-001, 021',            src: BLUEPRINT, anchor: 'l1'},
          {id: 'l2',  label: 'Networking & edge',         caption: 'ingress · TLS · WAF',     src: BLUEPRINT, anchor: 'l2'},
          {id: 'l3',  label: 'Compute — API & workers',   caption: 'ADR-004 · NestJS',        src: BLUEPRINT, anchor: 'l3'},
          {id: 'l4',  label: 'Async backbone',            caption: 'ADR-005 · queue + bus',   src: BLUEPRINT, anchor: 'l4'},
          {id: 'l5',  label: 'Data stores',               caption: 'ADR-006, 007, 008, 015',  src: BLUEPRINT, anchor: 'l5'},
          {id: 'l6',  label: 'Identity & access',         caption: 'ADR-009, 010, 017',       src: BLUEPRINT, anchor: 'l6'},
          {id: 'l7',  label: 'Device ingress & edge',     caption: 'ADR-002, 003',            src: BLUEPRINT, anchor: 'l7'},
          {id: 'l8',  label: 'AI / ML stack',             caption: 'ADR-011, 014 · Bedrock',  src: BLUEPRINT, anchor: 'l8'},
          {id: 'l9',  label: 'Digital Twin',              caption: 'ADR-012, 013',            src: BLUEPRINT, anchor: 'l9'},
          {id: 'l10', label: 'Application surfaces',      caption: 'web · mobile · live',     src: BLUEPRINT, anchor: 'l10'},
          {id: 'l11', label: 'Observability',             caption: 'traces · metrics · SLO',  src: BLUEPRINT, anchor: 'l11'},
          {id: 'l12', label: 'Security & compliance',     caption: 'SOC 2 · ISO 27001',       src: BLUEPRINT, anchor: 'l12'},
          {id: 'l13', label: 'CI/CD & dev platform',      caption: '',                         src: BLUEPRINT, anchor: 'l13'},
          {id: 'l14', label: 'External + Billing',        caption: 'Stripe · usage ledger',    src: BLUEPRINT, anchor: 'l14'},
          {id: 'l15', label: 'Current platform',          caption: 'iot.dmt.ge snapshot',      src: BLUEPRINT, anchor: 'l15'},
          {id: 'l16', label: 'DB schemas (ქართული)',      caption: 'tables · RLS · triggers',  src: BLUEPRINT, anchor: 'l16'},
          {id: 'l17', label: 'Code organization',         caption: 'Turborepo · trunk-based',  src: BLUEPRINT, anchor: 'l17'},
          {id: 'l18', label: 'Protocols & exchange',      caption: 'MQTT · HTTP · Socket.io',  src: BLUEPRINT, anchor: 'l18'},
          {id: 'l19', label: 'Operator console',           caption: 'monitoring · reports · ADR', src: BLUEPRINT, anchor: 'l19'},
          {id: 'l20', label: 'System diagram',             caption: 'SVG node tree',            src: BLUEPRINT, anchor: 'l20'},
          {id: 'l21', label: 'API design',                 caption: 'REST + Socket.io + SSE',   src: BLUEPRINT, anchor: 'l21'},
          {id: 'l22', label: 'Notifications',              caption: 'SES · SNS · Pinpoint',     src: BLUEPRINT, anchor: 'l22'},
          {id: 'l23', label: 'Rationale · comparisons',    caption: 'ქართული განმარტებები',      src: BLUEPRINT, anchor: 'l23'},
          {id: 'l24', label: 'როლი და საჭიროება',           caption: 'ქართული · detailed',        src: BLUEPRINT, anchor: 'l24'},
          {id: 'l25', label: 'Hardware · UL/IEC certs',    caption: '13 fields · SIL · SL2',     src: BLUEPRINT, anchor: 'l25'},
          {id: 'l26', label: 'Bug & anomaly detection',   caption: 'ML · scanners · AI review', src: BLUEPRINT, anchor: 'l26'},
          {id: 'l27', label: 'External integration API',  caption: 'claim certs · SDK · portal', src: BLUEPRINT, anchor: 'l27'},
          {id: 'l28', label: 'Scheduling · GMT/tz',        caption: 'IANA · DST-safe · per-tenant', src: BLUEPRINT, anchor: 'l28'}
        ]
      }
    ]
  },
  {
    id: 'reports',
    title: 'Reports',
    items: [
      {id: 'audit-snapshot', label: 'Audit snapshot',      caption: 'encrypted · AES-256-GCM',   src: '/audit.sazeo/reports/audit-snapshot.html'},
      {id: 'tenant-scoping', label: 'Tenant-scoping review', caption: 'nightly · RLS audit',     src: '/audit.sazeo/reports/tenant-scoping.html'}
    ]
  },
  {
    id: 'adr',
    title: 'Decisions',
    items: [
      {id: 'adr-index',          label: 'ADR index',                  caption: '25 decisions · v1.3',                  src: '/audit.sazeo/decisions/adr-index.html'},
      {id: 'multi-tenancy',      label: 'Multi-tenancy architecture', caption: 'self-reg · invite · service-provider',  src: '/audit.sazeo/decisions/multi-tenancy-adr.html'},
      {id: 'platform-governance',    label: 'Platform governance',        caption: 'demo · diagnostics · GDPR · tracing',         src: '/audit.sazeo/decisions/platform-governance-adr.html'},
      {id: 'ecosystem-extensions',   label: 'Ecosystem extensions',       caption: 'monitoring · manufacturer · tax/payments',    src: '/audit.sazeo/decisions/ecosystem-extensions-adr.html'},
      {id: 'routing-architecture',   label: 'Routing architecture',       caption: '58 routes · 42 API · 5 guards · redirect map', src: '/audit.sazeo/decisions/routing-architecture.html'},
      {id: 'status-state-machines',  label: 'Status & state machines',    caption: '8 entities · 38 statuses · 54 transitions',    src: '/audit.sazeo/decisions/status-state-machines.html'}
    ]
  }
];

function flatten(items: MenuItem[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const it of items) {
    out.push(it);
    if (it.children) out.push(...flatten(it.children));
  }
  return out;
}
const ALL_ITEMS = flatten(MENU_GROUPS.flatMap((g) => g.items));
const FIRST_ACTIVE_ID = ALL_ITEMS.find((i) => !i.disabled && i.src)?.id ?? '';

export default function AuditSazeoPage() {
  const [activeId, setActiveId] = useState(FIRST_ACTIVE_ID);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({'iot-bms-blueprint': true});

  const active = useMemo(() => ALL_ITEMS.find((i) => i.id === activeId), [activeId]);
  const iframeSrc = active?.src ? (active.anchor ? `${active.src}#${active.anchor}` : active.src) : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: collapsed ? '48px 1fr' : '280px 1fr',
        height: '100vh',
        width: '100%',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-jakarta), "Noto Sans Georgian", -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: 13,
        transition: 'grid-template-columns 150ms ease'
      }}
    >
      <aside
        style={{
          borderRight: '1px solid var(--bdr)',
          background: 'var(--sur)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '12px 0' : '14px 16px',
            borderBottom: '1px solid var(--bdr)',
            background: 'var(--sur-2)',
            minHeight: 48
          }}
        >
          {!collapsed && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
              <span style={{fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase'}}>
                sazeo · audit
              </span>
              <span style={{fontSize: 13, fontWeight: 700, color: 'var(--navy)'}}>
                Workspace
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'გახსნა' : 'დახურვა'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: '1px solid var(--bdr)',
              background: 'var(--sur)',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--text-2)'
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {!collapsed && (
          <nav style={{flex: 1, overflowY: 'auto', padding: '10px 8px 16px'}}>
            {MENU_GROUPS.map((group) => (
              <div key={group.id} style={{marginBottom: 14}}>
                <div
                  style={{
                    padding: '6px 8px 4px',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)'
                  }}
                >
                  {group.title}
                </div>
                <ul style={{listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2}}>
                  {group.items.map((item) => (
                    <MenuRow
                      key={item.id}
                      item={item}
                      depth={0}
                      activeId={activeId}
                      expanded={expanded}
                      onToggle={(id) => setExpanded((e) => ({...e, [id]: !e[id]}))}
                      onSelect={(id) => setActiveId(id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}
      </aside>

      <main style={{display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0}}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid var(--bdr)',
            background: 'var(--sur)',
            minHeight: 48
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--navy)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              audit.sazeo
            </span>
            <span style={{fontSize: 13, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
              {active?.label ?? 'გვერდი'}
            </span>
            {active?.anchor && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'var(--blue-lt)',
                  color: 'var(--blue)',
                  fontFamily: 'var(--font-plex-mono), ui-monospace, monospace',
                  fontSize: 10.5,
                  fontWeight: 600
                }}
              >
                <Hash size={10} />
                {active.anchor}
              </span>
            )}
            {active?.caption && (
              <span style={{fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-plex-mono), ui-monospace, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                · {active.caption}
              </span>
            )}
          </div>
          {iframeSrc && (
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                border: '1px solid var(--bdr)',
                borderRadius: 6,
                background: 'var(--sur)',
                color: 'var(--text-2)',
                fontSize: 11.5,
                fontWeight: 600,
                textDecoration: 'none',
                flexShrink: 0
              }}
            >
              <ExternalLink size={12} /> ახალ ჩანართში
            </a>
          )}
        </header>

        <div style={{flex: 1, minHeight: 0, background: 'var(--sur-2)'}}>
          {iframeSrc && active?.src ? (
            <iframe
              key={active.src}
              src={iframeSrc}
              title={active.label}
              style={{width: '100%', height: '100%', border: 0, display: 'block', background: '#fff'}}
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          ) : (
            <div style={{padding: 40, color: 'var(--text-3)', textAlign: 'center', fontSize: 13}}>
              ქვეთავი არჩეული არ არის.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MenuRow({
  item,
  depth,
  activeId,
  expanded,
  onToggle,
  onSelect
}: {
  item: MenuItem;
  depth: number;
  activeId: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = !!item.children && item.children.length > 0;
  const isOpen = !!expanded[item.id];
  const isActive = item.id === activeId;

  return (
    <li>
      <div style={{display: 'flex', alignItems: 'stretch'}}>
        {hasChildren && (
          <button
            onClick={() => onToggle(item.id)}
            aria-label={isOpen ? 'collapse' : 'expand'}
            style={{
              width: 18,
              marginLeft: depth * 10,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isOpen ? <ChevronLeft size={11} style={{transform: 'rotate(-90deg)'}} /> : <ChevronRight size={11} />}
          </button>
        )}
        <button
          onClick={() => !item.disabled && item.src && onSelect(item.id)}
          disabled={item.disabled}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '7px 9px',
            paddingLeft: hasChildren ? 4 : depth * 10 + 9,
            border: '1px solid transparent',
            borderRadius: 7,
            background: isActive ? 'var(--blue-lt)' : 'transparent',
            borderColor: isActive ? 'var(--blue-bd)' : 'transparent',
            color: item.disabled ? 'var(--text-3)' : isActive ? 'var(--blue)' : 'var(--text)',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            fontSize: depth > 0 ? 12 : 12.5,
            fontWeight: isActive ? 600 : depth > 0 ? 400 : 500,
            opacity: item.disabled ? 0.6 : 1,
            transition: 'background 120ms, border-color 120ms, color 120ms'
          }}
          onMouseEnter={(e) => {
            if (!item.disabled && !isActive) {
              e.currentTarget.style.background = 'var(--sur-2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!item.disabled && !isActive) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <span style={{paddingTop: 1, flexShrink: 0, color: item.disabled ? 'var(--text-3)' : isActive ? 'var(--blue)' : 'var(--text-2)'}}>
            {item.disabled ? <Lock size={12} /> : depth > 0 ? <Hash size={11} /> : <FileText size={12} />}
          </span>
          <span style={{display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1}}>
            <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
              {item.label}
            </span>
            {item.caption && (
              <span style={{fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--font-plex-mono), ui-monospace, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {item.caption}
              </span>
            )}
          </span>
        </button>
      </div>
      {hasChildren && isOpen && (
        <ul style={{listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2}}>
          {item.children!.map((c) => (
            <MenuRow
              key={c.id}
              item={c}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
