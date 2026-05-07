'use client';

import {useMemo, useState} from 'react';
import {BadgePercent, Check, Copy, FileText, LoaderCircle, Package, Plus, Send, StickyNote, Trash2, X} from 'lucide-react';
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
const phoneRe = /^[+\d\s\-()]+$/;

const buildWarrantyText = (months: number) =>
  `შენიშვნა: იმ შემთხვევაში, თუ სისტემით სარგებლობის შემთხვევაში დამკვეთის დანაზოგები არ იქნება მინიმუმ 3 ჯერ მეტი ვიდრე ყოველთვიური სააბონენტო გადასახადი, შემსრულებელი იღებს ვალდებულებას, რომ დამკვეთს დაუბრუნებს სისტემის ინტეგრაციაში გადახდილ თანხებს 100%-ით. საცდელი პერიოდი შეადგენს ${months} თვეს.`;

export function OfferEditor({lead, offer, onClose, onSaved}: Props) {
  const isNewOffer = !offer;
  const [items, setItems] = useState<OfferItem[]>(offer?.items ?? []);
  const [currency, setCurrency] = useState(offer?.currency ?? 'GEL');
  const [vatEnabled, setVatEnabled] = useState(
    isNewOffer ? true : offer?.vatRate !== null && offer?.vatRate !== undefined
  );
  const [vatRate, setVatRate] = useState(offer?.vatRate ?? 18);
  // Default 0 — user enters margin manually for each offer (no auto-calc bias).
  const [marginPercent, setMarginPercent] = useState(offer?.marginPercent ?? 0);
  const [marginAmountOverride, setMarginAmountOverride] = useState(
    offer?.marginAmountOverride != null ? offer.marginAmountOverride.toString() : ''
  );
  const [discountPercent, setDiscountPercent] = useState(
    offer?.discountPercent != null ? offer.discountPercent.toString() : ''
  );
  const [monthlySubscription, setMonthlySubscription] = useState(
    offer?.monthlySubscription != null ? offer.monthlySubscription.toString() : (isNewOffer ? '150' : '')
  );
  const [subscriptionRegularPrice, setSubscriptionRegularPrice] = useState(
    offer?.subscriptionRegularPrice != null ? offer.subscriptionRegularPrice.toString() : ''
  );
  const [includeMoneyBackGuarantee, setIncludeMoneyBackGuarantee] = useState(offer?.includeMoneyBackGuarantee ?? true);
  const [deliveryTerms] = useState(offer?.deliveryTerms ?? '');
  const [paymentTerms] = useState(offer?.paymentTerms ?? '');
  const [trialMonths, setTrialMonths] = useState<number>(3);
  const [trialMonthsInput, setTrialMonthsInput] = useState<string>('3');
  const [notes, setNotes] = useState(offer?.notes ?? buildWarrantyText(3));
  const [notesEdited, setNotesEdited] = useState<boolean>(!!offer?.notes);
  const [docNumberOverride, setDocNumberOverride] = useState(offer?.docNumberOverride?.toString() ?? '');
  const todayIso = new Date().toISOString().slice(0, 10);
  const [docDateOverride, setDocDateOverride] = useState(
    offer?.docDateOverride ?? (isNewOffer ? todayIso : '')
  );
  const [clientCompany, setClientCompany] = useState(offer?.clientCompany ?? lead.company ?? '');
  const [clientTaxId, setClientTaxId] = useState(offer?.clientTaxId ?? '');
  const [clientContact, setClientContact] = useState(offer?.clientContact ?? lead.contact ?? '');
  const [clientPhone, setClientPhone] = useState(offer?.clientPhone ?? lead.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const [error, setError] = useState('');

  const totals = useMemo(
    () => calculateOfferTotals(
      items,
      vatEnabled ? vatRate : null,
      marginPercent,
      marginAmountOverride.trim() ? Number(marginAmountOverride) : null,
      discountPercent.trim() ? Number(discountPercent) : null
    ),
    [discountPercent, items, marginAmountOverride, marginPercent, vatEnabled, vatRate]
  );

  const clientErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    const docNumber = Number(docNumberOverride);
    if (docNumberOverride.trim() && (!Number.isInteger(docNumber) || docNumber < 1)) {
      errs.docNumberOverride = 'დოკუმენტის ნომერი მთელი რიცხვი უნდა იყოს';
    }
    if (clientCompany.length > 200) errs.clientCompany = 'კომპანია მაქს. 200 სიმბოლო';
    if (clientTaxId.trim() && !/^\d{9}$/.test(clientTaxId.trim())) {
      errs.clientTaxId = 'საიდ. კოდი 9-ნიშნა უნდა იყოს ან ცარიელი';
    }
    if (clientContact.length > 200) errs.clientContact = 'დირექტორი მაქს. 200 სიმბოლო';
    if (clientPhone.trim() && !phoneRe.test(clientPhone.trim())) {
      errs.clientPhone = 'ტელეფონი მხოლოდ ციფრებს/+, -, () და space-ს შეიცავს';
    }
    return errs;
  }, [docNumberOverride, clientCompany, clientTaxId, clientContact, clientPhone]);

  const customInvalid =
    !custom.name.trim()
    || Number(custom.qty) <= 0
    || Number(custom.unitPrice) < 0
    || Number(custom.laborPerUnit) < 0;

  const validationErrors = useMemo(() => {
    const list: string[] = [];
    if (items.length === 0) list.push('დაამატე მინიმუმ 1 ნივთი');
    items.forEach((item, index) => {
      if (!item.name.trim()) list.push(`ნივთი #${index + 1}: დასახელება აუცილებელია`);
      if (!Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0) list.push(`ნივთი #${index + 1}: რაოდენობა > 0`);
      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) list.push(`ნივთი #${index + 1}: ფასი ≥ 0`);
      if ((item.laborPerUnit ?? 0) < 0) list.push(`ნივთი #${index + 1}: ხელობა ≥ 0`);
    });
    Object.values(clientErrors).forEach((value) => list.push(value));
    if (marginAmountOverride.trim() && Number(marginAmountOverride) < 0) {
      list.push('Margin override must be >= 0');
    }
    if (subscriptionRegularPrice.trim() && Number(subscriptionRegularPrice) < 0) {
      list.push('Subscription regular price must be >= 0');
    }
    if (
      subscriptionRegularPrice.trim()
      && monthlySubscription.trim()
      && Number(subscriptionRegularPrice) <= Number(monthlySubscription)
    ) {
      list.push('Subscription regular price must be greater than current subscription');
    }
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) list.push('ვალუტა 3-ასოიანი კოდი უნდა იყოს');
    if (vatEnabled && (Number(vatRate) < 0 || Number(vatRate) > 100)) list.push('დღგ 0-100% დიაპაზონშია');
    if (Number(marginPercent) < 0 || Number(marginPercent) > 100) list.push('მოგება 0-100% დიაპაზონშია');
    if (monthlySubscription.trim() && Number(monthlySubscription) < 0) list.push('სააბონენტო ≥ 0');
    if (discountPercent.trim() && (Number(discountPercent) < 0 || Number(discountPercent) > 100)) list.push('ფასდაკლება 0-100% დიაპაზონშია');
    // Trial period only required when the warranty/notes section is enabled.
    if (includeMoneyBackGuarantee) {
      const trialMonthsRaw = trialMonthsInput.trim();
      const trialMonthsNum = Number(trialMonthsRaw);
      if (!trialMonthsRaw || !Number.isFinite(trialMonthsNum) || trialMonthsNum < 1 || trialMonthsNum > 24) {
        list.push('საცდელი პერიოდი აუცილებელია (1-24 თვე)');
      }
    }
    return list;
  }, [items, clientErrors, currency, vatEnabled, vatRate, marginPercent, marginAmountOverride, discountPercent, monthlySubscription, subscriptionRegularPrice, trialMonthsInput, includeMoneyBackGuarantee]);

  const trialMonthsInvalid = (() => {
    if (!includeMoneyBackGuarantee) return false;
    const raw = trialMonthsInput.trim();
    const n = Number(raw);
    return !raw || !Number.isFinite(n) || n < 1 || n > 24;
  })();

  const hasValidationErrors = validationErrors.length > 0;

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
    if (customInvalid) return;
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
    marginAmountOverride: marginAmountOverride.trim() ? Number(marginAmountOverride) : null,
    discountPercent: discountPercent.trim() ? Number(discountPercent) : null,
    includeMoneyBackGuarantee,
    currency,
    deliveryTerms,
    paymentTerms,
    notes,
    monthlySubscription: monthlySubscription.trim() ? Number(monthlySubscription) : null,
    subscriptionRegularPrice: subscriptionRegularPrice.trim() ? Number(subscriptionRegularPrice) : null,
    docNumberOverride: docNumberOverride.trim() ? Number(docNumberOverride) : null,
    docDateOverride: docDateOverride || null,
    clientCompany: clientCompany.trim() || null,
    clientTaxId: clientTaxId.trim() || null,
    clientContact: clientContact.trim() || null,
    clientPhone: clientPhone.trim() || null
  });

  const saveDraft = async () => {
    if (hasValidationErrors) {
      setError('გაასწორე შეცდომები შენახვამდე.');
      return null;
    }
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
          {hasValidationErrors && (
            <div className="mx-5 mt-3 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
              <div className="font-bold">გაასწორე შეცდომები ({validationErrors.length}):</div>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {validationErrors.map((err, index) => <li key={`${err}-${index}`}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* SECTION 0 — CLIENT PDF FIELDS */}
          <section className="border-b border-bdr">
            <div className="border-b border-bdr bg-sur-2/40 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              0 · კლიენტი
            </div>
            <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
              <Field label="დოკუმენტის ნომერი">
                <input
                  type="number"
                  min={1}
                  value={docNumberOverride}
                  onChange={(e) => setDocNumberOverride(e.target.value)}
                  placeholder="auto"
                  className={`h-9 w-full rounded-md border bg-sur-2 px-2.5 text-[12px] focus:outline-none ${clientErrors.docNumberOverride ? 'border-red focus:border-red' : 'border-bdr focus:border-blue'}`}
                />
              </Field>
              <Field label="თარიღი">
                <input
                  type="date"
                  value={docDateOverride}
                  onChange={(e) => setDocDateOverride(e.target.value)}
                  className={`h-9 w-full rounded-md border bg-sur-2 px-2.5 text-[12px] focus:outline-none ${clientErrors.docDateOverride ? 'border-red focus:border-red' : 'border-bdr focus:border-blue'}`}
                />
              </Field>
              <Field label="კომპანია">
                <input
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder={lead.company || 'კომპანია'}
                  className={`h-9 w-full rounded-md border bg-sur-2 px-2.5 text-[12px] focus:outline-none ${clientErrors.clientCompany ? 'border-red focus:border-red' : 'border-bdr focus:border-blue'}`}
                />
              </Field>
              <Field label="საიდ. კოდი">
                <input
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value)}
                  placeholder="204923262"
                  className={`h-9 w-full rounded-md border bg-sur-2 px-2.5 text-[12px] focus:outline-none ${clientErrors.clientTaxId ? 'border-red focus:border-red' : 'border-bdr focus:border-blue'}`}
                />
              </Field>
              <Field label="დირექტორი">
                <input
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder={lead.contact || 'სახელი გვარი'}
                  className={`h-9 w-full rounded-md border bg-sur-2 px-2.5 text-[12px] focus:outline-none ${clientErrors.clientContact ? 'border-red focus:border-red' : 'border-bdr focus:border-blue'}`}
                />
              </Field>
              <Field label="ტელეფონი">
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder={lead.phone || '+995'}
                  className={`h-9 w-full rounded-md border bg-sur-2 px-2.5 text-[12px] focus:outline-none ${clientErrors.clientPhone ? 'border-red focus:border-red' : 'border-bdr focus:border-blue'}`}
                />
              </Field>
            </div>
          </section>

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
                    const itemNameError = !item.name.trim();
                    const itemQtyError = !Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0;
                    const itemPriceError = !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0;
                    const itemLaborError = (item.laborPerUnit ?? 0) < 0;
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
                            title={itemNameError ? 'დასახელება აუცილებელია' : undefined}
                            className={`w-full rounded-md border bg-transparent px-1.5 py-0.5 text-[12px] font-semibold text-navy hover:border-bdr focus:bg-sur focus:outline-none ${itemNameError ? 'border-red bg-red-lt focus:border-red' : 'border-transparent focus:border-blue'}`}
                          />
                        </div>
                        <span className="text-center text-[11px] text-text-2">ცალი</span>
                        <input
                          type="number"
                          min={0}
                          value={item.qty}
                          onChange={(e) => setItem(index, {qty: Number(e.target.value)})}
                          title={itemQtyError ? 'რაოდენობა > 0' : undefined}
                          className={`rounded-md border bg-sur-2 px-1.5 py-0.5 text-right font-mono text-[11.5px] focus:outline-none ${itemQtyError ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => setItem(index, {unitPrice: Number(e.target.value)})}
                          title={itemPriceError ? 'ფასი ≥ 0' : undefined}
                          className={`rounded-md border bg-sur-2 px-1.5 py-0.5 text-right font-mono text-[11.5px] focus:outline-none ${itemPriceError ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
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
                          title={itemLaborError ? 'ხელობა ≥ 0' : undefined}
                          className={`rounded-md border bg-sur-2 px-1.5 py-0.5 text-right font-mono text-[11.5px] focus:outline-none ${itemLaborError ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
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
                      className={`h-8 w-44 rounded border bg-sur-2 px-2 text-[12px] focus:outline-none ${!custom.name.trim() ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
                    />
                  </div>
                  <div>
                    <div className="mb-0.5 px-0.5 text-right font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-3">რაოდ.</div>
                    <input
                      type="number"
                      min={0}
                      value={custom.qty}
                      onChange={(e) => setCustom((prev) => ({...prev, qty: Number(e.target.value)}))}
                      className={`h-8 w-16 rounded border bg-sur-2 px-2 text-right font-mono text-[12px] focus:outline-none ${Number(custom.qty) <= 0 ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
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
                      className={`h-8 w-24 rounded border bg-sur-2 px-2 text-right font-mono text-[12px] focus:outline-none ${Number(custom.unitPrice) < 0 ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
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
                      className={`h-8 w-24 rounded border bg-sur-2 px-2 text-right font-mono text-[12px] focus:outline-none ${Number(custom.laborPerUnit) < 0 ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCustomItem}
                    disabled={customInvalid}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-blue bg-blue px-3 text-[12px] font-semibold text-white hover:bg-navy-2 disabled:cursor-not-allowed disabled:border-bdr disabled:bg-sur-2 disabled:text-text-3 disabled:opacity-50"
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
                {/* Discounts block — sits above the warranty toggle so it's always visible */}
                <div className="space-y-2 rounded-md border border-bdr bg-sur p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                    ფასდაკლებები
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 text-[11.5px] font-semibold text-text-2">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={discountPercent.trim().length > 0}
                      onChange={(e) => setDiscountPercent(e.target.checked ? '10' : '')}
                    />
                    <span className="flex-1">
                      <span className="inline-flex items-center gap-1.5">
                        <BadgePercent size={14} className="text-red" />
                        ფასდაკლება პროდუქტებზე
                      </span>
                      {discountPercent.trim().length > 0 && (
                        <span className="mt-1 flex items-center justify-between gap-2 text-[11px] font-normal text-text-3">
                          <span>თანხა / პროცენტი:</span>
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              value={discountPercent}
                              onChange={(e) => setDiscountPercent(e.target.value)}
                              autoFocus
                              className={`w-20 rounded-md border bg-sur-2 px-2 py-1 text-right font-mono text-[12px] focus:outline-none ${(Number(discountPercent) < 0 || Number(discountPercent) > 100) ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
                            />
                            <span className="text-text-3">%</span>
                          </span>
                        </span>
                      )}
                    </span>
                  </label>
                </div>

                {/* Subscription + its discount toggle — sits above the warranty block */}
                <div className="space-y-2 rounded-md border border-bdr bg-sur p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold text-text-2">სააბონენტო ₾/თვე</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={monthlySubscription}
                      onChange={(e) => setMonthlySubscription(e.target.value)}
                      placeholder="150"
                      className={`w-24 rounded-md border bg-sur-2 px-2 py-1 text-right font-mono text-[12px] focus:outline-none ${monthlySubscription.trim() && Number(monthlySubscription) < 0 ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-text-2">
                    <input
                      type="checkbox"
                      checked={subscriptionRegularPrice.trim().length > 0}
                      onChange={(e) => setSubscriptionRegularPrice(e.target.checked ? '200' : '')}
                    />
                    <BadgePercent size={12} className="text-red" />
                    ფასდაკლება სააბონენტოზე
                    {subscriptionRegularPrice.trim().length > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={subscriptionRegularPrice}
                          onChange={(e) => setSubscriptionRegularPrice(e.target.value)}
                          title="წინა (სტანდარტული) თანხა"
                          className={`w-20 rounded-md border bg-sur-2 px-2 py-1 text-right font-mono text-[12px] focus:outline-none ${
                            Number(subscriptionRegularPrice) < 0
                            || (monthlySubscription.trim() && Number(subscriptionRegularPrice) <= Number(monthlySubscription))
                              ? 'border-red bg-red-lt focus:border-red'
                              : 'border-bdr focus:border-blue'
                          }`}
                        />
                        <span className="text-text-3">₾</span>
                      </span>
                    )}
                  </label>
                </div>

                <label className="flex items-start gap-2 rounded-md border border-bdr bg-sur p-2.5 text-[11.5px] text-text-2 hover:border-blue/60 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeMoneyBackGuarantee}
                    onChange={(e) => setIncludeMoneyBackGuarantee(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <b className="inline-flex items-center gap-1.5 text-[12px] font-bold text-navy">
                      <StickyNote size={13} className="text-blue" />
                      შენიშვნის ჩასმა (დაბრუნების გარანტია)
                    </b>
                    <span className="block text-[10.5px] text-text-3">თუ მონიშნავ, PDF-ში ჩაიწერება შენიშვნა + დაბრუნების ვალდებულება + საცდელი პერიოდი. ისე — არა.</span>
                  </span>
                </label>

                {includeMoneyBackGuarantee && (
                <>
                <div className={`flex items-center gap-2 rounded-md border bg-sur-2 px-3 py-2 ${trialMonthsInvalid ? 'border-red' : 'border-bdr'}`}>
                  <span className="text-[11.5px] font-semibold text-text-2">
                    საცდელი პერიოდი (თვე) <span className="text-red">*</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={trialMonthsInput}
                    onChange={(e) => {
                      setTrialMonthsInput(e.target.value);
                      const parsed = Number(e.target.value);
                      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 24) {
                        setTrialMonths(parsed);
                        if (!notesEdited) setNotes(buildWarrantyText(parsed));
                      }
                    }}
                    onBlur={() => {
                      const raw = trialMonthsInput.trim();
                      if (!raw) return;
                      const clamped = Math.max(1, Math.min(24, Number(raw) || trialMonths));
                      setTrialMonths(clamped);
                      setTrialMonthsInput(String(clamped));
                      if (!notesEdited) setNotes(buildWarrantyText(clamped));
                    }}
                    className={`w-16 rounded-md border bg-sur px-2 py-1 text-right font-mono text-[12px] focus:outline-none ${trialMonthsInvalid ? 'border-red focus:border-red' : 'border-bdr focus:border-blue'}`}
                  />
                  <span className="ml-auto text-[10.5px] text-text-3">→ ჩასმულია შენიშვნაში</span>
                </div>
                <Field label={<span className="inline-flex items-center gap-1.5"><StickyNote size={12} className="text-blue" /> შენიშვნა</span>}>
                  <textarea
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setNotesEdited(true); }}
                    className="min-h-[160px] w-full rounded-md border border-bdr bg-sur-2 p-2.5 text-[12px] text-text focus:border-blue focus:outline-none"
                  />
                  {notesEdited && (
                    <button
                      type="button"
                      onClick={() => { setNotes(buildWarrantyText(trialMonths)); setNotesEdited(false); }}
                      className="mt-1 text-[10.5px] font-semibold text-blue hover:underline"
                    >
                      ↺ გაანულე საწყისი ტექსტით
                    </button>
                  )}
                </Field>
                </>
                )}
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
                    onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                    className={`w-20 rounded-md border bg-sur px-2 py-1 text-right font-mono text-[12px] focus:outline-none ${/^[A-Z]{3}$/.test(currency.trim().toUpperCase()) ? 'border-bdr focus:border-blue' : 'border-red bg-red-lt focus:border-red'}`}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-text-2">კომერციული მოგება</span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(Number(e.target.value))}
                      className={`w-20 rounded-md border bg-sur px-2 py-1 text-right font-mono text-[12px] focus:outline-none ${Number(marginPercent) < 0 || Number(marginPercent) > 100 ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
                    />
                    <span className="text-[11px] text-text-3">%</span>
                  </div>
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
                    className={`w-20 rounded-md border bg-sur px-2 py-1 text-right font-mono text-[12px] focus:outline-none disabled:opacity-50 ${vatEnabled && (Number(vatRate) < 0 || Number(vatRate) > 100) ? 'border-red bg-red-lt focus:border-red' : 'border-bdr focus:border-blue'}`}
                  />
                </label>

                <div className="space-y-1.5 rounded-md border border-bdr bg-sur p-3 font-mono text-[12px]">
                  <SumLine label="ქვე-ჯამი" value={fmtMoney(totals.subtotal)} />
                  <SumLine label="ხელობა" value={fmtMoney(totals.laborTotal)} />
                  <SumLine label={`მოგება ${marginPercent}%`} value={fmtMoney(totals.marginAmount)} />
                  {vatEnabled && <SumLine label={`დღგ ${vatRate}%`} value={fmtMoney(totals.vatAmount ?? 0)} />}
                  {totals.discountAmount > 0 && (
                    <SumLine label={`ფასდაკლება ${totals.discountPercent}%`} value={`-${fmtMoney(totals.discountAmount)}`} accent="green" />
                  )}
                  <div className="mt-1.5 flex items-center justify-between border-t border-bdr pt-1.5 text-[14px] font-bold text-navy">
                    <span>სულ ჯამი</span>
                    <span>{fmtMoney(totals.grandTotal)}</span>
                  </div>
                </div>

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
            disabled={saving || hasValidationErrors}
            title={hasValidationErrors ? 'გაასწორე შეცდომები' : undefined}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 py-2 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            შენახვა
          </button>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={saving || generatingPdf || hasValidationErrors}
            title={hasValidationErrors ? 'გაასწორე შეცდომები' : undefined}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-bd bg-blue-lt px-3 py-2 text-[12px] font-semibold text-blue hover:border-blue hover:bg-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingPdf ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}
            PDF გენერაცია
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={saving || hasValidationErrors}
            title={hasValidationErrors ? 'გაასწორე შეცდომები' : undefined}
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

function Field({label, children, required}: {label: React.ReactNode; children: React.ReactNode; required?: boolean}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-text-2">
        {label}
        {required && <span className="ml-0.5 text-red">*</span>}
      </span>
      {children}
    </label>
  );
}

function SumLine({label, value, accent}: {label: string; value: string; accent?: 'green'}) {
  return (
    <div className="flex items-center justify-between text-text-2">
      <span>{label}</span>
      <span className={`font-bold ${accent === 'green' ? 'text-grn' : 'text-navy'}`}>{value}</span>
    </div>
  );
}
