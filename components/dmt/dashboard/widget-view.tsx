'use client';

import {useMemo} from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {TrendingUp, StickyNote, Filter as FilterIcon} from 'lucide-react';
import type {Widget} from '@/lib/dmt/dashboards';
import {
  computeAgg,
  formatValue,
  groupRows,
  loadDataSource
} from '@/lib/dmt/dashboards';

const PALETTE = ['#1565C0', '#7c3aed', '#059669', '#ea580c', '#dc2626', '#0d9488', '#db2777', '#a16207'];

const COLOR_TOKEN: Record<NonNullable<Widget['config']['color']>, {text: string; bg: string; border: string}> = {
  blue:   {text: 'var(--blue)',  bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  green:  {text: 'var(--grn)',   bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  orange: {text: 'var(--ora)',   bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  red:    {text: 'var(--red)',   bg: 'var(--red-lt)',  border: '#f0b8b4'},
  purple: {text: '#7c3aed',      bg: '#ede9fe',        border: '#c4b5fd'},
  navy:   {text: 'var(--navy)',  bg: 'var(--sur-2)',   border: 'var(--bdr)'}
};

export function WidgetView({widget, globalStatus}: {widget: Widget; globalStatus?: string}) {
  const {type, config} = widget;

  const rows = useMemo(() => {
    const src = config.source ?? 'leads';
    let rs = loadDataSource(src);
    if (config.statusFilter) rs = rs.filter((r) => String(r.status) === config.statusFilter);
    if (globalStatus && src === 'leads') rs = rs.filter((r) => String(r.status) === globalStatus);
    return rs;
  }, [config.source, config.statusFilter, globalStatus]);

  if (type === 'stat') {
    const value = computeAgg(rows, config.field, config.agg ?? 'count');
    const tok = COLOR_TOKEN[config.color ?? 'blue'];
    return (
      <div className="flex h-full flex-col justify-between p-4">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {config.title || 'მეტრიკა'}
        </div>
        <div>
          <div
            className="font-mono text-[28px] font-bold leading-none"
            style={{color: tok.text}}
          >
            {config.field === 'contract' || config.agg === 'sum' || config.agg === 'avg' ? '$ ' : ''}
            {formatValue(value)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-text-3">
            <TrendingUp size={11} />
            {rows.length} ჩანაწერი
          </div>
        </div>
      </div>
    );
  }

  if (type === 'bar' || type === 'line') {
    const data = groupRows(
      rows,
      config.groupBy || 'status',
      config.field,
      config.agg ?? (config.field ? 'sum' : 'count')
    ).slice(0, 12);
    return (
      <div className="flex h-full flex-col p-3">
        <div className="mb-1 px-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {config.title}
        </div>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={data} margin={{top: 8, right: 8, bottom: 24, left: 8}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10, fill: 'var(--text-3)'}} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis tick={{fontSize: 10, fill: 'var(--text-3)'}} />
                <Tooltip contentStyle={{fontSize: 11, borderRadius: 6, border: '1px solid var(--bdr)'}} />
                <Bar dataKey="value" fill="#1565C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{top: 8, right: 8, bottom: 24, left: 8}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
                <XAxis dataKey="name" tick={{fontSize: 10, fill: 'var(--text-3)'}} angle={-15} textAnchor="end" height={40} />
                <YAxis tick={{fontSize: 10, fill: 'var(--text-3)'}} />
                <Tooltip contentStyle={{fontSize: 11, borderRadius: 6, border: '1px solid var(--bdr)'}} />
                <Line type="monotone" dataKey="value" stroke="#1565C0" strokeWidth={2} dot={{r: 3}} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    const data = groupRows(
      rows,
      config.groupBy || 'status',
      config.field,
      config.agg ?? (config.field ? 'sum' : 'count')
    );
    return (
      <div className="flex h-full flex-col p-3">
        <div className="mb-1 px-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {config.title}
        </div>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{fontSize: 11, borderRadius: 6, border: '1px solid var(--bdr)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-[10px] text-text-3">
          {data.map((d, i) => (
            <span key={d.name} className="inline-flex items-center gap-1 truncate">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{background: PALETTE[i % PALETTE.length]}} />
              <span className="truncate">{d.name}</span>
              <span className="font-mono text-text-2">· {formatValue(d.value)}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'table') {
    const cols = (config.columns && config.columns.length > 0
      ? config.columns
      : Object.keys(rows[0] ?? {}).slice(0, 5));
    const items = rows.slice(0, config.limit ?? 5);
    return (
      <div className="flex h-full flex-col p-3">
        <div className="mb-1 px-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {config.title}
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-bdr">
          <table className="w-full text-[11.5px]">
            <thead className="bg-sur-2">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-2.5 py-1.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={i} className="border-t border-bdr/60 hover:bg-sur-2">
                  {cols.map((c) => (
                    <td key={c} className="truncate px-2.5 py-1.5 text-text-2">
                      {String(r[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={cols.length} className="px-2.5 py-3 text-center text-[11px] text-text-3">
                    მონაცემები არ მოიძებნა
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'note') {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-1 inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          <StickyNote size={10} /> {config.title || 'ჩანიშვნა'}
        </div>
        <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-[12.5px] leading-relaxed text-text-2">
          {config.text || '—'}
        </div>
      </div>
    );
  }

  if (type === 'filter') {
    return (
      <div className="flex h-full flex-col justify-center p-3">
        <div className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          <FilterIcon size={10} /> {config.title || 'ფილტრი'}
        </div>
        <div className="mt-1.5 text-[11.5px] text-text-2">
          {config.field ? <>ველი: <b className="text-navy">{config.field}</b></> : 'კონფიგურაცია →'}
        </div>
        <div className="mt-0.5 text-[10.5px] text-text-3">
          გამოყენება: აირჩიე მნიშვნელობა ზედა bar-ში
        </div>
      </div>
    );
  }

  return null;
}
