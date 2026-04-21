'use client';

import {useMemo, useState} from 'react';
import {TrendingUp, TrendingDown, Minus, Pencil, Trash2} from 'lucide-react';
import {
  HERO_AD_PAYMENT_STATUSES,
  formatGel,
  formatOccupiedUntil,
  getHeroAdPaymentStatus,
  normalizeHeroAdPayments,
  summarizeHeroAdPayments,
  type HeroAdPayment,
  type HeroAdPaymentStatus,
  type HeroAdSlot,
  type HeroSlotKey
} from '@/lib/hero-ads';
import {BannersShell} from './shell';

type Trend = 'up' | 'down' | 'neutral';

type PaymentForm = {
  slot_key: HeroSlotKey;
  client_name: string;
  invoice_no: string;
  amount_gel: string;
  status: HeroAdPaymentStatus;
  period_start: string;
  period_end: string;
  due_date: string;
  paid_at: string;
  note: string;
};

const STATUS_LABELS: Record<
  ReturnType<typeof getHeroAdPaymentStatus>,
  {label: string; tone: 'blue' | 'green' | 'amber' | 'neutral' | 'red'}
> = {
  draft: {label: 'Draft', tone: 'neutral'},
  sent: {label: 'გაგზავნილი', tone: 'blue'},
  paid: {label: 'გადახდილი', tone: 'green'},
  cancelled: {label: 'გაუქმებული', tone: 'neutral'},
  overdue: {label: 'ვადაგასული', tone: 'red'}
};

function Sparkline({data, trend}: {data: number[]; trend: Trend}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke =
    trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#6b7280';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function StatCard({
  title,
  value,
  interval,
  trend,
  data
}: {
  title: string;
  value: string;
  interval: string;
  trend: Trend;
  data: number[];
}) {
  const Icon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600'
      : trend === 'down'
        ? 'text-red-600'
        : 'text-text-3';
  return (
    <div className="rounded-card border border-bdr bg-sur p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
          {title}
        </p>
        <Icon size={14} className={trendColor} />
      </div>
      <p className="mt-2 text-[22px] font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-[11px] text-text-2">{interval}</p>
      <div className="mt-3">
        <Sparkline data={data} trend={trend} />
      </div>
    </div>
  );
}

