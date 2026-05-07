'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, X, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import type { AflFanSelection } from '@/lib/ahu-ashrae/types';

// ─── AFL API types ────────────────────────────────────────────────────────────

interface AflBrief {
  id_product: number;
  name: string;
  powerRated?: number;
  voltageRated?: number;
}

interface AflGraph {
  id_graph: number;
  label: string;
  graphMin: number;
  graphMax: number;
  approxParams: {
    pressureStatic: [number, number, number];
    power: [number, number, number];
    speed?: [number, number, number];
  };
}

interface AflProduct {
  id_product: number;
  name: string;
  diameter?: number;
  powerRated?: number;
  speedRated?: number;
  voltageRated?: number;
  pressureStaticMax?: number;
  volumeMax?: number;
  weight?: number;
  graph?: AflGraph[];
}

// ─── Polynomial evaluation ────────────────────────────────────────────────────

/** P(Q) = c[0]·Q² + c[1]·Q + c[2]  (Q in m³/h, P in Pa) */
function poly(c: [number, number, number], q: number): number {
  return c[0] * q * q + c[1] * q + c[2];
}

function computeWorkingPoint(
  graph: AflGraph,
  systemQ: number,   // m³/h
  systemDp: number,  // Pa
): { pressurePa: number; powerW: number; fanEff: number; ok: boolean } {
  const pressurePa = poly(graph.approxParams.pressureStatic, systemQ);
  const powerW     = Math.max(1, poly(graph.approxParams.power, systemQ));
  const qM3s       = systemQ / 3600;
  const fanEff     = Math.min(1, Math.max(0, (qM3s * pressurePa) / powerW));
  return { pressurePa, powerW, fanEff, ok: pressurePa >= systemDp };
}

// ─── Exported component ───────────────────────────────────────────────────────

interface Props {
  systemQ: number;    // m³/h — from state.airflow.supplyAirflow
  systemDp: number;   // Pa  — from chain.totalDeltaP
  current?: AflFanSelection;
  onSelect: (fan: AflFanSelection) => void;
  onClose: () => void;
}

