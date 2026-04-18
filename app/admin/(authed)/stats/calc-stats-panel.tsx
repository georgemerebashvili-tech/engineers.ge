import {FileText, Eye, Calculator} from 'lucide-react';
import type {CalcStatRow} from '@/lib/calc-stats';

const CALC_LABELS: Record<string, string> = {
  'wall-thermal': 'თბოგადაცემის კოეფიციენტის გაანგარიშება',
  'heat-loss': 'თბოდანაკარგები',
  hvac: 'HVAC კონდიცირება',
  'ahu-ashrae': 'AHU სელექცია',
  silencer: 'ხმაურდამხშობი',
  'silencer-kaya': 'KAYA ხმაურდამხშობი'
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ka-GE', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function CalcStatsPanel({rows}: {rows: CalcStatRow[]}) {
  const totalOpens = rows.reduce((s, r) => s + r.opens, 0);
  const totalPdfs = rows.reduce((s, r) => s + r.pdfs, 0);
  const activeCalcs = rows.filter((r) => r.opens > 0 || r.pdfs > 0).length;

  return (
    <section className="rounded-2xl border bg-sur p-5 md:p-6 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3">
            <Calculator size={12} />
            Calculators · 30 დღე
          </div>
          <h2 className="mt-1 text-lg font-bold text-navy">კალკულატორების გამოყენება</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="rounded-full border bg-sur-2 px-3 py-1 font-mono">
            <Eye size={12} className="inline mr-1" />
            {totalOpens} გახსნა
          </div>
          <div className="rounded-full border bg-sur-2 px-3 py-1 font-mono">
            <FileText size={12} className="inline mr-1" />
            {totalPdfs} PDF
          </div>
          <div className="rounded-full border bg-sur-2 px-3 py-1 font-mono">
            {activeCalcs} / {Object.keys(CALC_LABELS).length} აქტიური
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-sur-2 p-6 text-center text-xs text-text-3">
          ჯერ არცერთი event არ დაფიქსირდა. როცა მომხმარებელი გახსნის კალკულატორს ან დააგენერირებს
          PDF-ს, აქ გამოჩნდება.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-sur-2 text-xs uppercase text-text-3">
              <tr>
                <th className="px-3 py-2 text-left font-medium">კალკულატორი</th>
                <th className="px-3 py-2 text-right font-medium">გახსნა</th>
                <th className="px-3 py-2 text-right font-medium">PDF</th>
                <th className="px-3 py-2 text-right font-medium">PDF / Open</th>
                <th className="px-3 py-2 text-left font-medium">ბოლო აქტივობა</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const label = CALC_LABELS[r.slug] ?? r.slug;
                const ratio = r.opens > 0 ? Math.round((r.pdfs / r.opens) * 100) : 0;
                return (
                  <tr key={r.slug} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium text-navy">{label}</div>
                      <div className="font-mono text-[10px] text-text-3">{r.slug}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.opens}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.pdfs}</td>
                    <td className="px-3 py-2 text-right font-mono text-text-2">
                      {r.opens > 0 ? `${ratio}%` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-text-2">
                      {formatDate(r.last_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