export function BannersStats({
  slots,
  initialPayments,
  paymentsSource
}: {
  slots: HeroAdSlot[];
  initialPayments: HeroAdPayment[];
  paymentsSource: 'live' | 'unavailable';
}) {
  const adSlots = useMemo(() => slots.filter((s) => s.is_ad_slot), [slots]);
  const [payments, setPayments] = useState<HeroAdPayment[]>(initialPayments);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [form, setForm] = useState<PaymentForm>(() => createPaymentForm(adSlots[0] ?? slots[0]));

  const totalPrice = useMemo(
    () => adSlots.reduce((sum, s) => sum + (s.price_gel ?? 0), 0),
    [adSlots]
  );
  const sorted = useMemo(
    () => [...adSlots].sort((a, b) => b.price_gel - a.price_gel),
    [adSlots]
  );
  const max = adSlots.length > 0 ? Math.max(...adSlots.map((s) => s.price_gel)) : 0;
  const avg =
    adSlots.length > 0 ? Math.round(totalPrice / adSlots.length) : 0;
  const topSlot =
    adSlots.length > 0
      ? adSlots.reduce((t, s) => (s.price_gel > t.price_gel ? s : t))
      : null;
  const paymentSummary = useMemo(() => summarizeHeroAdPayments(payments), [payments]);
  const paidUntilRows = useMemo(
    () =>
      adSlots.map((slot) => ({
        slot,
        paidUntil: paymentSummary.paidUntilBySlot[slot.slot_key] ?? null
      })),
    [adSlots, paymentSummary.paidUntilBySlot]
  );

  const statCards: {
    title: string;
    value: string;
    interval: string;
    trend: Trend;
    data: number[];
  }[] = [
    {
      title: 'ყველაზე ძვირი slot',
      value: max > 0 ? `${formatGel(max)} ₾` : '—',
      interval: topSlot?.display_name ?? 'ჯერ არაა',
      trend: 'up',
      data: [Math.max(100, Math.round(max * 0.35)), Math.max(150, Math.round(max * 0.5)), Math.max(200, Math.round(max * 0.72)), max || 1]
    },
    {
      title: 'საშუალო ფასი',
      value: avg > 0 ? `${formatGel(avg)} ₾` : '—',
      interval: `${adSlots.length} slot-ზე`,
      trend: 'neutral',
      data: [Math.max(80, Math.round(avg * 0.85)), Math.max(100, Math.round(avg * 0.92)), avg || 1, avg || 1]
    },
    {
      title: 'ჯამი / თვე',
      value: `${formatGel(totalPrice)} ₾`,
      interval: 'ყველა slot-ის ფასი',
      trend: 'up',
      data: [Math.max(300, Math.round(totalPrice * 0.45)), Math.max(400, Math.round(totalPrice * 0.7)), Math.max(500, Math.round(totalPrice * 0.85)), totalPrice || 1]
    },
    {
      title: 'Outstanding',
      value: `${formatGel(paymentSummary.outstandingAmount)} ₾`,
      interval: `${paymentSummary.outstandingCount} ინვოისი`,
      trend: paymentSummary.outstandingCount > 0 ? 'down' : 'neutral',
      data: [Math.max(50, Math.round(paymentSummary.outstandingAmount * 0.4)), Math.max(60, Math.round(paymentSummary.outstandingAmount * 0.7)), paymentSummary.outstandingAmount || 1, paymentSummary.outstandingAmount || 1]
    },
    {
      title: 'ვადაგასული',
      value: `${formatGel(paymentSummary.overdueAmount)} ₾`,
      interval: `${paymentSummary.overdueCount} overdue`,
      trend: paymentSummary.overdueCount > 0 ? 'down' : 'neutral',
      data: [Math.max(0, Math.round(paymentSummary.overdueAmount * 0.2)), Math.max(0, Math.round(paymentSummary.overdueAmount * 0.5)), Math.max(0, Math.round(paymentSummary.overdueAmount * 0.8)), paymentSummary.overdueAmount || 1]
    },
    {
      title: 'გადახდილი',
      value: `${formatGel(paymentSummary.paidAmount)} ₾`,
      interval: `${paymentSummary.paidCount} ჩანაწერი · მალე ვადა ${paymentSummary.dueSoonCount}`,
      trend: paymentSummary.paidCount > 0 ? 'up' : 'neutral',
      data: [Math.max(40, Math.round(paymentSummary.paidAmount * 0.35)), Math.max(60, Math.round(paymentSummary.paidAmount * 0.68)), paymentSummary.paidAmount || 1, paymentSummary.paidAmount || 1]
    }
  ];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const response = await fetch('/api/admin/hero-ad-payments', {
        method,
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          ...(editingId ? {id: editingId} : {}),
          slot_key: form.slot_key,
          client_name: form.client_name,
          invoice_no: form.invoice_no,
          amount_gel: Number(form.amount_gel) || 0,
          status: form.status,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          due_date: form.due_date || null,
          paid_at: form.paid_at || null,
          note: form.note
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.payment) {
        throw new Error(data?.error ?? 'save failed');
      }

      const next = editingId
        ? payments.map((payment) => (payment.id === editingId ? data.payment : payment))
        : [data.payment, ...payments];

      setPayments(normalizeHeroAdPayments(next));
      setEditingId(null);
      setForm(createPaymentForm(adSlots[0] ?? slots[0]));
      setMsg({kind: 'ok', text: editingId ? 'ჩანაწერი განახლდა' : 'ინვოისი დაემატა'});
    } catch (error) {
      setMsg({kind: 'err', text: error instanceof Error ? error.message : 'save failed'});
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('წავშალო ეს ledger ჩანაწერი?')) return;
    setSaving(true);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/hero-ad-payments?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? 'delete failed');
      setPayments((current) => current.filter((payment) => payment.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(createPaymentForm(adSlots[0] ?? slots[0]));
      }
      setMsg({kind: 'ok', text: 'ჩანაწერი წაიშალა'});
    } catch (error) {
      setMsg({kind: 'err', text: error instanceof Error ? error.message : 'delete failed'});
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(payment: HeroAdPayment) {
    setEditingId(payment.id);
    setForm({
      slot_key: payment.slot_key,
      client_name: payment.client_name,
      invoice_no: payment.invoice_no,
      amount_gel: String(payment.amount_gel || ''),
      status: payment.status,
      period_start: payment.period_start ?? '',
      period_end: payment.period_end ?? '',
      due_date: payment.due_date ?? '',
      paid_at: payment.paid_at ?? '',
      note: payment.note
    });
    setMsg(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(createPaymentForm(adSlots[0] ?? slots[0]));
    setMsg(null);
  }

  function handleSlotChange(slotKey: HeroSlotKey) {
    const nextSlot = adSlots.find((slot) => slot.slot_key === slotKey) ?? slots[0];
    setForm((current) => ({
      ...current,
      slot_key: slotKey,
      client_name: editingId ? current.client_name : nextSlot?.client_name || nextSlot?.display_name || '',
      amount_gel: editingId ? current.amount_gel : String(nextSlot?.price_gel || ''),
      due_date: editingId ? current.due_date : nextSlot?.occupied_until ?? current.due_date,
      period_end: editingId ? current.period_end : nextSlot?.occupied_until ?? current.period_end
    }));
  }

  return (
    <BannersShell
      title="ბანერები · სტატისტიკა"
      description="ფასების განაწილება, TOP slot-ები, invoices ledger და paid-until კონტროლი."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mt-5 rounded-card border border-bdr bg-sur p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-navy">
          ფასების განაწილება
        </h3>
        <div className="flex flex-col gap-2.5">
          {sorted.map((slot) => {
            const pct = Math.round((slot.price_gel / (max || 1)) * 100);
            return (
              <div key={slot.slot_key}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-navy">
                    {slot.display_name}
                  </span>
                  <span className="font-mono text-text-2">
                    {formatGel(slot.price_gel)} ₾
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sur-2">
                  <div
                    style={{width: `${pct}%`}}
                    className="h-full bg-blue transition-[width] duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <section className="rounded-card border border-bdr bg-sur p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-navy">
                Payments ledger
              </h3>
              <p className="mt-1 text-[11px] text-text-2">
                invoice ნომერი, due date, status და paid-through პერიოდი ერთ ადგილას.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {paymentsSource === 'unavailable' && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                  DB fallback mode
                </span>
              )}
              <span className="rounded-full border border-bdr bg-sur-2 px-2.5 py-1 text-[10px] font-semibold text-text-2">
                {payments.length} row
              </span>
            </div>
          </div>

          {msg && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-[12px] ${
                msg.kind === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-danger'
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Slot">
                <select
                  value={form.slot_key}
                  onChange={(event) => handleSlotChange(event.target.value as HeroSlotKey)}
                  className="input"
                >
                  {adSlots.map((slot) => (
                    <option key={slot.slot_key} value={slot.slot_key}>
                      {slot.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="კლიენტი">
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(event) =>
                    setForm((current) => ({...current, client_name: event.target.value}))
                  }
                  className="input"
                  placeholder="კლიენტის სახელი"
                />
              </Field>
              <Field label="Invoice #">
                <input
                  type="text"
                  value={form.invoice_no}
                  onChange={(event) =>
                    setForm((current) => ({...current, invoice_no: event.target.value}))
                  }
                  className="input font-mono"
                  placeholder="ADV-CTA-20260421"
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as HeroAdPaymentStatus
                    }))
                  }
                  className="input"
                >
                  {HERO_AD_PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status].label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Field label="თანხა (GEL)">
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={form.amount_gel}
                  onChange={(event) =>
                    setForm((current) => ({...current, amount_gel: event.target.value}))
                  }
                  className="input font-mono"
                />
              </Field>
              <Field label="Period start">
                <input
                  type="date"
                  value={form.period_start}
                  onChange={(event) =>
                    setForm((current) => ({...current, period_start: event.target.value}))
                  }
                  className="input font-mono"
                />
              </Field>
              <Field label="Period end">
                <input
                  type="date"
                  value={form.period_end}
                  onChange={(event) =>
                    setForm((current) => ({...current, period_end: event.target.value}))
                  }
                  className="input font-mono"
                />
              </Field>
              <Field label="Due date">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(event) =>
                    setForm((current) => ({...current, due_date: event.target.value}))
                  }
                  className="input font-mono"
                />
              </Field>
              <Field label="Paid at">
                <input
                  type="date"
                  value={form.paid_at}
                  onChange={(event) =>
                    setForm((current) => ({...current, paid_at: event.target.value}))
                  }
                  className="input font-mono"
                />
              </Field>
            </div>

            <Field label="შენიშვნა">
              <textarea
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({...current, note: event.target.value}))
                }
                className="input min-h-24 resize-y"
                placeholder="ინვოისის კომენტარი / შეთანხმება / ფასი შეიცვალა..."
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'ინახება…' : editingId ? 'განახლება' : 'ინვოისის დამატება'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center rounded-lg border border-bdr bg-sur-2 px-3 py-2 text-[12px] font-semibold text-text-2 transition-colors hover:bg-sur-3"
              >
                {editingId ? 'რედაქტირების გაუქმება' : 'გასუფთავება'}
              </button>
            </div>
          </form>

          <div className="mt-5 overflow-x-auto rounded-xl border border-bdr">
            <table className="w-full text-[12px]">
              <thead className="bg-sur-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">
                <tr>
                  <Th>Invoice</Th>
                  <Th>Slot / კლიენტი</Th>
                  <Th>პერიოდი</Th>
                  <Th>Due</Th>
                  <Th align="right">თანხა</Th>
                  <Th>სტატუსი</Th>
                  <Th>ქმედება</Th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-[12px] text-text-3">
                      ჯერ ledger row არაა. ზემოდან დაამატე პირველი invoice/payment.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const displayStatus = getHeroAdPaymentStatus(payment);
                    return (
                      <tr key={payment.id} className="border-t border-bdr hover:bg-sur-2">
                        <Td>
                          <div className="font-mono text-[11px] text-navy">
                            {payment.invoice_no || `#${payment.id}`}
                          </div>
                          <div className="text-[10px] text-text-3">
                            შექმნილია {formatTimestamp(payment.created_at)}
                          </div>
                        </Td>
                        <Td>
                          <div className="font-semibold text-navy">
                            {slotName(adSlots, payment.slot_key)}
                          </div>
                          <div className="text-[11px] text-text-2">
                            {payment.client_name || '—'}
                          </div>
                        </Td>
                        <Td className="font-mono text-[11px]">
                          {payment.period_start || payment.period_end
                            ? `${formatOccupiedUntil(payment.period_start)} → ${formatOccupiedUntil(payment.period_end)}`
                            : '—'}
                        </Td>
                        <Td className="font-mono text-[11px]">
                          <div>{formatOccupiedUntil(payment.due_date)}</div>
                          {payment.paid_at && (
                            <div className="text-[10px] text-emerald-700">
                              paid {formatOccupiedUntil(payment.paid_at)}
                            </div>
                          )}
                        </Td>
                        <Td align="right" className="font-mono">
                          {formatGel(payment.amount_gel)} ₾
                        </Td>
                        <Td>
                          <Chip
                            tone={STATUS_LABELS[displayStatus].tone}
                            label={STATUS_LABELS[displayStatus].label}
                          />
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEdit(payment)}
                              className="inline-flex items-center gap-1 rounded-md border border-bdr bg-sur px-2 py-1 text-[11px] font-semibold text-text-2 transition-colors hover:bg-sur-2"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(payment.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-red-100"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-card border border-bdr bg-sur p-4">
          <h3 className="text-[13px] font-semibold text-navy">Paid until coverage</h3>
          <p className="mt-1 text-[11px] text-text-2">
            booking-ის `occupied_until` და ფინანსური `paid until` სწრაფი შედარება.
          </p>
          <div className="mt-4 space-y-2.5">
            {paidUntilRows.map(({slot, paidUntil}) => {
              const coverage =
                slot.occupied_until && paidUntil && paidUntil >= slot.occupied_until;
              return (
                <div
                  key={slot.slot_key}
                  className="rounded-lg border border-bdr bg-sur-2 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-navy">{slot.display_name}</div>
                      <div className="text-[10px] text-text-3">{slot.client_name || '—'}</div>
                    </div>
                    <Chip
                      tone={
                        !slot.occupied_until
                          ? 'neutral'
                          : coverage
                            ? 'green'
                            : paidUntil
                              ? 'amber'
                              : 'red'
                      }
                      label={
                        !slot.occupied_until
                          ? 'free'
                          : coverage
                            ? 'ok'
                            : paidUntil
                              ? 'აკლია'
                              : 'unpaid'
                      }
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-text-3">occupied</div>
                      <div className="font-mono text-text-2">
                        {formatOccupiedUntil(slot.occupied_until)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-3">paid until</div>
                      <div className="font-mono text-text-2">
                        {formatOccupiedUntil(paidUntil)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </BannersShell>
  );
}

function createPaymentForm(slot?: HeroAdSlot): PaymentForm {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return {
    slot_key: slot?.slot_key ?? 'cta',
    client_name: slot?.client_name || slot?.display_name || '',
    invoice_no: `ADV-${(slot?.slot_key ?? 'cta').toUpperCase()}-${stamp}`,
    amount_gel: slot?.price_gel ? String(slot.price_gel) : '',
    status: 'sent',
    period_start: '',
    period_end: slot?.occupied_until ?? '',
    due_date: slot?.occupied_until ?? '',
    paid_at: '',
    note: ''
  };
}

function slotName(slots: HeroAdSlot[], key: HeroSlotKey) {
  return slots.find((slot) => slot.slot_key === key)?.display_name ?? key;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('ka-GE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-3">
        {label}
      </div>
      {children}
    </label>
  );
}

function Th({
  children,
  align
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-3 py-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      } whitespace-nowrap`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className = ''
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      } align-top ${className}`}
    >
      {children}
    </td>
  );
}

function Chip({
  label,
  tone
}: {
  label: string;
  tone: 'blue' | 'green' | 'amber' | 'neutral' | 'red';
}) {
  const tones: Record<typeof tone, string> = {
    blue: 'bg-blue-lt text-blue border-blue-bd',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-ora-lt text-ora border-ora-bd',
    neutral: 'bg-sur-2 text-text-3 border-bdr',
    red: 'bg-red-50 text-danger border-red-200'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