export function AflFanSelector({ systemQ, systemDp, current, onSelect, onClose }: Props) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<AflBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<AflProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/afl-fan?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }, [query]);

  const loadProduct = async (id: number) => {
    setLoadingProduct(true);
    setProduct(null);
    try {
      const res  = await fetch(`/api/afl-fan?id=${id}`);
      const data = await res.json();
      // AFL returns an array with one item when fetching by id
      const item: AflProduct = Array.isArray(data) ? data[0] : data;
      setProduct(item);
    } catch { /* ignore */ }
    finally { setLoadingProduct(false); }
  };

  // Use the max-voltage graph (index 0 = 10V / full speed)
  const graph = product?.graph?.[0];
  const wp    = graph ? computeWorkingPoint(graph, systemQ, systemDp) : null;

  const handleApply = () => {
    if (!product || !graph || !wp) return;
    const sel: AflFanSelection = {
      id:               product.id_product,
      model:            product.name ?? '—',
      diameterMm:       product.diameter ?? 0,
      powerRatedW:      product.powerRated ?? 0,
      speedRpm:         product.speedRated ?? 0,
      voltageV:         product.voltageRated ?? 230,
      weightKg:         product.weight ?? 0,
      fanEff:           wp.fanEff,
      pressureAtDesignPa: wp.pressurePa,
      powerAtDesignW:   wp.powerW,
      graphId:          graph.id_graph,
    };
    onSelect(sel);
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--sur)', borderColor: 'var(--blue-bd)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}
      >
        <div className="flex items-center gap-2">
          <Search size={14} style={{ color: 'var(--blue)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>
            AFL კატალოგი — ვენტ. შერჩევა
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            cloudair.tech
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bdr)]">
          <X size={14} style={{ color: 'var(--text-3)' }} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: search + results */}
        <div className="p-3 border-r" style={{ borderColor: 'var(--bdr)' }}>
          {/* System design point reminder */}
          <div
            className="mb-3 px-3 py-2 rounded-lg text-[11px] flex gap-3"
            style={{ background: 'var(--sur-2)', color: 'var(--text-2)' }}
          >
            <span>Q = <strong>{systemQ.toLocaleString('en-US')} m³/h</strong></span>
            <span>ΔP = <strong>{systemDp.toFixed(0)} Pa</strong></span>
          </div>

          {/* Search input */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="B3P190… ან EC072…"
              className="w-full rounded-lg border pl-8 pr-3 py-2 text-xs outline-none focus:ring-2"
              style={{
                background: 'var(--sur)',
                borderColor: 'var(--bdr-2)',
                color: 'var(--text)',
                '--tw-ring-color': 'var(--blue)',
              } as React.CSSProperties}
            />
            {loading && (
              <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-3)' }} />
            )}
          </div>

          {/* Results list */}
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !loading && (
              <div className="text-[11px] text-center py-4" style={{ color: 'var(--text-3)' }}>
                არ მოიძებნა
              </div>
            )}
            {results.map((r) => (
              <button
                key={r.id_product}
                onClick={() => loadProduct(r.id_product)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--blue-lt)]"
                style={{
                  background: product?.id_product === r.id_product ? 'var(--blue-lt)' : 'transparent',
                  borderColor: 'transparent',
                }}
              >
                <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--navy)' }}>
                  {r.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {r.voltageRated && (
                    <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{r.voltageRated} V</span>
                  )}
                  {r.powerRated && (
                    <span className="text-[9px] font-mono" style={{ color: 'var(--text-2)' }}>{r.powerRated} W</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Current selection shortcut */}
          {current && results.length === 0 && query.length < 2 && (
            <div className="mt-3">
              <div className="text-[9px] uppercase font-bold mb-1" style={{ color: 'var(--text-3)' }}>ამჟამად შერჩეული</div>
              <button
                onClick={() => loadProduct(current.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--blue-lt)] text-left"
              >
                <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--blue)' }}>
                  {current.model}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Right: product detail + working point */}
        <div className="p-3">
          {loadingProduct && (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-3)' }} />
            </div>
          )}

          {!loadingProduct && !product && (
            <div className="h-full flex items-center justify-center text-[11px] text-center" style={{ color: 'var(--text-3)' }}>
              მარცხნიდან შეარჩიე მოდელი
            </div>
          )}

          {!loadingProduct && product && (
            <div className="space-y-3">
              {/* Model header */}
              <div>
                <div className="text-sm font-bold font-mono" style={{ color: 'var(--navy)' }}>
                  {product.name}
                </div>
                <div className="text-[10px] flex gap-3 mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {product.diameter && <span>⌀ {product.diameter} mm</span>}
                  {product.voltageRated && <span>{product.voltageRated} V</span>}
                  {product.weight && <span>{product.weight} kg</span>}
                </div>
              </div>

              {/* Max specs */}
              <div className="grid grid-cols-2 gap-1.5">
                <MiniStat label="Q max" value={product.volumeMax ? `${product.volumeMax.toLocaleString('en-US')} m³/h` : '—'} />
                <MiniStat label="ΔP max" value={product.pressureStaticMax ? `${product.pressureStaticMax.toFixed(0)} Pa` : '—'} />
                <MiniStat label="P rated" value={product.powerRated ? `${product.powerRated} W` : '—'} />
                <MiniStat label="n rated" value={product.speedRated ? `${product.speedRated} rpm` : '—'} />
              </div>

              {/* Working point at system conditions */}
              {wp && (
                <div
                  className="rounded-lg p-3 border"
                  style={{
                    background: wp.ok ? '#f0fdf4' : '#fff7ed',
                    borderColor: wp.ok ? '#86efac' : '#fed7aa',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    {wp.ok
                      ? <CheckCircle2 size={12} style={{ color: '#16a34a' }} />
                      : <AlertTriangle size={12} style={{ color: '#d97706' }} />
                    }
                    <span className="text-[10px] font-bold" style={{ color: wp.ok ? '#166534' : '#92400e' }}>
                      {wp.ok ? 'სამუშ. წ. OK' : 'ΔP ბარიერი'} — @ Q={systemQ.toLocaleString('en-US')} m³/h
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <WpStat label="ΔP ფანი" value={`${wp.pressurePa.toFixed(0)} Pa`} ok={wp.ok} />
                    <WpStat label="P ფანი" value={`${wp.powerW.toFixed(0)} W`} />
                    <WpStat label="η ფანი" value={`${(wp.fanEff * 100).toFixed(1)} %`} ok={wp.fanEff > 0.4} />
                  </div>
                  {!wp.ok && (
                    <div className="mt-2 text-[10px]" style={{ color: '#92400e' }}>
                      ΔP_fan ({wp.pressurePa.toFixed(0)} Pa) &lt; სისტ. ΔP ({systemDp.toFixed(0)} Pa) — ამ მოდელისთვის ხარჯი მეტია
                    </div>
                  )}
                </div>
              )}

              {/* Graph list for reference */}
              {product.graph && product.graph.length > 1 && (
                <div>
                  <div className="text-[9px] uppercase font-bold mb-1" style={{ color: 'var(--text-3)' }}>
                    სიჩქ. დონეები ({product.graph.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {product.graph.map((g) => (
                      <span
                        key={g.id_graph}
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: 'var(--sur-2)', color: 'var(--text-3)' }}
                      >
                        {g.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AFL product link */}
              <a
                href={`https://afl.cloudair.tech/product.html?id_product=${product.id_product}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] hover:underline"
                style={{ color: 'var(--blue)' }}
              >
                <ExternalLink size={10} />
                AFL product page
              </a>

              {/* Apply button */}
              <button
                onClick={handleApply}
                disabled={!wp}
                className="w-full rounded-lg px-4 py-2 text-xs font-bold transition-colors"
                style={{
                  background: 'var(--blue)',
                  color: '#fff',
                  opacity: wp ? 1 : 0.4,
                }}
              >
                გამოყენება — η = {wp ? `${(wp.fanEff * 100).toFixed(1)} %` : '…'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Micro primitives ──────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md px-2.5 py-1.5 border" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
      <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="text-[11px] font-bold font-mono" style={{ color: 'var(--text)' }}>{value}</div>
    </div>
  );
}

function WpStat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[9px]" style={{ color: ok === false ? '#92400e' : 'var(--text-3)' }}>{label}</div>
      <div className="text-[11px] font-bold font-mono" style={{ color: ok === false ? '#b45309' : (ok === true ? '#166534' : 'var(--text)') }}>
        {value}
      </div>
    </div>
  );
}
