import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type InvItem = {category: string; subtype: string; count: number};
type Device = {
  category?: string;
  subtype?: string;
  unplanned?: boolean;
};
type Branch = {
  id: number;
  region: string | null;
  type: string | null;
  inventory_items: InvItem[] | null;
  devices: Device[] | null;
};

export async function GET() {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const res = await db
    .from('tbc_branches')
    .select('id, region, type, inventory_items, devices')
    .returns<Branch[]>();

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  const branches = res.data || [];

  // Category aggregates
  const byCategory = new Map<
    string,
    {planned: number; installed: number; unplanned: number}
  >();
  // Subtype aggregates (category::subtype)
  const bySubtype = new Map<
    string,
    {category: string; subtype: string; planned: number; installed: number}
  >();
  // Regional aggregates
  const byRegion = new Map<
    string,
    {branches: number; planned: number; installed: number; unplanned: number}
  >();

  for (const b of branches) {
    // Planned from inventory_items
    for (const it of b.inventory_items || []) {
      if (!it || !it.category) continue;
      const c = byCategory.get(it.category) || {
        planned: 0,
        installed: 0,
        unplanned: 0
      };
      c.planned += Number(it.count) || 0;
      byCategory.set(it.category, c);

      const key = `${it.category}|${it.subtype || ''}`;
      const s = bySubtype.get(key) || {
        category: it.category,
        subtype: it.subtype || '—',
        planned: 0,
        installed: 0
      };
      s.planned += Number(it.count) || 0;
      bySubtype.set(key, s);
    }
    // Installed from devices
    for (const d of b.devices || []) {
      if (!d || !d.category) continue;
      const c = byCategory.get(d.category) || {
        planned: 0,
        installed: 0,
        unplanned: 0
      };
      if (d.unplanned) c.unplanned += 1;
      else c.installed += 1;
      byCategory.set(d.category, c);

      const key = `${d.category}|${d.subtype || ''}`;
      const s = bySubtype.get(key) || {
        category: d.category,
        subtype: d.subtype || '—',
        planned: 0,
        installed: 0
      };
      if (!d.unplanned) s.installed += 1;
      bySubtype.set(key, s);
    }
    // Regional
    const region = b.region || 'უცნობი';
    const r = byRegion.get(region) || {
      branches: 0,
      planned: 0,
      installed: 0,
      unplanned: 0
    };
    r.branches += 1;
    for (const it of b.inventory_items || [])
      r.planned += Number(it.count) || 0;
    for (const d of b.devices || []) {
      if (d.unplanned) r.unplanned += 1;
      else r.installed += 1;
    }
    byRegion.set(region, r);
  }

  const categories = Array.from(byCategory.entries())
    .map(([category, v]) => ({
      category,
      ...v,
      pct: v.planned > 0 ? Math.round((v.installed / v.planned) * 100) : 0
    }))
    .sort((a, b) => b.planned - a.planned);

  const subtypes = Array.from(bySubtype.values())
    .map((s) => ({
      ...s,
      pct: s.planned > 0 ? Math.round((s.installed / s.planned) * 100) : 0
    }))
    .sort((a, b) => b.planned - a.planned);

  const regions = Array.from(byRegion.entries())
    .map(([region, v]) => ({
      region,
      ...v,
      pct: v.planned > 0 ? Math.round((v.installed / v.planned) * 100) : 0
    }))
    .sort((a, b) => b.branches - a.branches);

  const totals = {
    branches: branches.length,
    planned: categories.reduce((s, c) => s + c.planned, 0),
    installed: categories.reduce((s, c) => s + c.installed, 0),
    unplanned: categories.reduce((s, c) => s + c.unplanned, 0)
  };

  return NextResponse.json({categories, subtypes, regions, totals});
}
