'use client';

import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {Heart, X, Copy, Check, QrCode, ExternalLink} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';

type BankCode = 'bog' | 'tbc' | 'other';
type Bank = {
  name: string;
  iban: string;
  account?: string | null;
  code?: BankCode | null;
  pay_link?: string | null;
};
type DonationInfo = {
  recipient_name: string;
  recipient_surname: string;
  banks: Bank[];
};

const FALLBACK: DonationInfo = {
  recipient_name: 'გიორგი',
  recipient_surname: 'მერებაშვილი',
  banks: [
    {name: 'TBC Bank', iban: 'GE00TB0000000000000000', account: null, code: 'tbc', pay_link: null},
    {name: 'Bank of Georgia', iban: 'GE00BG0000000000000000', account: null, code: 'bog', pay_link: null}
  ]
};

const AMOUNT_PRESETS = [5, 10, 25, 50, 100];
const PURPOSE = 'engineers.ge donation';

function buildPayLink(bank: Bank, amount: number | null): string | null {
  if (!bank.pay_link) return null;
  if (!amount) return bank.pay_link;
  try {
    const url = new URL(bank.pay_link);
    url.searchParams.set('amount', String(amount));
    return url.toString();
  } catch {
    return bank.pay_link;
  }
}

function formatFullInfo(recipient: string, bank: Bank, amount: number | null) {
  const lines = [recipient, bank.iban];
  if (amount) lines.push(`${amount} GEL`);
  lines.push(PURPOSE);
  return lines.join('\n');
}

export function DonateModal({open, onClose}: {open: boolean; onClose: () => void}) {
  const [info, setInfo] = useState<DonationInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/donate/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DonationInfo | null) => {
        if (cancelled) return;
        if (!data || !data.banks || data.banks.length === 0) {
          setInfo(FALLBACK);
        } else {
          setInfo({
            recipient_name: data.recipient_name || FALLBACK.recipient_name,
            recipient_surname: data.recipient_surname || FALLBACK.recipient_surname,
            banks: data.banks
          });
        }
      })
      .catch(() => {
        if (!cancelled) setInfo(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const data = info ?? FALLBACK;
  const recipient = `${data.recipient_name} ${data.recipient_surname}`.trim();

  const effectiveAmount = useMemo(() => {
    if (amount != null) return amount;
    const parsed = Number(customAmount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [amount, customAmount]);

  if (!open || !mounted) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const pickPreset = (v: number) => {
    setAmount(v);
    setCustomAmount('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="donate-title"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-[var(--radius-card)] border bg-sur p-5 shadow-xl md:p-6"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-sur-2 hover:text-navy"
          >
            <X size={16} />
          </button>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ora-bd bg-ora-lt px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ora">
            <Heart size={12} />
            Donate
          </div>
          <h2 id="donate-title" className="text-xl font-bold tracking-tight text-navy">
            მხარდაჭერა
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-text-2">
            engineers.ge უფასოა ყველასთვის. ყოველი ლარი გვეხმარება ახალი ინსტრუმენტების
            და ქართული საინჟინრო კონტენტის აშენებაში.
          </p>

          <div className="mt-4 rounded-[var(--radius-card)] border bg-sur-2 p-3">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
              მიმღები
            </div>
            <div className="mt-1 text-[15px] font-semibold text-navy">{recipient}</div>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
              თანხა (GEL)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AMOUNT_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => pickPreset(v)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    amount === v
                      ? 'border-navy bg-navy text-white'
                      : 'border-bdr bg-sur text-text-2 hover:border-navy/50 hover:text-navy'
                  }`}
                >
                  {v}
                </button>
              ))}
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAmount(null);
                }}
                placeholder="სხვა"
                className="w-20 rounded-md border border-bdr bg-sur px-2 py-1 text-xs text-navy placeholder:text-text-3 focus:border-navy focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-text-2">
            <QrCode size={12} className="text-blue" />
            <span>დაასკანირე ან დააკოპირე რეკვიზიტები</span>
          </div>

          <div className="mt-2 space-y-2">
            {data.banks.map((bank, i) => {
              const payUrl = buildPayLink(bank, effectiveAmount);
              const fullInfo = formatFullInfo(recipient, bank, effectiveAmount);
              return (
                <div
                  key={i}
                  className="rounded-[var(--radius-card)] border bg-sur p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-md border bg-white p-1.5">
                      <QRCodeSVG
                        value={payUrl ?? bank.iban}
                        size={72}
                        level="M"
                        marginSize={0}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                        {bank.name}
                      </div>
                      <div className="mt-0.5 break-all font-mono text-xs text-navy">
                        {bank.iban}
                      </div>
                      {bank.account ? (
                        <div className="mt-0.5 break-all font-mono text-[11px] text-text-2">
                          {bank.account}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleCopy(bank.iban, `iban-${i}`)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
                        >
                          {copied === `iban-${i}` ? (
                            <>
                              <Check size={11} /> IBAN
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> IBAN
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(fullInfo, `full-${i}`)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
                        >
                          {copied === `full-${i}` ? (
                            <>
                              <Check size={11} /> სრული
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> სრული
                            </>
                          )}
                        </button>
                        {payUrl ? (
                          <a
                            href={payUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 rounded-md border border-navy/30 bg-navy px-2 py-0.5 text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                          >
                            <ExternalLink size={11} /> გახსნა აპში
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[10px] text-text-3">მადლობა! ❤</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
