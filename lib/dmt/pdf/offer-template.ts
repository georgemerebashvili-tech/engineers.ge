import 'server-only';
import {readFile} from 'fs/promises';
import path from 'path';
import {PDFDocument, type PDFFont, type PDFImage, type PDFPage, type RGB} from 'pdf-lib';
import {normalizeOfferItems, type DmtOffer, type OfferItem} from '@/lib/dmt/offers-store';
import {PDF_COLORS} from '@/lib/dmt/pdf/colors';
import {loadOfferPdfFonts, type OfferPdfFonts} from '@/lib/dmt/pdf/fonts';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 60;
// BOTTOM clears the footer rule (~94pt) + small breathing room to prevent
// body content from colliding with the Sakpatenti citation block.
const BOTTOM = 110;
const CONTENT_W = PAGE_W - M * 2;

export type OfferPdfLead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  taxId?: string;
};

export type OfferPdfResult = {
  bytes: Uint8Array;
  docNumber: number;
  total: number;
};

type LineItem = OfferItem & {
  lineSubtotal: number;
  lineLabor: number;
  lineTotal: number;
};

type Totals = {
  items: LineItem[];
  subtotal: number;
  laborTotal: number;
  sum: number;
  marginPercent: number;
  marginAmount: number;
  grandBeforeDiscount: number;
  discountPercent: number | null;
  discountAmount: number;
  grandTotal: number;
  hasLabor: boolean;
};

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  fonts: OfferPdfFonts;
  y: number;
  logo?: PDFImage;
  wordmark?: PDFImage;
  sakpatenti?: PDFImage;
  docNumber?: number;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function fmtMoney(value: number) {
  // Compact format for table cells (header column says price/total in GEL implicitly).
  return new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value);
}

function fmtMoneyWithCurrency(value: number) {
  return `${new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value)} GEL`;
}

function fmtMoneyLari(value: number) {
  // Compact Lari format used in body copy: "2370₾" / "1185 ₾".
  const n = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value);
  return `${n}₾`;
}

function fmtDate(value: string | null | undefined) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function calculateOfferPdfTotals(offer: DmtOffer): Totals {
  const items = normalizeOfferItems(offer.items).map((item) => {
    const lineSubtotal = money(item.qty * item.unitPrice);
    const lineLabor = money(item.qty * (item.laborPerUnit ?? 0));
    return {
      ...item,
      lineSubtotal,
      lineLabor,
      lineTotal: money(lineSubtotal + lineLabor)
    };
  });
  const subtotal = money(items.reduce((sum, item) => sum + item.lineSubtotal, 0));
  const laborTotal = money(items.reduce((sum, item) => sum + item.lineLabor, 0));
  const sum = money(subtotal + laborTotal);
  const marginPercent = Number.isFinite(Number(offer.marginPercent)) ? Math.max(0, Number(offer.marginPercent)) : 15;
  const marginAmountOverride = offer.marginAmountOverride == null || !Number.isFinite(Number(offer.marginAmountOverride))
    ? null
    : Math.max(0, money(Number(offer.marginAmountOverride)));
  const marginAmount = marginAmountOverride === null ? money(sum * marginPercent / 100) : marginAmountOverride;
  const effectiveMarginPercent = marginAmountOverride !== null && sum > 0
    ? money((marginAmountOverride / sum) * 100)
    : marginPercent;
  const grandBeforeDiscount = money(sum + marginAmount);
  const discountPercent = offer.discountPercent == null || !Number.isFinite(Number(offer.discountPercent))
    ? null
    : Math.max(0, Math.min(100, money(Number(offer.discountPercent))));
  const discountAmount = discountPercent == null ? 0 : money(grandBeforeDiscount * discountPercent / 100);
  const grandTotal = money(grandBeforeDiscount - discountAmount);
  return {
    items,
    subtotal,
    laborTotal,
    sum,
    marginPercent: effectiveMarginPercent,
    marginAmount,
    grandBeforeDiscount,
    discountPercent,
    discountAmount,
    grandTotal,
    hasLabor: items.some((item) => (item.laborPerUnit ?? 0) > 0)
  };
}

async function readAsset(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {}
  }
  return null;
}

async function loadImage(pdf: PDFDocument, candidates: string[]) {
  const bytes = await readAsset(candidates);
  if (!bytes) return undefined;
  try {
    return await pdf.embedPng(bytes);
  } catch {
    try {
      return await pdf.embedJpg(bytes);
    } catch {
      return undefined;
    }
  }
}

