import 'server-only';
import {readFile} from 'fs/promises';
import path from 'path';
import {PDFDocument, type PDFFont, type PDFImage, type PDFPage, type RGB} from 'pdf-lib';
import {normalizeOfferItems, type DmtOffer, type OfferItem} from '@/lib/dmt/offers-store';
import {PDF_COLORS} from '@/lib/dmt/pdf/colors';
import {loadOfferPdfFonts, type OfferPdfFonts} from '@/lib/dmt/pdf/fonts';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 42;
const BOTTOM = 66;
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
  grandTotal: number;
  hasLabor: boolean;
};

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  fonts: OfferPdfFonts;
  y: number;
  logo?: PDFImage;
  sakpatenti?: PDFImage;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function fmtMoney(value: number) {
  return `${new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value)} GEL`;
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
  const marginAmount = money(sum * marginPercent / 100);
  const grandTotal = money(sum + marginAmount);
  return {
    items,
    subtotal,
    laborTotal,
    sum,
    marginPercent,
    marginAmount,
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

function drawBox(ctx: DrawCtx, title: string, rows: Array<[string, string]>, x: number, y: number, w: number) {
  const rowH = 23;
  const h = 31 + rows.length * rowH;
  ctx.page.drawRectangle({x, y: y - h, width: w, height: h, borderColor: PDF_COLORS.line, borderWidth: 1});
  ctx.page.drawRectangle({x, y: y - 27, width: w, height: 27, color: PDF_COLORS.soft, borderColor: PDF_COLORS.line, borderWidth: 1});
  drawText(ctx, title, x + 12, y - 18, 11, {bold: true, color: PDF_COLORS.navy});
  rows.forEach(([label, value], index) => {
    const ry = y - 47 - index * rowH;
    drawText(ctx, label, x + 12, ry, 9, {bold: true, color: PDF_COLORS.muted});
    drawText(ctx, value || '-', x + 156, ry, 9.5, {maxWidth: w - 170});
  });
  return h;
}

function addPage(ctx: DrawCtx, label?: string) {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - M;
  if (label) {
    drawText(ctx, label, M, ctx.y, 10, {bold: true, color: PDF_COLORS.blue});
    drawRule(ctx, ctx.y - 12);
    ctx.y -= 34;
  }
}

function ensureSpace(ctx: DrawCtx, needed: number, label?: string) {
  if (ctx.y - needed < BOTTOM) addPage(ctx, label);
}

function drawFirstPage(ctx: DrawCtx, offer: DmtOffer, lead: OfferPdfLead, docNumber: number, docDate: string) {
  if (ctx.logo) {
    const dims = ctx.logo.scale(0.16);
    ctx.page.drawImage(ctx.logo, {x: PAGE_W / 2 - dims.width / 2, y: PAGE_H - M - dims.height, width: dims.width, height: dims.height});
  } else {
    drawText(ctx, 'DMT', PAGE_W / 2, PAGE_H - 72, 24, {bold: true, align: 'center', color: PDF_COLORS.blue});
  }

  let y = PAGE_H - 112;
  const metaRows: Array<[string, string]> = [
    ['დოკუმენტი:', `პროცედურების მართვის ფაილი SOP.8.2.5.COFR.${docNumber}`],
    ['ფაილის შინაარსი:', `SOP-8.2.5-COFR-${docNumber} კომერციული წინადადება .pdf`],
    ['დოკუმენტის ვერსია:', 'V.1-25/2026']
  ];
  metaRows.forEach(([label, value]) => {
    drawText(ctx, label, M, y, 9.5, {bold: true, color: PDF_COLORS.muted});
    drawText(ctx, value, M + 126, y, 9.5, {maxWidth: CONTENT_W - 126});
    y -= 18;
  });

  y -= 24;
  drawText(ctx, 'კომერციული წინადადება', PAGE_W / 2, y, 16, {bold: true, align: 'center', color: PDF_COLORS.navy});
  y -= 20;
  drawText(ctx, `დოკუმენტის N SOP.8.2.5.COFR.${docNumber}.${docDate}`, PAGE_W / 2, y, 10.5, {align: 'center'});
  y -= 34;

  const providerRows: Array<[string, string]> = [
    ['დასახელება:', 'შპს ციფრული მართვის ტექნოლოგიები'],
    ['საიდენტიფიკაციო კოდი:', '405285926'],
    ['მომსახურე ბანკი:', 'სს საქართველოს ბანკი'],
    ['ანგარიშსწორების ანგარიში:', 'GE94BG0000000101388853GEL'],
    ['ბანკის კოდი:', 'BAGAGE22']
  ];
  y -= drawBox(ctx, 'მომსახურების გამწევი', providerRows, M, y, CONTENT_W) + 20;

  const clientRows: Array<[string, string]> = [
    ['დასახელება:', lead.company || lead.contact || lead.id],
    ['საიდენტიფიკაციო კოდი:', lead.taxId || '-'],
    ['საკონტაქტო:', lead.contact || '-'],
    ['ტელეფონი:', lead.phone || '-'],
    ['Offer ID:', offer.id]
  ];
  drawBox(ctx, 'მომსახურების მიმღები', clientRows, M, y, CONTENT_W);
}

function drawSmallHeader(ctx: DrawCtx, title: string, offer: DmtOffer, docNumber: number) {
  drawText(ctx, 'DMT', M, PAGE_H - 36, 11, {bold: true, color: PDF_COLORS.blue});
  drawText(ctx, `SOP.8.2.5.COFR.${docNumber}`, PAGE_W - M, PAGE_H - 36, 9, {align: 'right', color: PDF_COLORS.muted});
  drawText(ctx, title, M, PAGE_H - 56, 12, {bold: true, color: PDF_COLORS.navy});
  drawText(ctx, offer.id, PAGE_W - M, PAGE_H - 56, 9, {align: 'right', color: PDF_COLORS.muted});
  drawRule(ctx, PAGE_H - 66);
  ctx.y = PAGE_H - 88;
}

function drawIntro(ctx: DrawCtx, lead: OfferPdfLead) {
  drawText(ctx, '1. კომერციული წინადადება', M, ctx.y, 13, {bold: true, color: PDF_COLORS.navy});
  ctx.y -= 24;
  ctx.y -= drawWrapped(
    ctx,
    `${lead.company || lead.contact || 'დამკვეთის'} საინჟინრო სისტემების დათვალიერების შედეგად დადგინდა, რომ შენობაში შესაძლებელია HVAC სისტემების ავტომატიზაცია და ციფრული მართვის ტექნოლოგიების დანერგვა. წინამდებარე შეთავაზება მოიცავს საჭირო მოწყობილობებს, მონტაჟს და პროგრამულ უზრუნველყოფას.`,
    M,
    ctx.y,
    CONTENT_W,
    10,
    4
  ) + 14;
  ctx.y -= drawWrapped(
    ctx,
    'ციფრული მართვის ტექნოლოგიების დასანერგად საჭიროა შემდეგ დანადგარებზე კონტროლერების და შესაბამისი კომპონენტების დაერთება:',
    M,
    ctx.y,
    CONTENT_W,
    10,
    4
  ) + 12;
}

function tableColumns(hasLabor: boolean) {
  return hasLabor
    ? [28, 190, 42, 42, 58, 64, 54, 64]
    : [28, 248, 48, 48, 70, 76, 76];
}

function drawTableHeader(ctx: DrawCtx, y: number, hasLabor: boolean) {
  const cols = tableColumns(hasLabor);
  const labels = hasLabor
    ? ['N', 'დასახელება', 'განზ.', 'რაოდ.', 'ფასი', 'ჯამი', 'ხელ.', 'ჯამი']
    : ['N', 'დასახელება', 'განზ.', 'რაოდ.', 'ფასი', 'ჯამი', 'სულ'];
  let x = M;
  ctx.page.drawRectangle({x: M, y: y - 22, width: CONTENT_W, height: 22, color: PDF_COLORS.soft, borderColor: PDF_COLORS.line, borderWidth: 1});
  labels.forEach((label, index) => {
    drawText(ctx, label, x + 4, y - 14, 8.3, {bold: true, color: PDF_COLORS.navy, maxWidth: cols[index] - 8});
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
        fmtMoney(item.lineTotal)
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
      const lines = wrapText(safeText(ctx, value), ctx.fonts.regular, 8.5, cols[colIndex] - 8);
      lines.slice(0, 3).forEach((line, lineIndex) => {
        drawText(ctx, line, x + 4, y - 12 - lineIndex * 10, 8.5, {maxWidth: cols[colIndex] - 8});
      });
      if (item.description) {
        drawText(ctx, item.description, x + 4, y - rowH + 5, 6.8, {color: PDF_COLORS.muted, maxWidth: cols[colIndex] - 8});
      }
    } else {
      drawText(ctx, value, x + cols[colIndex] - 4, y - 14, 7.5, {align: 'right', maxWidth: cols[colIndex] - 8});
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
      drawSmallHeader(ctx, 'კომერციული წინადადება · გაგრძელება', offer, docNumber);
      ctx.y = drawTableHeader(ctx, ctx.y, totals.hasLabor);
    }
    ctx.y -= drawItemRow(ctx, item, index, ctx.y, totals.hasLabor);
  });
  ctx.y -= 18;
}

function drawSummary(ctx: DrawCtx, offer: DmtOffer, totals: Totals) {
  ensureSpace(ctx, 145, 'კომერციული წინადადება · ჯამები');
  const x = PAGE_W - M - 280;
  const rowH = 22;
  const rows: Array<[string, string, boolean]> = [
    ['პროდუქციის ღირებულება (დღგ-ს ჩათვლით)', fmtMoney(totals.subtotal), false],
    ['ხელობა (გადასახადების ჩათვლით)', fmtMoney(totals.laborTotal), false],
    ['ჯამი', fmtMoney(totals.sum), false],
    [`კომერციული მოგება ${totals.marginPercent}%`, fmtMoney(totals.marginAmount), false],
    ['სულ ჯამი', fmtMoney(totals.grandTotal), true]
  ];
  if (offer.vatRate) rows.splice(1, 0, [`დღგ ინფორმაციულად ${offer.vatRate}%`, fmtMoney(offer.vatAmount ?? 0), false]);

  ctx.page.drawRectangle({x, y: ctx.y - rows.length * rowH, width: 280, height: rows.length * rowH, borderColor: PDF_COLORS.line, borderWidth: 1});
  rows.forEach(([label, value, strong], index) => {
    const y = ctx.y - (index + 1) * rowH;
    if (strong) ctx.page.drawRectangle({x, y, width: 280, height: rowH, color: PDF_COLORS.soft});
    drawText(ctx, label, x + 8, y + 7, 8.6, {bold: strong, maxWidth: 178});
    drawText(ctx, value, x + 270, y + 7, 8.6, {bold: strong, align: 'right'});
  });
  ctx.y -= rows.length * rowH + 22;

  ctx.y -= drawWrapped(
    ctx,
    `სისტემის დანერგვისთვის საჭიროა ${totals.items.length} ერთეული პოზიციის მიწოდება/მონტაჟი, საერთო ღირებულებით ${fmtMoney(totals.grandTotal)} დღგ-ს ჩათვლით.`,
    M,
    ctx.y,
    CONTENT_W,
    10,
    4
  ) + 8;
  drawWrapped(ctx, 'სტანდარტული ყოველთვიური სააბონენტო: 150 GEL + დღგ', M, ctx.y, CONTENT_W, 9.5, 4);
  ctx.y -= 28;
}

function drawGuaranteeAndTerms(ctx: DrawCtx, offer: DmtOffer) {
  if (offer.includeMoneyBackGuarantee) {
    ensureSpace(ctx, 90, 'კომერციული წინადადება · პირობები');
    ctx.y -= drawWrapped(
      ctx,
      'შენიშვნა: იმ შემთხვევაში, თუ სისტემით სარგებლობის შემთხვევაში დამკვეთის დანაზოგები არ იქნება მინიმუმ 3 ჯერ მეტი ყოველთვიურ სააბონენტო გადასახადზე, შემსრულებელი იღებს ვალდებულებას, რომ დამკვეთს დაუბრუნებს სისტემის ინტეგრაციაში გადახდილ თანხებს 100%-ით. საცდელი პერიოდი შეადგენს სამ თვეს.',
      M,
      ctx.y,
      CONTENT_W,
      9.2,
      4
    ) + 12;
  }

  const features = [
    'ქართული მენიუ პროგრამულ უზრუნველყოფაზე.',
    'მობილური აპლიკაციით სარგებლობა.',
    'მონტაჟისთვის საჭირო მასალების მიწოდება.',
    'სისტემის პირველადი კონფიგურაცია.',
    'მომხმარებლების დამატება და უფლებების მართვა.',
    'სისტემის დისტანციური მონიტორინგი.',
    'შეტყობინებები და ოპერატიული რეაგირება.',
    'ენერგოეფექტურობის კონტროლი.',
    'სერვისის ისტორიის აღრიცხვა.',
    'მონაცემების დაცული შენახვა.',
    'ტექნიკური მხარდაჭერა.',
    'მომავალი განახლებებით სარგებლობა.',
    'შესრულებული სამუშაოების მონიტორინგი.'
  ];

  ensureSpace(ctx, 34, 'კომერციული წინადადება · პაკეტი');
  drawText(ctx, 'შეთავაზება მოიცავს', M, ctx.y, 11, {bold: true, color: PDF_COLORS.navy});
  ctx.y -= 18;
  features.forEach((feature, index) => {
    ensureSpace(ctx, 18, 'კომერციული წინადადება · პაკეტი');
    drawText(ctx, `${index + 1}. ${feature}`, M + 8, ctx.y, 9, {maxWidth: CONTENT_W - 8});
    ctx.y -= 15;
  });
  ensureSpace(ctx, 42, 'კომერციული წინადადება · პაკეტი');
  ctx.y -= drawWrapped(ctx, 'ამასთან, მომავალში დამატებითი ფუნქციონალისა და განახლებების გამოყენება სრულად უფასოა.', M, ctx.y - 4, CONTENT_W, 9.2, 4);
}

function drawSignatures(ctx: DrawCtx, lead: OfferPdfLead) {
  addPage(ctx);
  drawText(ctx, 'მხარეთა ხელმოწერები:', PAGE_W / 2, PAGE_H - 105, 15, {bold: true, align: 'center', color: PDF_COLORS.navy});
  let y = PAGE_H - 160;
  drawText(ctx, 'მომსახურების გამწევი', M, y, 11, {bold: true, color: PDF_COLORS.navy});
  y -= 24;
  drawText(ctx, 'შპს ციფრული მართვის ტექნოლოგიები', M, y, 10);
  y -= 22;
  drawText(ctx, 'დირექტორი: გ. მერებაშვილი', M, y, 10);
  ctx.page.drawLine({start: {x: PAGE_W - M - 170, y: y - 2}, end: {x: PAGE_W - M, y: y - 2}, thickness: 0.8, color: PDF_COLORS.text});
  y -= 70;

  drawText(ctx, 'მომსახურების მიმღები', M, y, 11, {bold: true, color: PDF_COLORS.navy});
  y -= 24;
  drawText(ctx, lead.company || lead.contact || lead.id, M, y, 10);
  y -= 20;
  drawText(ctx, `ს/კ: ${lead.taxId || '-'}`, M, y, 10);
  y -= 22;
  drawText(ctx, 'დირექტორი:', M, y, 10);
  ctx.page.drawLine({start: {x: PAGE_W - M - 170, y: y - 2}, end: {x: PAGE_W - M, y: y - 2}, thickness: 0.8, color: PDF_COLORS.text});
}

function drawFooters(ctx: DrawCtx) {
  const pages = ctx.pdf.getPages();
  pages.forEach((page, index) => {
    const footerY = 34;
    page.drawLine({start: {x: M, y: footerY + 22}, end: {x: PAGE_W - M, y: footerY + 22}, thickness: 0.5, color: PDF_COLORS.line});
    page.drawText(safeText(ctx, 'საავტორო უფლებები საქპატენტი: დეპონირების რეგისტრაციის #8973 / #8993'), {
      x: M,
      y: footerY + 8,
      size: 7.2,
      font: ctx.fonts.regular,
      color: PDF_COLORS.muted
    });
    page.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE_W - M - 58,
      y: footerY + 8,
      size: 7.2,
      font: ctx.fonts.regular,
      color: PDF_COLORS.muted
    });
    if (ctx.sakpatenti) {
      page.drawImage(ctx.sakpatenti, {x: PAGE_W - M - 88, y: footerY + 1, width: 18, height: 18});
    } else {
      page.drawCircle({x: PAGE_W - M - 78, y: footerY + 10, size: 8, borderColor: PDF_COLORS.line, borderWidth: 0.8});
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
  pdf.setTitle(`DMT commercial offer ${input.docNumber}`);
  pdf.setAuthor('DMT');
  pdf.setCreator('engineers.ge DMT');
  pdf.setSubject(input.offer.id);

  const [logo, sakpatenti] = await Promise.all([
    loadImage(pdf, [
      path.join(process.cwd(), 'public', 'dmt', 'logo.png'),
      path.join(process.cwd(), 'public', 'tbc', 'logos', 'dmt.png')
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
    sakpatenti
  };

  const docDate = fmtDate(input.docDate ?? input.offer.docDate);
  const totals = calculateOfferPdfTotals(input.offer);
  drawFirstPage(ctx, input.offer, input.lead, input.docNumber, docDate);
  addPage(ctx);
  drawSmallHeader(ctx, 'კომერციული წინადადება', input.offer, input.docNumber);
  drawIntro(ctx, input.lead);
  drawItems(ctx, input.offer, totals, input.docNumber);
  drawSummary(ctx, input.offer, totals);
  drawGuaranteeAndTerms(ctx, input.offer);
  drawSignatures(ctx, input.lead);
  drawFooters(ctx);

  const bytes = await pdf.save();
  return {bytes, docNumber: input.docNumber, total: totals.grandTotal};
}
