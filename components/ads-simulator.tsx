'use client';

import {useMemo, useState} from 'react';
import {ImagePlus, Megaphone, Mail, MessageCircle, Send} from 'lucide-react';
import {HeroAdsOutline} from '@/components/hero-ads-outline';
import {
  HERO_OWNER_NAME,
  HERO_SLOT_KEYS,
  HERO_SLOT_SPECS,
  formatGel,
  formatOccupiedUntil,
  toWhatsAppHref,
  type HeroAdSlot,
  type HeroSlotKey
} from '@/lib/hero-ads';

type Props = {
  slots: HeroAdSlot[];
};

export function AdsSimulator({slots}: Props) {
  const adSlots = useMemo(() => slots.filter((slot) => slot.is_ad_slot), [slots]);
  const [selectedKey, setSelectedKey] = useState<HeroSlotKey>(adSlots[0]?.slot_key ?? 'cta');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{name: string; size: string} | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestMsg, setRequestMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [requestForm, setRequestForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    note: ''
  });

  const selected = slots.find((slot) => slot.slot_key === selectedKey) ?? slots[0];

  const handleUpload = (file: File | null) => {
    if (!file) return;
    setPreviewFile(file);
    setRequestMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setPreviewImage(result);
      setPreviewMeta({
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSelect = (key: HeroSlotKey) => {
    if (key !== selectedKey) {
      setSelectedKey(key);
      setPreviewImage(null);
      setPreviewMeta(null);
      setPreviewFile(null);
      setRequestMsg(null);
    }
  };

  const resetPreview = () => {
    setPreviewImage(null);
    setPreviewMeta(null);
    setPreviewFile(null);
    setRequestMsg(null);
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!previewFile) {
      setRequestMsg({kind: 'err', text: 'ჯერ ატვირთე ბანერის ფაილი.'});
      return;
    }

    setSubmitting(true);
    setRequestMsg(null);
    try {
      const form = new FormData();
      form.append('file', previewFile);
      form.append('slot_key', selectedKey);
      form.append('company_name', requestForm.company_name);
      form.append('contact_name', requestForm.contact_name);
      form.append('contact_email', requestForm.contact_email);
      form.append('contact_phone', requestForm.contact_phone);
      form.append('note', requestForm.note);

      const response = await fetch('/api/ads/upload-request', {
        method: 'POST',
        body: form
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.error === 'rate_limited'
            ? 'მოთხოვნების ლიმიტს მიაღწიე, ცოტა ხანში ისევ სცადე.'
            : data?.message ?? data?.error ?? 'request failed'
        );
      }

      setRequestMsg({
        kind: 'ok',
        text: 'მოთხოვნა წავიდა pending review-ზე. approve-ის შემდეგ live slot-ზე გამოჩნდება.'
      });
      setRequestForm({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        note: ''
      });
      setPreviewFile(null);
      setPreviewImage(null);
      setPreviewMeta(null);
    } catch (error) {
      setRequestMsg({
        kind: 'err',
        text: error instanceof Error ? error.message : 'request failed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="rounded-[var(--radius-card)] border bg-sur p-5 md:p-7 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-bd bg-blue-lt px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-blue">
              <Megaphone size={12} />
              Advertise on engineers.ge
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy md:text-[28px]">
              რეკლამის სივრცე
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-2 max-w-[520px]">
              აირჩიე სარეკლამო ადგილი, ატვირთე შენი ბანერი და ნახე სიმულაცია — ზუსტად ისე, როგორც
              მთავარ გვერდზე გამოჩნდება. ყველა სლოტზე owner ნიშნად გამოჩნდება{' '}
              <strong className="text-navy">{HERO_OWNER_NAME}</strong>.
            </p>
          </div>
          <div className="rounded-xl border bg-sur-2 px-4 py-3 text-xs text-text-2 min-w-[220px]">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3">
              Contact owner
            </div>
            <div className="mt-1 text-sm font-semibold text-navy">{HERO_OWNER_NAME}</div>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-text-2">
              <Mail size={12} />
              <a href="mailto:info@engineers.ge" className="hover:text-blue">
                info@engineers.ge
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-[var(--radius-card)] border bg-sur p-4 md:p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-navy">Live სიმულაცია</h2>
            <p className="text-xs text-text-2">
              დააჭირე სლოტს ან აირჩიე ქვემოთ — შემდეგ ატვირთე სურათი.
            </p>
          </div>
          <div className="rounded-lg border border-blue-bd bg-blue-lt px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
            Preview
          </div>
        </div>
        <HeroAdsOutline
          slots={slots}
          selectedKey={selectedKey}
          previewImage={previewImage}
          onSelect={handleSelect}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[var(--radius-card)] border bg-sur p-4 md:p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-navy">სლოტის ატვირთვა</h3>
          <p className="mt-1 text-xs text-text-2">
            ატვირთვა მხოლოდ სიმულაციისთვისაა — ფაქტობრივი განთავსებისთვის დაგვიკავშირდი.
          </p>

          <label className="mt-4 block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3">
            აირჩიე ადგილი
          </label>
          <select
            value={selectedKey}
            onChange={(e) => handleSelect(e.target.value as HeroSlotKey)}
            className="mt-1 w-full rounded border bg-sur px-3 py-2 text-sm"
          >
            {adSlots.map((slot) => (
              <option key={slot.slot_key} value={slot.slot_key}>
                {slot.display_name} — {slot.price_gel > 0 ? `${formatGel(slot.price_gel)} ₾` : 'შეთანხმებით'}
              </option>
            ))}
          </select>

          {selected && (
            <div className="mt-4 space-y-1.5 rounded-lg border bg-sur-2 p-3 text-xs text-text-2">
              <Row label="ფორმატი" value={selected.format_hint} />
              <Row label="ზომა" value={selected.size_hint} />
              {selected.promo_badge && <Row label="Promo" value={selected.promo_badge} />}
              <Row
                label="ფასი"
                value={selected.price_gel > 0 ? `${formatGel(selected.price_gel)} ₾ / თვე` : 'შეთანხმებით'}
              />
              <Row
                label="სტატუსი"
                value={selected.occupied_until ? `დაკავებულია ${formatOccupiedUntil(selected.occupied_until)}-მდე` : 'თავისუფალია'}
              />
              {selected.client_name && <Row label="ამჟამად" value={selected.client_name} />}
            </div>
          )}

          {selected && toWhatsAppHref(selected.contact_phone) && (
            <a
              href={toWhatsAppHref(selected.contact_phone) ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              <MessageCircle size={14} />
              WhatsApp კონტაქტი
            </a>
          )}

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-bd bg-blue-lt/50 px-3 py-3 text-sm text-blue transition-colors hover:bg-blue-lt">
            <ImagePlus size={16} />
            {previewImage ? 'სხვა სურათი' : 'ბანერის ატვირთვა'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e.currentTarget.files?.[0] ?? null)}
            />
          </label>

          {previewMeta && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border bg-sur-2 px-3 py-2 text-[11px] text-text-2">
              <span className="truncate font-mono">{previewMeta.name}</span>
              <span className="font-mono text-text-3">{previewMeta.size}</span>
              <button
                type="button"
                onClick={resetPreview}
                className="ml-auto text-[11px] text-blue hover:underline"
              >
                გასუფთავება
              </button>
            </div>
          )}

          <form onSubmit={submitRequest} className="mt-4 space-y-3 rounded-xl border bg-sur-2 p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3">
                Approval request
              </div>
              <p className="mt-1 text-[11px] text-text-2">
                ფაილი ჯერ pending queue-ში შევა და მხოლოდ approve-ის შემდეგ გამოჩნდება live slot-ზე.
              </p>
            </div>

            {requestMsg && (
              <div
                className={`rounded-lg border px-3 py-2 text-[11px] ${
                  requestMsg.kind === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-danger'
                }`}
              >
                {requestMsg.text}
              </div>
            )}

            <div className="grid gap-3">
              <Input
                label="კომპანია"
                value={requestForm.company_name}
                onChange={(value) =>
                  setRequestForm((current) => ({...current, company_name: value}))
                }
                placeholder="კომპანიის სახელი"
              />
              <Input
                label="საკონტაქტო პირი"
                value={requestForm.contact_name}
                onChange={(value) =>
                  setRequestForm((current) => ({...current, contact_name: value}))
                }
                placeholder="სახელი გვარი"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  value={requestForm.contact_email}
                  onChange={(value) =>
                    setRequestForm((current) => ({...current, contact_email: value}))
                  }
                  placeholder="name@company.com"
                />
                <Input
                  label="ტელეფონი"
                  value={requestForm.contact_phone}
                  onChange={(value) =>
                    setRequestForm((current) => ({...current, contact_phone: value}))
                  }
                  placeholder="+995599123456"
                />
              </div>
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3">
                  კომენტარი
                </div>
                <textarea
                  value={requestForm.note}
                  onChange={(event) =>
                    setRequestForm((current) => ({...current, note: event.target.value}))
                  }
                  className="w-full rounded border bg-sur px-3 py-2 text-sm"
                  rows={3}
                  placeholder="მაგ: მაისი-ივნისის კამპანია, CTA ტექსტი, landing URL..."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={14} />
              {submitting ? 'იგზავნება…' : 'გაგზავნე approval-ზე'}
            </button>
          </form>
        </div>

        <div className="rounded-[var(--radius-card)] border bg-sur p-4 md:p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-navy">ფორმატი და ზომა</h3>
          <p className="mt-1 text-xs text-text-2">
            ყველა სლოტი იღებს JPG, PNG ან WEBP. შემოთავაზებული ზომები ოპტიმალურია retina ეკრანისთვის.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-sur-2 text-xs uppercase text-text-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">ადგილი</th>
                  <th className="px-3 py-2 text-left font-medium">ფორმატი</th>
                  <th className="px-3 py-2 text-left font-medium">ზომა</th>
                </tr>
              </thead>
              <tbody>
                {HERO_SLOT_KEYS.filter((key) => HERO_SLOT_SPECS[key].is_ad_slot).map((key) => (
                  <tr
                    key={key}
                    onClick={() => handleSelect(key)}
                    className={`cursor-pointer border-t transition-colors hover:bg-blue-lt/50 ${
                      selectedKey === key ? 'bg-blue-lt/70' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-navy">{HERO_SLOT_SPECS[key].display_name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text-2">{HERO_SLOT_SPECS[key].format_hint}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text-2">{HERO_SLOT_SPECS[key].size_hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border bg-sur p-4 md:p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-navy">როდემდეა დაკავებული ბანერი</h3>
        <p className="mt-1 text-xs text-text-2">
          რეალურ დროში განახლებადი მაგიდა — ფასები და ვადები ადმინ პანელიდან იმართება.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-sur-2 text-xs uppercase text-text-3">
              <tr>
                <th className="px-3 py-2 text-left font-medium">ადგილი</th>
                <th className="px-3 py-2 text-left font-medium">მესაკუთრე</th>
                <th className="px-3 py-2 text-left font-medium">ამჟამად</th>
                <th className="px-3 py-2 text-left font-medium">Promo</th>
                <th className="px-3 py-2 text-right font-medium">ფასი / თვე</th>
                <th className="px-3 py-2 text-left font-medium">დაკავებულია</th>
                <th className="px-3 py-2 text-left font-medium">WhatsApp</th>
                <th className="px-3 py-2 text-left font-medium">სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {slots
                .filter((slot) => slot.is_ad_slot)
                .map((slot) => {
                  const busy = !!slot.occupied_until;
                  return (
                    <tr
                      key={slot.slot_key}
                      onClick={() => handleSelect(slot.slot_key)}
                      className={`cursor-pointer border-t transition-colors hover:bg-blue-lt/50 ${
                        selectedKey === slot.slot_key ? 'bg-blue-lt/70' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-navy">{slot.display_name}</td>
                      <td className="px-3 py-2 text-text-2">{HERO_OWNER_NAME}</td>
                      <td className="px-3 py-2 text-text-2">{slot.client_name || '—'}</td>
                      <td className="px-3 py-2">
                        {slot.promo_badge ? (
                          <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            {slot.promo_badge}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-2">
                        {slot.price_gel > 0 ? `${formatGel(slot.price_gel)} ₾` : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-text-2">
                        {formatOccupiedUntil(slot.occupied_until)}
                      </td>
                      <td className="px-3 py-2 text-text-2">
                        {toWhatsAppHref(slot.contact_phone) ? (
                          <a
                            href={toWhatsAppHref(slot.contact_phone) ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <MessageCircle size={12} />
                            დაწერა
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            busy
                              ? 'bg-blue-lt text-blue ring-1 ring-blue-bd'
                              : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          }`}
                        >
                          {busy ? 'დაკავებულია' : 'თავისუფალია'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3">
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border bg-sur px-3 py-2 text-sm"
        placeholder={placeholder}
      />
    </label>
  );
}