function width(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

function safeText(ctx: DrawCtx, text: string) {
  if (ctx.fonts.unicode) return text;
  return text.replace(/[^\x00-\x7F]/g, '?');
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (width(font, test, size) <= maxWidth) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    if (width(font, word, size) <= maxWidth) {
      line = word;
    } else {
      let chunk = '';
      for (const ch of word) {
        const testChunk = chunk + ch;
        if (width(font, testChunk, size) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = testChunk;
        }
      }
      line = chunk;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawText(
  ctx: DrawCtx,
  text: string,
  x: number,
  y: number,
  size = 10,
  opts: {bold?: boolean; color?: RGB; maxWidth?: number; align?: 'left' | 'right' | 'center'} = {}
) {
  const font = opts.bold ? ctx.fonts.bold : ctx.fonts.regular;
  const clean = safeText(ctx, text);
  const line = opts.maxWidth ? wrapText(clean, font, size, opts.maxWidth)[0] ?? '' : clean;
  const lineWidth = width(font, line, size);
  const drawX =
    opts.align === 'right'
      ? x - lineWidth
      : opts.align === 'center'
      ? x - lineWidth / 2
      : x;
  ctx.page.drawText(line, {
    x: drawX,
    y,
    size,
    font,
    color: opts.color ?? PDF_COLORS.text
  });
}

type RichSegment = {text: string; bold?: boolean};

function drawWrappedRich(
  ctx: DrawCtx,
  segments: RichSegment[],
  x: number,
  y: number,
  maxWidth: number,
  size = 10,
  lineGap = 4,
) {
  // Tokenize each segment into words (preserving spaces) tagged with bold/regular.
  type Token = {text: string; bold: boolean};
  const tokens: Token[] = [];
  segments.forEach((seg) => {
    const clean = safeText(ctx, seg.text);
    const parts = clean.split(/(\s+)/).filter((p) => p.length > 0);
    parts.forEach((p) => tokens.push({text: p, bold: !!seg.bold}));
  });

  const lineH = size + lineGap;
  let cursorX = x;
  let cursorY = y;
  let lineHeight = 0;

  const drawToken = (token: Token, atX: number, atY: number) => {
    const font = token.bold ? ctx.fonts.bold : ctx.fonts.regular;
    ctx.page.drawText(token.text, {x: atX, y: atY, size, font, color: PDF_COLORS.text});
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    const font = tok.bold ? ctx.fonts.bold : ctx.fonts.regular;
    const w = font.widthOfTextAtSize(tok.text, size);
    if (cursorX + w > x + maxWidth && cursorX > x) {
      // wrap
      cursorY -= lineH;
      cursorX = x;
      lineHeight += lineH;
      // skip leading whitespace token after wrap
      if (/^\s+$/.test(tok.text)) continue;
    }
    drawToken(tok, cursorX, cursorY);
    cursorX += w;
  }
  return lineHeight + lineH;
}

function drawWrapped(ctx: DrawCtx, text: string, x: number, y: number, maxWidth: number, size = 10, lineGap = 4) {
  const lines = wrapText(safeText(ctx, text), ctx.fonts.regular, size, maxWidth);
  lines.forEach((line, index) => {
    ctx.page.drawText(line, {
      x,
      y: y - index * (size + lineGap),
      size,
      font: ctx.fonts.regular,
      color: PDF_COLORS.text
    });
  });
  return lines.length * (size + lineGap);
}

function drawRule(ctx: DrawCtx, y: number) {
  ctx.page.drawLine({start: {x: M, y}, end: {x: PAGE_W - M, y}, thickness: 0.8, color: PDF_COLORS.line});
}

function drawMetadataTable(
  ctx: DrawCtx,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  w: number,
) {
  // Reference PDF renders metadata as plain rows — no borders, no fills, no rules.
  const rowH = 32;
  const labelW = 200;
  const h = rows.length * rowH;
  rows.forEach(([label, value], index) => {
    const ry = y - (index + 1) * rowH + 6;
    drawText(ctx, label, x, ry, 9, {color: PDF_COLORS.muted, maxWidth: labelW - 16});
    // Value cell may wrap into 2 lines for long filenames.
    const valueLines = wrapText(safeText(ctx, value), ctx.fonts.regular, 9, w - labelW);
    valueLines.slice(0, 2).forEach((line, lineIndex) => {
      drawText(ctx, line, x + labelW, ry - lineIndex * 12, 9, {color: PDF_COLORS.text});
    });
  });
  return h;
}

function drawBox(
  ctx: DrawCtx,
  title: string,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  w: number,
  opts: {boldFirstRowValue?: boolean} = {},
) {
  const rowH = 26;
  const h = 34 + rows.length * rowH;
  ctx.page.drawRectangle({x, y: y - h, width: w, height: h, borderColor: PDF_COLORS.line, borderWidth: 1});
  ctx.page.drawRectangle({x, y: y - 27, width: w, height: 27, color: PDF_COLORS.soft, borderColor: PDF_COLORS.line, borderWidth: 1});
  drawText(ctx, `${title}:`, x + 12, y - 19, 11, {bold: true, color: PDF_COLORS.text});
  rows.forEach(([label, value], index) => {
    const ry = y - 47 - index * rowH;
    drawText(ctx, label, x + 12, ry, 8.5, {color: PDF_COLORS.muted});
    const isBold = !!opts.boldFirstRowValue && index === 0;
    drawText(ctx, value || '-', x + 175, ry, 9, {bold: isBold, color: PDF_COLORS.text, maxWidth: w - 190});
  });
  return h;
}

function addPage(ctx: DrawCtx, _label?: string) {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - M;
  // Every continuation page reuses the standard small header so doc/topic context
  // is preserved across overflow + signature pages. docNumber is set in renderOfferPdf
  // before any drawIntro/drawItems work, so it's safe to consult here.
  if (ctx.docNumber != null) {
    drawSmallHeader(ctx, 'კომერციული წინადადება', ctx.docNumber);
  }
}

function ensureSpace(ctx: DrawCtx, needed: number, label?: string) {
  if (ctx.y - needed < BOTTOM) addPage(ctx, label);
}

function formatDocDateDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function drawFirstPage(ctx: DrawCtx, offer: DmtOffer, lead: OfferPdfLead, docNumber: number, docDate: string) {
  // Page 1 header: large sazeo wordmark only, centered.
  const LOGO_TOP_GAP = 80;
  const WORDMARK_SCALE = 0.30;
  let logoBottom = PAGE_H - LOGO_TOP_GAP;

  if (ctx.wordmark) {
    const dims = ctx.wordmark.scale(WORDMARK_SCALE);
    const logoY = PAGE_H - LOGO_TOP_GAP - dims.height;
    ctx.page.drawImage(ctx.wordmark, {x: PAGE_W / 2 - dims.width / 2, y: logoY, width: dims.width, height: dims.height});
    logoBottom = logoY;
  } else if (ctx.logo) {
    const dims = ctx.logo.scale(0.11);
    const logoY = PAGE_H - LOGO_TOP_GAP - dims.height;
    ctx.page.drawImage(ctx.logo, {x: PAGE_W / 2 - dims.width / 2, y: logoY, width: dims.width, height: dims.height});
    logoBottom = logoY;
  } else {
    drawText(ctx, 'sazeo', PAGE_W / 2, PAGE_H - 56, 36, {bold: true, align: 'center', color: PDF_COLORS.navy});
    logoBottom = PAGE_H - 100;
  }

  let y = logoBottom - 60;
  const metaRows: Array<[string, string]> = [
    ['დოკუმენტი', `პროცედურების მართვის ფაილი SOP.8.2.5.COFR.${docNumber}`],
    ['ფაილის შინაარსი', `SOP-8.2.5-COFR-${docNumber} კომერციული წინადადება .docx`],
    ['დოკუმენტის ვერსია', 'V.1-25/2026']
  ];
  y -= drawMetadataTable(ctx, metaRows, M, y, CONTENT_W);

  y -= 40;
  drawText(ctx, 'კომერციული წინადადება', PAGE_W / 2, y, 18, {bold: true, align: 'center', color: PDF_COLORS.navy});
  y -= 32;
  const docDateFmt = formatDocDateDDMMYYYY(docDate);
  drawText(ctx, `დოკუმენტის N SOP.8.2.5.COFR.${docNumber}.${docDateFmt}`, PAGE_W / 2, y, 10, {bold: true, align: 'center', color: PDF_COLORS.text});
  y -= 48;

  const providerRows: Array<[string, string]> = [
    ['დასახელება:', 'შპს ციფრული მართვის ტექნოლოგიები'],
    ['საიდენტიფიკაციო კოდი:', '405285926'],
    ['მომსახურე ბანკი:', 'სს საქართველოს ბანკი'],
    ['ანგარიშსწორების ანგარიში:', 'GE94BG0000000101388853GEL'],
    ['ბანკის კოდი:', 'BAGAGE22']
  ];
  y -= drawBox(ctx, 'მომსახურების გამწევი', providerRows, M, y, CONTENT_W, {boldFirstRowValue: true}) + 32;

  // Recipient company name rendered bold for emphasis.
  const clientRows: Array<[string, string]> = [
    ['დასახელება:', lead.company || lead.contact || lead.id],
    ['საიდენტიფიკაციო კოდი:', lead.taxId || '-']
  ];
  drawBox(ctx, 'მომსახურების მიმღები', clientRows, M, y, CONTENT_W, {boldFirstRowValue: true});
}

function drawSmallHeader(ctx: DrawCtx, title: string, docNumber: number) {
  // Matches the reference: 3 stacked lines top-left + rule + sazeo wordmark top-right.
  const size = 7.5;

  // Line 1 — page indicator drawn by drawFooters() at PAGE_H - 28; we leave that alone.

  // Line 2 — დოკუმენტი: <bold docId> ...regular suffix
  const docLabel = 'დოკუმენტი: ';
  const docId = `SOP-8.2.5-COFR-${docNumber}`;
  const docSuffix = ' კომერციული წინადადება .docx';
  const docLabelW = ctx.fonts.regular.widthOfTextAtSize(safeText(ctx, docLabel), size);
  const docIdW = ctx.fonts.bold.widthOfTextAtSize(safeText(ctx, docId), size);
  const docY = PAGE_H - 42;
  drawText(ctx, docLabel, M, docY, size, {color: PDF_COLORS.muted});
  drawText(ctx, docId, M + docLabelW, docY, size, {bold: true, color: PDF_COLORS.text});
  drawText(ctx, docSuffix, M + docLabelW + docIdW, docY, size, {color: PDF_COLORS.muted, maxWidth: CONTENT_W - docLabelW - docIdW - 90});

  // Line 3 — შინაარსი:    <bold title> (extra gap before bold value to mirror reference visual)
  const subjLabel = 'შინაარსი:';
  const subjGap = '    '; // visual indent like the reference renders it
  const subjLabelW = ctx.fonts.regular.widthOfTextAtSize(safeText(ctx, subjLabel + subjGap), size);
  const subjY = PAGE_H - 54;
  drawText(ctx, subjLabel, M, subjY, size, {color: PDF_COLORS.muted});
  drawText(ctx, title, M + subjLabelW, subjY, size, {bold: true, color: PDF_COLORS.text, maxWidth: CONTENT_W - subjLabelW});

  // Thin blue rule below header.
  ctx.page.drawLine({
    start: {x: M, y: PAGE_H - 62},
    end: {x: PAGE_W - M, y: PAGE_H - 62},
    thickness: 0.8,
    color: PDF_COLORS.navy,
  });

  ctx.y = PAGE_H - 86;
}

function drawIntro(ctx: DrawCtx, lead: OfferPdfLead) {
  drawText(ctx, '1. კომერციული წინადადება', PAGE_W / 2, ctx.y, 14, {bold: true, align: 'center', color: PDF_COLORS.blue});
  ctx.y -= 28;
  ctx.y -= drawWrapped(
    ctx,
    `${lead.company || lead.contact || 'დამკვეთის'} საინჟინრო სისტემების დათვალიერების შედეგად დადგინდა, რომ შენობაში შესაძლებელია HVAC სისტემების ავტომატიზაცია, ონლაინ მართვა, ტემპერატურების კონტროლი სხვადასხვა სივრცეში, ავარიების დროული იდენტიფიცირება და დანადგარების მოვლა-პატრონობის გამარტივება/გაუმჯობესება.`,
    M,
    ctx.y,
    CONTENT_W,
    9,
    5
  ) + 28;
  ctx.y -= drawWrapped(
    ctx,
    'ციფრული მართვის ტექნოლოგიების დანერგვისთვის საჭიროა შემდეგ დანადგარებზე კონტროლერების დაერთება:',
    M,
    ctx.y,
    CONTENT_W,
    9,
    5
  ) + 28;
}

function tableColumns(hasLabor: boolean) {
  // CONTENT_W (with M=60) = 475pt total budget. Columns must sum to ≤ 475.
  return hasLabor
    ? [20, 138, 28, 30, 66, 68, 52, 73]   // N, name, unit, qty, price, sub-total, labor, line-total = 475
    : [22, 175, 32, 36, 66, 70, 74];      // N, name, unit, qty, price, sub-total, sum = 475
}

function drawTableHeader(ctx: DrawCtx, y: number, hasLabor: boolean) {
  const cols = tableColumns(hasLabor);
  const labels = hasLabor
    ? ['N', 'დასახელება', 'განზ.', 'რაოდ.', 'ფასი', 'ჯამი', 'ხელ.', 'ჯამი']
    : ['N', 'დასახელება', 'განზ.', 'რაოდ.', 'ფასი', 'ჯამი', 'სულ'];
  let x = M;
  ctx.page.drawRectangle({x: M, y: y - 22, width: CONTENT_W, height: 22, color: PDF_COLORS.soft, borderColor: PDF_COLORS.line, borderWidth: 1});
  labels.forEach((label, index) => {
    drawText(ctx, label, x + 4, y - 14, 8.3, {bold: true, color: PDF_COLORS.text, maxWidth: cols[index] - 8});
    if (index > 0) ctx.page.drawLine({start: {x, y}, end: {x, y: y - 22}, thickness: 0.5, color: PDF_COLORS.line});
    x += cols[index];
  });
  return y - 22;
}

function drawItemRow(ctx: DrawCtx, item: LineItem, index: number, y: number, hasLabor: boolean) {
  const cols = tableColumns(hasLabor);
  const values = hasLabor
    ? [
        String(index + 1),
        item.name,
        'ცალი',
        String(item.qty),
        fmtMoney(item.unitPrice),
        fmtMoney(item.lineSubtotal),
        fmtMoney(item.laborPerUnit ?? 0),
        fmtMoney(item.lineLabor)
      ]
    : [
        String(index + 1),
        item.name,
        'ცალი',
        String(item.qty),
        fmtMoney(item.unitPrice),
        fmtMoney(item.lineSubtotal),
        fmtMoney(item.lineTotal)
      ];
  const rowH = Math.max(23, wrapText(safeText(ctx, item.name), ctx.fonts.regular, 8.5, cols[1] - 8).length * 11 + 10);
  ctx.page.drawRectangle({x: M, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: PDF_COLORS.line, borderWidth: 0.6});
  let x = M;
  values.forEach((value, colIndex) => {
    if (colIndex > 0) ctx.page.drawLine({start: {x, y}, end: {x, y: y - rowH}, thickness: 0.4, color: PDF_COLORS.line});
    if (colIndex === 1) {
      // Item name regular — multi-line wrap up to 3 lines.
      const lines = wrapText(safeText(ctx, value), ctx.fonts.regular, 8.5, cols[colIndex] - 8);
      lines.slice(0, 3).forEach((line, lineIndex) => {
        drawText(ctx, line, x + 4, y - 12 - lineIndex * 10, 8.5, {color: PDF_COLORS.text, maxWidth: cols[colIndex] - 8});
      });
    } else {
      drawText(ctx, value, x + cols[colIndex] - 4, y - 14, 7.5, {color: PDF_COLORS.text, align: 'right', maxWidth: cols[colIndex] - 8});
    }
    x += cols[colIndex];
  });
  return rowH;
}

function drawItems(ctx: DrawCtx, offer: DmtOffer, totals: Totals, docNumber: number) {
  if (totals.items.length === 0) {
    ensureSpace(ctx, 70, 'კომერციული წინადადება');
    ctx.page.drawRectangle({x: M, y: ctx.y - 50, width: CONTENT_W, height: 50, borderColor: PDF_COLORS.line, borderWidth: 1, color: PDF_COLORS.soft});
    drawText(ctx, 'ნივთები არ არის ჩამატებული', M + 14, ctx.y - 30, 10, {bold: true, color: PDF_COLORS.muted});
    ctx.y -= 70;
    return;
  }

  ensureSpace(ctx, 60, 'კომერციული წინადადება');
  ctx.y = drawTableHeader(ctx, ctx.y, totals.hasLabor);
  totals.items.forEach((item, index) => {
    const rowH = Math.max(23, wrapText(safeText(ctx, item.name), ctx.fonts.regular, 8.5, tableColumns(totals.hasLabor)[1] - 8).length * 11 + 10);
    if (ctx.y - rowH < BOTTOM) {
      addPage(ctx);
      ctx.y = drawTableHeader(ctx, ctx.y, totals.hasLabor);
    }
    ctx.y -= drawItemRow(ctx, item, index, ctx.y, totals.hasLabor);
  });
  ctx.y -= 18;
}

function drawSummary(ctx: DrawCtx, offer: DmtOffer, totals: Totals) {
  ensureSpace(ctx, 160, 'კომერციული წინადადება · ჯამები');

  // Reference layout: full-width totals table that visually extends the items table.
  // Right-aligned data column (last 2 cells of items table dimensions).
  const cols = tableColumns(totals.hasLabor);
  const valueColW = cols[cols.length - 1];           // ~76pt rightmost
  const midColW = totals.hasLabor ? cols[cols.length - 2] : 0; // optional: % cell for margin row in hasLabor mode
  const labelColW = CONTENT_W - valueColW - midColW;

  const valueX = M + labelColW + midColW;
  const midX = M + labelColW;

  type Row = {
    label: string;
    middle?: string;
    value: string;
    strong?: boolean;
  };
  const rows: Row[] = [
    {label: 'პროდუქციის ღირებულება (დღგ-ს ჩათვლით)', value: fmtMoney(totals.subtotal)},
    {label: 'ხელობა (გადასახადების ჩათვლით)', value: fmtMoney(totals.laborTotal)},
    {label: 'ჯამი', value: fmtMoney(totals.sum)},
    {label: 'კომერციული მოგება', middle: `${totals.marginPercent}%`, value: fmtMoney(totals.marginAmount)},
    ...((totals.discountPercent ?? 0) > 0
      ? [{label: 'ფასდაკლება', middle: `${totals.discountPercent}%`, value: `-${fmtMoney(totals.discountAmount)}`}]
      : []),
    {label: 'სულ ჯამი', value: fmtMoney(totals.grandTotal), strong: true},
  ];

  const rowH = 24;
  const totalH = rows.length * rowH;
  const startY = ctx.y;

  // Outer border + horizontal separators between rows.
  ctx.page.drawRectangle({
    x: M, y: startY - totalH,
    width: CONTENT_W, height: totalH,
    borderColor: PDF_COLORS.line, borderWidth: 0.8,
  });

  rows.forEach((row, index) => {
    const yTop = startY - index * rowH;
    const yBot = yTop - rowH;
    if (index > 0) {
      ctx.page.drawLine({
        start: {x: M, y: yTop}, end: {x: M + CONTENT_W, y: yTop},
        thickness: 0.4, color: PDF_COLORS.line,
      });
    }
    if (row.strong) {
      ctx.page.drawRectangle({x: M, y: yBot, width: CONTENT_W, height: rowH, color: PDF_COLORS.soft});
    }
    // Vertical separators around the optional middle column.
    if (midColW > 0) {
      ctx.page.drawLine({start: {x: midX, y: yTop}, end: {x: midX, y: yBot}, thickness: 0.4, color: PDF_COLORS.line});
      ctx.page.drawLine({start: {x: valueX, y: yTop}, end: {x: valueX, y: yBot}, thickness: 0.4, color: PDF_COLORS.line});
    } else {
      ctx.page.drawLine({start: {x: valueX, y: yTop}, end: {x: valueX, y: yBot}, thickness: 0.4, color: PDF_COLORS.line});
    }

    drawText(ctx, row.label, M + 8, yBot + 8, 8.5, {bold: !!row.strong, color: PDF_COLORS.text, maxWidth: labelColW - 14});
    if (midColW > 0) {
      const midText = row.middle ?? '';
      drawText(ctx, midText, midX + midColW / 2, yBot + 8, 8.5, {bold: !!row.strong, color: PDF_COLORS.text, align: 'center'});
    }
    drawText(ctx, row.value, valueX + valueColW - 6, yBot + 8, 8.5, {bold: !!row.strong, color: PDF_COLORS.text, align: 'right'});
  });

  ctx.y -= totalH + 18;
  if (offer.vatRate) {
    drawText(ctx, `დღგ ინფორმაციულად ${offer.vatRate}% — ჩათვლილია ზემოთ მითითებულ ღირებულებებში.`, M, ctx.y, 7.6, {color: PDF_COLORS.muted, maxWidth: CONTENT_W});
    ctx.y -= 18;
  }

  // Reference PDF renders the summary sentence fully bold; discount aside follows
  // inline in parentheses (no period, "1185 ₾" with space before the lari sign).
  if ((totals.discountPercent ?? 0) > 0) {
    ctx.y -= drawWrappedRich(ctx, [
      {text: `სისტემის დანერგვისთვის საჭიროა ${totals.items.length} ერთეული კონტროლერის მონტაჟი, საერთო ღირებულებით ${fmtMoneyLari(totals.grandBeforeDiscount)} დღგ-ის ჩათვლით (ფასდაკლება ${totals.discountPercent}% - ${fmtMoney(totals.grandTotal)} ₾)`, bold: true},
    ], M, ctx.y, CONTENT_W, 9.5, 5) + 32;
  } else {
    ctx.y -= drawWrappedRich(ctx, [
      {text: `სისტემის დანერგვისთვის საჭიროა ${totals.items.length} ერთეული კონტროლერის მონტაჟი, საერთო ღირებულებით ${fmtMoneyLari(totals.grandTotal)} დღგ-ის ჩათვლით`, bold: true},
    ], M, ctx.y, CONTENT_W, 9.5, 5) + 32;
  }
  const subscription = offer.monthlySubscription ?? 150;
  const regularSubscription = offer.subscriptionRegularPrice;
  const subscriptionSegments: RichSegment[] = [
    {text: 'სტანდარტული ყოველთვიური სააბონენტო: ', bold: true},
    {text: `${fmtMoney(subscription)} ₾ + დღგ`, bold: true},
  ];
  if (regularSubscription != null && regularSubscription > subscription) {
    subscriptionSegments.push({text: ` ნაცვლად ${fmtMoney(regularSubscription)} ლარისა`, bold: true});
  }
  drawWrappedRich(ctx, subscriptionSegments, M, ctx.y, CONTENT_W, 9.5, 5);
  ctx.y -= 48;
}

function drawGuaranteeAndTerms(ctx: DrawCtx, offer: DmtOffer) {
  if (offer.includeMoneyBackGuarantee) {
    ensureSpace(ctx, 90, 'კომერციული წინადადება · პირობები');
    // Entire warranty paragraph rendered in bold to mirror the reference visual weight.
    const noteLabel = 'შენიშვნა:';
    const noteBody = ' იმ შემთხვევაში, თუ სისტემით სარგებლობის შემთხვევაში დამკვეთის დანაზოგები არ იქნება მინიმუმ 3 ჯერ მეტი ყოველთვიურ სააბონენტო გადასახადზე, შემსრულებელი იღებს ვალდებულებას, რომ დამკვეთს დაუბრუნებს სისტემის ინტეგრაციაში გადახდილ თანხებს 100%-ით. საცდელი პერიოდი შეადგენს სამ თვეს.';
    const labelWidth = width(ctx.fonts.bold, safeText(ctx, noteLabel), 9.5);
    drawText(ctx, noteLabel, M, ctx.y, 9.5, {bold: true});
    // Wrap body across remaining width on first line, then full width on subsequent lines.
    const firstLineMax = CONTENT_W - labelWidth - 4;
    const allLines = wrapText(safeText(ctx, noteBody.trimStart()), ctx.fonts.bold, 9.5, firstLineMax);
    let wroteAny = false;
    let yCursor = ctx.y;
    if (allLines.length > 0) {
      ctx.page.drawText(allLines[0], {
        x: M + labelWidth + 4,
        y: yCursor,
        size: 9.5,
        font: ctx.fonts.bold,
        color: PDF_COLORS.text
      });
      wroteAny = true;
      yCursor -= 9.5 + 4;
    }
    if (allLines.length > 1) {
      // Re-flow remaining text at full width to use the remaining lines efficiently.
      const remaining = allLines.slice(1).join(' ');
      const restLines = wrapText(remaining, ctx.fonts.bold, 9.5, CONTENT_W);
      restLines.forEach((line) => {
        ctx.page.drawText(line, {
          x: M,
          y: yCursor,
          size: 9.5,
          font: ctx.fonts.bold,
          color: PDF_COLORS.text
        });
        yCursor -= 9.5 + 4;
      });
    }
    ctx.y = wroteAny ? yCursor - 20 : ctx.y - 20;
  }

  const features: RichSegment[][] = [
    [{text: 'ქართული მენიუ', bold: true}, {text: ' პროგრამულ უზრუნველყოფაზე.'}],
    [{text: 'მობილური აპლიკაციით', bold: true}, {text: ' სარგებლობა.'}],
    [{text: 'მონტაჟისთვის საჭირო მასალებს, როგორიცაა სადენები და სხვა სახარჯი მასალები.'}],
    [{text: 'პროგრამული უზრუნველყოფის მოხმარების '}, {text: 'ტრენინგს', bold: true}, {text: '.'}],
    [{text: 'უფასო ტექნიკურ მხარდაჭერას', bold: true}, {text: ' სისტემის გამართვაზე ინტენსიურად პირველი სამი თვის განმავლობაში.'}],
    [{text: 'მუდმივ მხარდაჭერას სისტემის გამოყენებაზე — '}, {text: 'მხარდაჭერის გუნდთან მუდმივ წვდომას და პირად მენეჯერს', bold: true}, {text: '.'}],
    [{text: 'მოწყობილობების '}, {text: 'ავტომატიზაციას', bold: true}, {text: ' ონლაინ.'}],
    [{text: 'მოწყობილობების დაჯგუფებას.'}],
    [{text: 'ავარიების ჩანაწერების', bold: true}, {text: ' ნახვას.'}],
    [{text: 'ავტომატიზაციის ჩანაწერების ნახვას.'}],
    [{text: 'უფასო სმს და ელ.ფოსტის შეტყობინებებს', bold: true}, {text: ' ავტომატიზაციაზე, ავარიაზე ან ამორჩეულ ქმედებაზე.'}],
    [{text: 'თანამშრომლების როლების გაწერას.'}],
    [{text: 'შესრულებული სამუშაოების '}, {text: 'მონიტორინგს', bold: true}, {text: '.'}],
  ];

  ensureSpace(ctx, 34, 'კომერციული წინადადება · პაკეტი');
  drawText(ctx, 'შემოთავაზება მოიცავს', PAGE_W / 2, ctx.y, 14, {bold: true, align: 'center', color: PDF_COLORS.blue});
  ctx.y -= 30;
  drawText(ctx, 'პროგრამული უზრუნველყოფის პაკეტი მოიცავს:', M, ctx.y, 9.5, {bold: true, color: PDF_COLORS.text});
  ctx.y -= 16;
  features.forEach((segments, index) => {
    ensureSpace(ctx, 18, 'კომერციული წინადადება · პაკეტი');
    const numbered: RichSegment[] = [{text: `${index + 1}. `}, ...segments];
    const consumed = drawWrappedRich(ctx, numbered, M + 8, ctx.y, CONTENT_W - 8, 9.5, 4);
    // Tight one-line spacing between items (no extra blank line between rows).
    ctx.y -= consumed + 2;
  });
  ensureSpace(ctx, 42, 'კომერციული წინადადება · პაკეტი');
  ctx.y -= drawWrapped(ctx, 'ამასთან, მომავალში დამატებული ფუნქციონალისა და განახლებების გამოყენებას სრულიად უფასოდ.', M, ctx.y - 4, CONTENT_W, 9.2, 4);
}

function drawSignatures(ctx: DrawCtx, lead: OfferPdfLead) {
  addPage(ctx);
  // Smaller, tighter signature page matching the reference visual hierarchy.
  drawText(ctx, 'მხარეთა ხელმოწერები:', PAGE_W / 2, PAGE_H - 110, 12.5, {bold: true, align: 'center', color: PDF_COLORS.text});
  let y = PAGE_H - 160;
  drawText(ctx, 'მომსახურების გამწევი', M, y, 10, {bold: true, color: PDF_COLORS.text});
  y -= 18;
  drawText(ctx, 'შპს ციფრული მართვის ტექნოლოგიები', M, y, 9);
  y -= 16;
  drawText(ctx, 'დირექტორი: გ. მერებაშვილი', M, y, 9);
  ctx.page.drawLine({start: {x: PAGE_W - M - 220, y: y - 2}, end: {x: PAGE_W - M, y: y - 2}, thickness: 0.6, color: PDF_COLORS.text});
  y -= 50;

  drawText(ctx, 'მომსახურების მიმღები', M, y, 10, {bold: true, color: PDF_COLORS.text});
  y -= 18;
  drawText(ctx, lead.company || lead.contact || lead.id, M, y, 9);
  if (lead.taxId) {
    y -= 16;
    drawText(ctx, `ს/კ: ${lead.taxId}`, M, y, 9);
  }
  y -= 16;
  drawText(ctx, `დირექტორი:${lead.contact ? ` ${lead.contact}` : ''}`, M, y, 9);
  ctx.page.drawLine({start: {x: PAGE_W - M - 220, y: y - 2}, end: {x: PAGE_W - M, y: y - 2}, thickness: 0.6, color: PDF_COLORS.text});
}

function drawFooters(ctx: DrawCtx) {
  const pages = ctx.pdf.getPages();
  pages.forEach((page, index) => {
    // Page 1 (index 0) is a clean title page — no footer rule, no copyright,
    // no page number, no emblem. Skip rendering anything on it.
    if (index === 0) return;
    const footerY = 34;
    if (index > 0) {
      page.drawText(safeText(ctx, `გვერდი ${index + 1} of ${pages.length}`), {
        x: M,
        y: PAGE_H - 28,
        size: 7.5,
        font: ctx.fonts.regular,
        color: PDF_COLORS.muted
      });
      // Continuation pages use the sazeo wordmark in the top-right corner.
      if (ctx.wordmark) {
        const dims = ctx.wordmark.scale(0.07);
        page.drawImage(ctx.wordmark, {x: PAGE_W - M - dims.width, y: PAGE_H - 32 - dims.height, width: dims.width, height: dims.height});
      } else if (ctx.logo) {
        const dims = ctx.logo.scale(0.05);
        page.drawImage(ctx.logo, {x: PAGE_W - M - dims.width, y: PAGE_H - 44, width: dims.width, height: dims.height});
      }
    }
    // Rule line above footer.
    page.drawLine({start: {x: M, y: footerY + 60}, end: {x: PAGE_W - M, y: footerY + 60}, thickness: 0.6, color: PDF_COLORS.line});

    const footerSize = 6.8;
    const footerLineH = 8.5;
    const footerColW = CONTENT_W - 90; // leave space on right for sakpatenti emblem

    // Title row — "საავტორო უფლებები საქპატენტი:" (bold prefix, regular trailing colon).
    let cursorY = footerY + 50;
    page.drawText(safeText(ctx, 'საავტორო უფლებები საქპატენტი:'), {
      x: M, y: cursorY,
      size: footerSize, font: ctx.fonts.bold, color: PDF_COLORS.text,
    });
    cursorY -= footerLineH + 2;

    // Citation #1 — bold prefix + wrapped body + date. Wrapped across 2 lines.
    const c1Bold = 'დეპონირების რეგისტრაციის #8973';
    const c1Body = ' (ჰაერის გათბობის, ვენტილაციის და კონდიცირების (HVAC) მოწყობილობები დისტანციური მართვისა და ავტომატიზაციის სქემა, სისტემა და მეთოდი) 13.05.2023';
    const c1BoldW = ctx.fonts.bold.widthOfTextAtSize(safeText(ctx, c1Bold), footerSize);
    page.drawText(safeText(ctx, c1Bold), {
      x: M, y: cursorY,
      size: footerSize, font: ctx.fonts.bold, color: PDF_COLORS.text,
    });
    const c1Lines = wrapText(safeText(ctx, c1Body), ctx.fonts.regular, footerSize, footerColW - c1BoldW);
    if (c1Lines[0]) {
      page.drawText(c1Lines[0], {
        x: M + c1BoldW, y: cursorY,
        size: footerSize, font: ctx.fonts.regular, color: PDF_COLORS.text,
      });
    }
    cursorY -= footerLineH;
    if (c1Lines[1]) {
      page.drawText(c1Lines[1], {
        x: M, y: cursorY,
        size: footerSize, font: ctx.fonts.regular, color: PDF_COLORS.text,
      });
      cursorY -= footerLineH;
    }

    // Citation #2 — same structure.
    const c2Bold = 'დეპონირების რეგისტრაციის #8993';
    const c2Body = ' (საყოფაცხოვრებო და სამრეწველო ელექტრო მექანიკური საინჟინრო სისტემებისა და მოწყობილობების დისტანციური მართვის და ავტომატიზაციის კომპიუტერული პროგრამა) 06.06.2023';
    const c2BoldW = ctx.fonts.bold.widthOfTextAtSize(safeText(ctx, c2Bold), footerSize);
    page.drawText(safeText(ctx, c2Bold), {
      x: M, y: cursorY,
      size: footerSize, font: ctx.fonts.bold, color: PDF_COLORS.text,
    });
    const c2Lines = wrapText(safeText(ctx, c2Body), ctx.fonts.regular, footerSize, footerColW - c2BoldW);
    if (c2Lines[0]) {
      page.drawText(c2Lines[0], {
        x: M + c2BoldW, y: cursorY,
        size: footerSize, font: ctx.fonts.regular, color: PDF_COLORS.text,
      });
    }
    cursorY -= footerLineH;
    if (c2Lines[1]) {
      page.drawText(c2Lines[1], {
        x: M, y: cursorY,
        size: footerSize, font: ctx.fonts.regular, color: PDF_COLORS.text,
      });
    }
    // Sakpatenti emblem on the right of the citation block, vertically centered.
    if (ctx.sakpatenti) {
      const emblemW = 38;
      const emblemH = 46;
      page.drawImage(ctx.sakpatenti, {
        x: PAGE_W - M - emblemW,
        y: footerY + 4,
        width: emblemW,
        height: emblemH,
      });
    } else {
      const ex = PAGE_W - M - 24;
      page.drawRectangle({x: ex, y: footerY + 4, width: 24, height: 28, color: PDF_COLORS.soft, borderColor: PDF_COLORS.line, borderWidth: 0.8});
      page.drawCircle({x: ex + 12, y: footerY + 18, size: 8, borderColor: PDF_COLORS.navy, borderWidth: 1});
      page.drawText(safeText(ctx, 'ს'), {x: ex + 9.2, y: footerY + 14, size: 8, font: ctx.fonts.bold, color: PDF_COLORS.navy});
    }
  });
}

export async function renderOfferPdf(input: {
  offer: DmtOffer;
  lead: OfferPdfLead;
  docNumber: number;
  docDate?: string | null;
}): Promise<OfferPdfResult> {
  const pdf = await PDFDocument.create();
  const fonts = await loadOfferPdfFonts(pdf);
  const effectiveDocNumber = input.offer.docNumberOverride ?? input.docNumber;
  const effectiveLead: OfferPdfLead = {
    ...input.lead,
    company: input.offer.clientCompany || input.lead.company,
    contact: input.offer.clientContact || input.lead.contact,
    phone: input.offer.clientPhone || input.lead.phone,
    taxId: input.offer.clientTaxId || input.lead.taxId
  };
  pdf.setTitle(`DMT commercial offer ${effectiveDocNumber}`);
  pdf.setAuthor('DMT');
  pdf.setCreator('engineers.ge DMT');
  pdf.setSubject(input.offer.id);

  const [logo, wordmark, sakpatenti] = await Promise.all([
    loadImage(pdf, [
      path.join(process.cwd(), 'public', 'dmt', 'logo.png'),
      path.join(process.cwd(), 'public', 'tbc', 'logos', 'dmt.png')
    ]),
    loadImage(pdf, [
      path.join(process.cwd(), 'public', 'dmt', 'wordmark.png')
    ]),
    loadImage(pdf, [
      path.join(process.cwd(), 'public', 'dmt', 'sakpatenti.png')
    ])
  ]);

  const ctx: DrawCtx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    fonts,
    y: PAGE_H - M,
    logo,
    wordmark,
    sakpatenti,
    docNumber: effectiveDocNumber,
  };

  const docDate = fmtDate(input.offer.docDateOverride ?? input.docDate ?? input.offer.docDate);
  const totals = calculateOfferPdfTotals(input.offer);
  drawFirstPage(ctx, input.offer, effectiveLead, effectiveDocNumber, docDate);
  // addPage now auto-renders drawSmallHeader using ctx.docNumber.
  addPage(ctx);
  drawIntro(ctx, effectiveLead);
  drawItems(ctx, input.offer, totals, effectiveDocNumber);
  drawSummary(ctx, input.offer, totals);
  drawGuaranteeAndTerms(ctx, input.offer);
  drawSignatures(ctx, effectiveLead);
  drawFooters(ctx);

  const bytes = await pdf.save();
  return {bytes, docNumber: effectiveDocNumber, total: totals.grandTotal};
}
