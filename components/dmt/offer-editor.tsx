'use client';

import {useMemo, useState} from 'react';
import {Check, Copy, FileText, LoaderCircle, Package, Plus, Send, Trash2, X} from 'lucide-react';
import {
  calculateOfferTotals,
  createOffer,
  generateOfferPdf,
  sendOffer,
  updateOffer,
  type DmtOffer,
  type OfferItem
} from '@/lib/dmt/offers-store';
import {InventoryPicker, type InventoryCatalogItem} from '@/components/dmt/inventory-picker';
import {OfferPdfPreview} from '@/components/dmt/offer-pdf-preview';

export type OfferLeadRef = {
  id: string;
  company: string;
  contact?: string;
  phone?: string;
};

type Props = {
  lead: OfferLeadRef;
  offer?: DmtOffer | null;
  onClose: () => void;
  onSaved: (offer: DmtOffer) => void;
};

const EMPTY_CUSTOM = {name: '', qty: 1, unitPrice: 0, laborPerUnit: 0};

const fmtMoney = (n: number) => `₾ ${n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

export function OfferEditor({lead, offer, onClose, onSaved}: Props) {
  const [items, setItems] = useState<OfferItem[]>(offer?.items ?? []);
  const [currency, setCurrency] = useState(offer?.currency ?? 'GEL');
  const [vatEnabled, setVatEnabled] = useState(offer?.vatRate !== null && offer?.vatRate !== undefined);
  const [vatRate, setVatRate] = useState(offer?.vatRate ?? 18);
  const [marginPercent, setMarginPercent] = useState(offer?.marginPercent ?? 15);
  const [includeMoneyBackGuarantee, setIncludeMoneyBackGuarantee] = useState(offer?.includeMoneyBackGuarantee ?? true);
  const [deliveryTerms, setDeliveryTerms] = useState(offer?.deliveryTerms ?? '');
  const [paymentTerms, setPaymentTerms] = useState(offer?.paymentTerms ?? '');
  const [notes, setNotes] = useState(offer?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const [error, setError] = useState('');

  const totals = useMemo(
    () => calculateOfferTotals(items, vatEnabled ? vatRate : null, marginPercent),
    [items, marginPercent, vatEnabled, vatRate]
  );

  const title = offer?.id ? `ოფერი ${offer.id}` : 'ახალი ოფერი';

  const setItem = (index: number, patch: Partial<OfferItem>) => {
    setItems((prev) => prev.map((item, i) => i === index ? {...item, ...patch} : item));
  };

  const addInventoryItem = (item: InventoryCatalogItem) => {
    setItems((prev) => [
      ...prev,
      {
        inventoryId: item.id,
        sku: item.sku,
        name: item.name,
        description: item.description ?? '',
        qty: 1,
        unitPrice: item.price ?? 0,
        laborPerUnit: 0,
        currency,
        source: 'inventory'
      }
    ]);
    setShowPicker(false);
  };

  const addCustomItem = () => {
    if (!custom.name.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        name: custom.name.trim(),
        qty: Math.max(0, Number(custom.qty) || 0),
        unitPrice: Math.max(0, Number(custom.unitPrice) || 0),
        laborPerUnit: Math.max(0, Number(custom.laborPerUnit) || 0),
        currency,
        source: 'custom'
      }
    ]);
    setCustom(EMPTY_CUSTOM);
  };

  const payload = () => ({
    leadId: lead.id,
    items,
    vatRate: vatEnabled ? vatRate : null,
    marginPercent,
    includeMoneyBackGuarantee,
    currency,
    deliveryTerms,
    paymentTerms,
    notes
  });

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      const res = offer?.id
        ? await updateOffer(offer.id, payload())
        : await createOffer(payload());
      onSaved(res.offer);
      return res.offer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შენახვა ვერ მოხერხდა');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    const saved = await saveDraft();
    if (!saved) return;
    setSaving(true);
    try {
      const res = await sendOffer(saved.id);
      setPublicUrl(res.publicUrl);
      onSaved(res.offer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'გაგზავნა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    const saved = await saveDraft();
    if (!saved) return;
    setGeneratingPdf(true);
    setError('');
    try {
      const res = await generateOfferPdf(saved.id);
      onSaved(res.offer);
      const nextUrl = `/api/dmt/offers/${encodeURIComponent(saved.id)}/pdf?ts=${Date.now()}`;
      setPdfUrl(nextUrl);
      window.open(nextUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF გენერაცია ვერ მოხერხდა');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-navy/45 p-3 md:p-6">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-lg border border-bdr bg-sur shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-bdr bg-sur-2/60 px-5 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] text-text-3">
              {lead.id} · {lead.company || lead.contact || '—'}
            </div>
            <div className="text-[15px] font-bold text-navy">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-bdr bg-sur p-1.5 text-text-2 hover:border-red hover:text-red"
            title="დახურვა"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {error && (
            <div className="mx-5 mt-3 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
              {error}
            </div>
          )}

          {/* SECTION 1 — ITEMS */}
          <section className="border-b border-bdr">
            <div className="flex items-center justify-between border-b border-bdr bg-sur-2/40 px-5 py-2.5">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                1 · პროდუქტები
              </div>
              <div className="text-[11px] text-text-3">{items.length} ნივთი</div>
            </div>

            {items.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Package size={28} className="mx-auto mb-2 text-text-3" strokeWidth={1.5} />
                <div className="text-[12px] text-text-3">დაამატე პირველი ნივთი ქვემოთიდან.</div>
              </div>
            ) : (
              <div className="overflow-x-auto px-5 py-3">
                <div className="min-w-[860px]">
                  {/* Header row */}
                  <div className="grid grid-cols-[28px_1.6fr_56px_64px_88px_92px_88px_92px_28px] items-center gap-1.5 border border-bdr bg-sur-2 px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-text-3">
                    <span className="text-center">N</span>
                    <span>დასახელება</span>
                    <span className="text-center">განზ.</span>
                    <span className="text-right">რაოდ.</span>
                    <span className="text-right">ფასი</span>
                    <span className="text-right">ჯამი</span>
                    <span className="text-right">ხელობა</span>
                    <span className="text-right">ჯამი</span>
                    <span />
                  </div>

                  {/* Item rows */}
                  {items.map((item, index) => {
                    const lineProductTotal = item.qty * item.unitPrice;
                    const lineLaborTotal = item.qty * (item.laborPerUnit ?? 0);
                    return (
                      <div
                        key={`${item.source}-${item.sku ?? item.name}-${index}`}
                        className="grid grid-cols-[28px_1.6fr_56px_64px_88px_92px_88px_92px_28px] items-center gap-1.5 border-x border-b border-bdr px-2 py-1 hover:bg-sur-2/40"
                      >
                        <span className="text-center font-mono text-[11px] text-text-3">{index + 1}</span>
                        <div className="min-w-0">
                          <input
                            value={item.name}
                            onChange={(e) => setItem(index, {name: e.target.value})}
                            className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[12px] font-semibold text-navy hover:border-bdr focus:border-blue focus:bg-sur focus:outline-none"
                          />
                          <input
                            value={item.description ?? ''}
                            onChange={(e) => setItem(index, {description: e.target.value})}
                            placeholder="აღწერა / SKU"
                            className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[10.5px] text-text-3 hover:border-bdr focus:border-blue focus:bg-sur focus:outline-none"
                          />
                        </div>
                        <span className="text-center text-[11px] text-text-2">ცალი</span>
                        <input
                          type="number"
                          min={0}
                          value={item.qty}
                          onChange={(e) => setItem(index, {qty: Number(e.target.value)})}
                          className="rounded-md border border-bdr bg-sur-2 px-1.5 py-0.5 text-right font-mono text-[11.5px] focus:border-blue focus:outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => setItem(index, {unitPrice: Number(e.target.value)})}
                          className="rounded-md border border-bdr bg-sur-2 px-1.5 py-0.5 text-right font-mono text-[11.5px] focus:border-blue focus:outline-none"
                        />
                        <span className="text-right font-mono text-[11.5px] font-bold text-navy">
                          {lineProductTotal.toFixed(2)}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.laborPerUnit ?? 0}
                          onChange={(e) => setItem(index, {laborPerUnit: Number(e.target.value)})}
                          className="rounded-md border border-bdr bg-sur-2 px-1.5 py-0.5 text-right font-mono text-[11.5px] focus:border-blue focus:outline-none"
                        />
                        <span className="text-right font-mono text-[11.5px] font-bold text-navy">
                          {lineLaborTotal.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                          className="rounded p-1 text-text-3 transition-colors hover:bg-red-lt hover:text-red"
                          title="წაშლა"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Totals row in table footer */}
                  <div className="grid grid-cols-[28px_1.6fr_56px_64px_88px_92px_88px_92px_28px] items-center gap-1.5 border-x border-b border-bdr bg-sur-2/60 px-2 py-1.5 font-mono text-[11px] font-bold text-navy">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span className="text-right">{totals.subtotal.toFixed(2)}</span>
                    <span />
                    <span className="text-right">{totals.laborTotal.toFixed(2)}</span>
                    <span />
                  </div>
                </div>
              </div>
            )}

            {/* Add item controls */}
            <div className="border-t border-bdr bg-sur-2/30 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPicker((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    showPicker
                      ? 'border-blue bg-blue text-white'
                      : 'border-blue-bd bg-blue-lt text-blue hover:bg-blue hover:text-white'
                  }`}
                >
                  <Package size={14} /> ინვენტარიდან
                </button>

                <div className="flex items-end gap-1.5 rounded-md border border-bdr bg-sur p-2">
                  <div>
                    <div className="mb-0.5 px-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-3">დასახელება</div>
                    <input
                      value={custom.name}
                      onChange={(e) => setCustom((prev) => ({...prev, name: e.target.value}))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(); }}
                      placeholder="დასახელება ჩაწერე..."
                      className="h-8 w-44 rounded border border-bdr bg-sur-2 px-2 text-[12px] focus:border-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="mb-0.5 px-0.5 text-right font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-3">რაოდ.</div>
                    <input
                      type="number"
                      min={0}
                      value={custom.qty}
                      onChange={(e) => setCustom((prev) => ({...prev, qty: Number(e.target.value)}))}
                      className="h-8 w-16 rounded border border-bdr bg-sur-2 px-2 text-right font-mono text-[12px] focus:border-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="mb-0.5 px-0.5 text-right font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-3">ფასი ₾</div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={custom.unitPrice}
                      onChange={(e) => setCustom((prev) => ({...prev, unitPrice: Number(e.target.value)}))}
                      className="h-8 w-24 rounded border border-bdr bg-sur-2 px-2 text-right font-mono text-[12px] focus:border-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="mb-0.5 px-0.5 text-right font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-3">ხელობა ₾</div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={custom.laborPerUnit}
                      onChange={(e) => setCustom((prev) => ({...prev, laborPerUnit: Number(e.target.value)}))}
                      className="h-8 w-24 rounded border border-bdr bg-sur-2 px-2 text-right font-mono text-[12px] focus:border-blue focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCustomItem}
                    disabled={!custom.name.trim()}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur-2 px-3 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={13} /> დამატება
                  </button>
                </div>
              </div>
              {showPicker && (
                <div className="mt-3">
                  <InventoryPicker onPick={addInventoryItem} />
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2 — TERMS + SUMMARY */}
          <section className="grid gap-0 lg:grid-cols-[1fr_320px]">
            {/* Terms */}
            <div className="border-b border-bdr lg:border-b-0 lg:border-r">
              <div className="border-b border-bdr bg-sur-2/40 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                2 · პირობები
              </div>
              <div className="space-y-3 px-5 py-4">
                <Field label="📦 მიწოდების პირობები">
                  <textarea
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                    placeholder="მაგ. 14 დღე ხელშეკრულების გაფორმებიდან"
                    className="min-h-[60px] w-full rounded-md border border-bdr bg-sur-2 p-2.5 text-[12px] text-text focus:border-blue focus:outline-none"
                  />
                </Field>
                <Field label="💳 გადახდის პირობები">
                  <textarea
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="მაგ. 50% ავანსი, 50% მიწოდებისას"
                    className="min-h-[60px] w-full rounded-md border border-bdr bg-sur-2 p-2.5 text-[12px] text-text focus:border-blue focus:outline-none"
                  />
                </Field>
                <Field label="📝 შენიშვნა">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="დამატებითი ინფორმაცია…"
                    className="min-h-[80px] w-full rounded-md border border-bdr bg-sur-2 p-2.5 text-[12px] text-text focus:border-blue focus:outline-none"
                  />
                </Field>
              </div>
            </div>

            {/* Summary sidebar */}
            <aside className="bg-sur-2/40">
              <div className="border-b border-bdr px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                3 · ჯამი
              </div>
              <div className="space-y-3 px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-text-2">ვალუტა</span>
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="w-20 rounded-md border border-bdr bg-sur px-2 py-1 text-right font-mono text-[12px] focus:border-blue focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-text-2">მოგება %</span>
                  <input
                    type="number"
                    min={0}
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value))}
                    className="w-20 rounded-md border border-bdr bg-sur px-2 py-1 text-right font-mono text-[12px] focus:border-blue focus:outline-none"
                  />
                </div>

                <label className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-text-2">
                  <span className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={vatEnabled}
                      onChange={(e) => setVatEnabled(e.target.checked)}
                    />
                    დღგ
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={vatRate}
                    disabled={!vatEnabled}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="w-20 rounded-md border border-bdr bg-sur px-2 py-1 text-right font-mono text-[12px] focus:border-blue focus:outline-none disabled:opacity-50"
                  />
                </label>

                <div className="space-y-1.5 rounded-md border border-bdr bg-sur p-3 font-mono text-[12px]">
                  <SumLine label="ქვე-ჯამი" value={fmtMoney(totals.subtotal)} />
                  <SumLine label="ხელობა" value={fmtMoney(totals.laborTotal)} />
                  <SumLine label={`მოგება ${marginPercent}%`} value={fmtMoney(totals.marginAmount)} />
                  {vatEnabled && <SumLine label={`დღგ ${vatRate}%`} value={fmtMoney(totals.vatAmount ?? 0)} />}
                  <div className="mt-1.5 flex items-center justify-between border-t border-bdr pt-1.5 text-[14px] font-bold text-navy">
                    <span>სულ ჯამი</span>
                    <span>{fmtMoney(totals.grandTotal)}</span>
                  </div>
                </div>

                <label className="flex items-start gap-2 rounded-md border border-bdr bg-sur p-2.5 text-[11.5px] text-text-2">
                  <input
                    type="checkbox"
                    checked={includeMoneyBackGuarantee}
                    onChange={(e) => setIncludeMoneyBackGuarantee(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <b className="block text-[12px] font-bold text-navy">დაბრუნების გარანტია</b>
                    <span className="text-[10.5px] text-text-3">PDF-ში ჩაიწერება დაბრუნების ვალდებულება (3 თვიანი საცდელი პერიოდი)</span>
                  </span>
                </label>

                {publicUrl && (
                  <div className="rounded-md border border-grn-bd bg-grn-lt p-2.5 text-[12px] text-grn">
                    <div className="mb-1.5 inline-flex items-center gap-1 font-semibold">
                      <Check size={14} /> გაგზავნილი
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(publicUrl)}
                      className="flex w-full items-center justify-between gap-2 rounded border border-grn-bd bg-white/60 px-2 py-1.5 font-mono text-[10.5px] hover:bg-white"
                      title="დააკოპირე ლინკი"
                    >
                      <span className="truncate">{publicUrl}</span>
                      <Copy size={12} />
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </section>
        </div>

        {/* Footer actions */}
        <footer className="flex flex-wrap justify-end gap-2 border-t border-bdr bg-sur-2/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 py-2 text-[12px] font-semibold text-text-2 hover:border-bdr-2"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 py-2 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            შენახვა
          </button>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={saving || generatingPdf || items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-bd bg-blue-lt px-3 py-2 text-[12px] font-semibold text-blue hover:border-blue hover:bg-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingPdf ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}
            PDF გენერაცია
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={saving || items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-4 py-2 text-[12px] font-bold text-white hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
            კლიენტს გაგზავნა
          </button>
        </footer>
      </div>
      {pdfUrl && (
        <OfferPdfPreview
          url={pdfUrl}
          title={offer?.id ? `${offer.id} PDF` : 'ოფერი — PDF'}
          onClose={() => setPdfUrl('')}
        />
      )}
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-text-2">{label}</span>
      {children}
    </label>
  );
}

function SumLine({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between text-text-2">
      <span>{label}</span>
      <span className="font-bold text-navy">{value}</span>
    </div>
  );
}
