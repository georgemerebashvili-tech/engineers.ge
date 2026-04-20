import {NextResponse} from 'next/server';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage} from 'pdf-lib';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RowSchema = z.object({
  label: z.string().max(80),
  value: z.string().max(120)
});

const FireRowSchema = z.object({
  i: z.number().int().nonnegative(),
  preset: z.string().max(40),
  growth: z.string().max(40),
  hrrMax: z.union([z.number(), z.string()]),
  Q: z.string().max(40),
  m: z.string().max(40),
  z: z.string().max(40)
});

const RoomRowSchema = z.object({
  name: z.string().max(120),
  area: z.string().max(40),
  volume: z.string().max(40),
  layerH: z.string().max(40),
  pass: z.boolean()
});

const PressureRowSchema = z.object({
  name: z.string().max(120),
  target: z.string().max(40),
  avg: z.string().max(40),
  peak: z.string().max(40),
  status: z.enum(['PASS', 'WARN', 'FAIL'])
});

const SizingSchema = z.object({
  leak: z.string().max(40),
  open: z.string().max(40),
  required: z.string().max(40),
  available: z.string().max(40),
  temp: z.string().max(40),
  status: z.enum(['PASS', 'WARN', 'FAIL'])
});

const DoorRowSchema = z.object({
  id: z.string().max(40),
  w: z.string().max(40),
  h: z.string().max(40),
  dp: z.string().max(40),
  state: z.string().max(20),
  vClass: z.string().max(40),
  flow: z.string().max(40),
  force: z.string().max(40),
  pass: z.boolean(),
  warn: z.boolean()
});

const EvacRowSchema = z.object({
  name: z.string().max(120),
  exit: z.string().max(80),
  distance: z.string().max(40),
  travelT: z.string().max(40),
  smoke: z.string().max(40),
  status: z.enum(['PASS', 'WARN', 'FAIL'])
});

const FormulaSchema = z.object({
  key: z.string().max(80),
  expr: z.string().max(240).optional(),
  value: z.string().max(180).optional(),
  ref: z.string().max(180)
});

const BodySchema = z.object({
  title: z.string().max(120),
  projectName: z.string().max(120),
  timestamp: z.string().max(120),
  scenarioLabel: z.string().max(80),
  standardLabel: z.string().max(80),
  simTimeS: z.number().min(0).max(600),
  thresholds: z.object({
    minLayerH: z.number().min(0).max(10),
    dpMin: z.number().min(0).max(500),
    warnForceN: z.number().min(0).max(500),
    maxForceN: z.number().min(0).max(500)
  }),
  summary: z.array(RowSchema).max(12),
  snapshotPngDataUrl: z.string().startsWith('data:image/png;base64,').nullable().optional(),
  fires: z.array(FireRowSchema).max(50),
  rooms: z.array(RoomRowSchema).max(300),
  pressure: z.array(PressureRowSchema).max(300),
  sizing: SizingSchema.nullable().optional(),
  doors: z.array(DoorRowSchema).max(600),
  evac: z.array(EvacRowSchema).max(300),
  formulas: z.array(FormulaSchema).max(20)
});

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const TEXT = rgb(0.1, 0.13, 0.2);
const MUTED = rgb(0.38, 0.43, 0.5);
const BORDER = rgb(0.83, 0.86, 0.9);
const HEADER_BG = rgb(0.95, 0.96, 0.98);
const PASS = rgb(0.12, 0.47, 0.24);
const WARN = rgb(0.58, 0.34, 0);
const FAIL = rgb(0.66, 0.14, 0.12);

type ReportBody = z.infer<typeof BodySchema>;

type DrawCtx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  unicode: boolean;
};

function stripDataUrl(input: string): Uint8Array {
  const base64 = input.split(',')[1] || '';
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

function sanitizeFilePart(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'fire-report';
}

function normalizePdfText(value: string, unicode: boolean): string {
  if (unicode) return value;
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?');
}

function truncateText(font: PDFFont, text: string, size: number, maxWidth: number): string {
  const original = text || '';
  if (!original) return '';
  if (font.widthOfTextAtSize(original, size) <= maxWidth) return original;
  let value = original;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}...`, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}...`;
}

function lineHeight(size: number, pad = 4): number {
  return size + pad;
}

function newPage(ctx: DrawCtx): void {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: DrawCtx, height: number): void {
  if (ctx.y - height < MARGIN) newPage(ctx);
}

function drawTextLine(
  ctx: DrawCtx,
  text: string,
  opts: {x?: number; size?: number; color?: ReturnType<typeof rgb>; font?: PDFFont} = {}
): void {
  const size = opts.size ?? 10;
  const font = opts.font ?? ctx.font;
  ensureSpace(ctx, lineHeight(size));
  ctx.page.drawText(normalizePdfText(text, ctx.unicode), {
    x: opts.x ?? MARGIN,
    y: ctx.y - size,
    size,
    font,
    color: opts.color ?? TEXT
  });
  ctx.y -= lineHeight(size);
}

function drawSectionTitle(ctx: DrawCtx, title: string): void {
  ensureSpace(ctx, 28);
  ctx.page.drawText(normalizePdfText(title, ctx.unicode), {
    x: MARGIN,
    y: ctx.y - 14,
    size: 13,
    font: ctx.bold,
    color: rgb(0.04, 0.13, 0.26)
  });
  ctx.y -= 18;
  ctx.page.drawLine({
    start: {x: MARGIN, y: ctx.y},
    end: {x: PAGE_W - MARGIN, y: ctx.y},
    thickness: 1,
    color: BORDER
  });
  ctx.y -= 10;
}

function drawMetaBlock(ctx: DrawCtx, body: ReportBody): void {
  drawTextLine(ctx, normalizePdfText(body.title, ctx.unicode), {size: 20, font: ctx.bold, color: rgb(0.04, 0.13, 0.26)});
  drawTextLine(
    ctx,
    normalizePdfText(`${body.projectName} · სცენარი: ${body.scenarioLabel} · სტანდარტი: ${body.standardLabel}`, ctx.unicode),
    {size: 10, color: MUTED}
  );
  drawTextLine(
    ctx,
    normalizePdfText(`t = ${body.simTimeS}s · ${body.timestamp} · Δp მინ = ${body.thresholds.dpMin} Pa · Fmax = ${body.thresholds.maxForceN} N`, ctx.unicode),
    {size: 10, color: MUTED}
  );
  ctx.y -= 4;
}

function drawSummary(ctx: DrawCtx, body: ReportBody): void {
  drawSectionTitle(ctx, 'ძირითადი მონაცემები');
  const colW = (PAGE_W - MARGIN * 2 - 12) / 2;
  const boxH = 36;
  body.summary.forEach((item, index) => {
    if (index % 2 === 0) ensureSpace(ctx, boxH + 8);
    const row = Math.floor(index / 2);
    const x = MARGIN + (index % 2) * (colW + 12);
    const y = ctx.y - row * (boxH + 8);
    ctx.page.drawRectangle({
      x,
      y: y - boxH,
      width: colW,
      height: boxH,
      borderWidth: 1,
      borderColor: BORDER,
      color: rgb(0.98, 0.99, 1)
    });
    ctx.page.drawText(truncateText(ctx.font, normalizePdfText(item.label, ctx.unicode), 9, colW - 16), {
      x: x + 8,
      y: y - 14,
      size: 9,
      font: ctx.font,
      color: MUTED
    });
    ctx.page.drawText(truncateText(ctx.bold, normalizePdfText(item.value, ctx.unicode), 13, colW - 16), {
      x: x + 8,
      y: y - 28,
      size: 13,
      font: ctx.bold,
      color: TEXT
    });
  });
  ctx.y -= Math.ceil(body.summary.length / 2) * (boxH + 8) + 6;
}

async function drawSnapshot(ctx: DrawCtx, pngDataUrl: string | null | undefined): Promise<void> {
  if (!pngDataUrl) return;
  drawSectionTitle(ctx, 'გეგმის snapshot');
  const png = await ctx.doc.embedPng(stripDataUrl(pngDataUrl));
  const maxW = PAGE_W - MARGIN * 2;
  const maxH = 240;
  const scale = Math.min(maxW / png.width, maxH / png.height);
  const width = png.width * scale;
  const height = png.height * scale;
  ensureSpace(ctx, height + 8);
  ctx.page.drawImage(png, {
    x: MARGIN + (maxW - width) / 2,
    y: ctx.y - height,
    width,
    height
  });
  ctx.y -= height + 14;
}

function drawTable(
  ctx: DrawCtx,
  title: string,
  headers: string[],
  rows: string[][],
  widths: number[]
): void {
  drawSectionTitle(ctx, title);
  const rowH = 16;
  const x0 = MARGIN;

  const drawHeader = () => {
    ensureSpace(ctx, rowH + 4);
    let x = x0;
    headers.forEach((header, index) => {
      ctx.page.drawRectangle({
        x,
        y: ctx.y - rowH,
        width: widths[index],
        height: rowH,
        borderWidth: 1,
        borderColor: BORDER,
        color: HEADER_BG
      });
      ctx.page.drawText(truncateText(ctx.bold, normalizePdfText(header, ctx.unicode), 8, widths[index] - 8), {
        x: x + 4,
        y: ctx.y - 11,
        size: 8,
        font: ctx.bold,
        color: TEXT
      });
      x += widths[index];
    });
    ctx.y -= rowH;
  };

  drawHeader();
  rows.forEach((row) => {
    if (ctx.y - rowH < MARGIN) {
      newPage(ctx);
      drawHeader();
    }
    let x = x0;
    row.forEach((cell, index) => {
      ctx.page.drawRectangle({
        x,
        y: ctx.y - rowH,
        width: widths[index],
        height: rowH,
        borderWidth: 1,
        borderColor: BORDER
      });
      const color = cell === 'PASS' ? PASS : cell === 'WARN' ? WARN : cell === 'FAIL' ? FAIL : TEXT;
      const font = cell === 'PASS' || cell === 'WARN' || cell === 'FAIL' ? ctx.bold : ctx.font;
      ctx.page.drawText(truncateText(font, normalizePdfText(cell, ctx.unicode), 8, widths[index] - 8), {
        x: x + 4,
        y: ctx.y - 11,
        size: 8,
        font,
        color
      });
      x += widths[index];
    });
    ctx.y -= rowH;
  });
  ctx.y -= 8;
}

function drawFormulaList(ctx: DrawCtx, formulas: ReportBody['formulas']): void {
  drawSectionTitle(ctx, 'გამოყენებული ფორმულები');
  if (!formulas.length) {
    drawTextLine(ctx, normalizePdfText('მითითებები არ არის მიწოდებული.', ctx.unicode), {size: 10, color: MUTED});
    return;
  }
  formulas.forEach((item) => {
    ensureSpace(ctx, 52);
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 44,
      width: PAGE_W - MARGIN * 2,
      height: 40,
      borderWidth: 1,
      borderColor: BORDER,
      color: rgb(0.985, 0.99, 1)
    });
    ctx.page.drawText(truncateText(ctx.bold, normalizePdfText(item.key, ctx.unicode), 9, PAGE_W - MARGIN * 2 - 12), {
      x: MARGIN + 6,
      y: ctx.y - 14,
      size: 9,
      font: ctx.bold,
      color: TEXT
    });
    if (item.expr) {
      ctx.page.drawText(truncateText(ctx.font, normalizePdfText(item.expr, ctx.unicode), 8, PAGE_W - MARGIN * 2 - 12), {
        x: MARGIN + 6,
        y: ctx.y - 25,
        size: 8,
        font: ctx.font,
        color: rgb(0.15, 0.18, 0.26)
      });
    }
    if (item.value) {
      ctx.page.drawText(truncateText(ctx.font, normalizePdfText(item.value, ctx.unicode), 8, PAGE_W - MARGIN * 2 - 12), {
        x: MARGIN + 6,
        y: ctx.y - 35,
        size: 8,
        font: ctx.font,
        color: MUTED
      });
    }
    ctx.page.drawText(truncateText(ctx.font, normalizePdfText(item.ref, ctx.unicode), 7, PAGE_W - MARGIN * 2 - 12), {
      x: MARGIN + 6,
      y: ctx.y - 43,
      size: 7,
      font: ctx.font,
      color: MUTED
    });
    ctx.y -= 48;
  });
}

function drawFooter(ctx: DrawCtx, body: ReportBody): void {
  ensureSpace(ctx, 24);
  ctx.y -= 6;
  ctx.page.drawLine({
    start: {x: MARGIN, y: ctx.y},
    end: {x: PAGE_W - MARGIN, y: ctx.y},
    thickness: 1,
    color: BORDER
  });
  ctx.y -= 14;
  ctx.page.drawText(normalizePdfText(`Generated by engineers.ge wall-editor · ${body.timestamp}`, ctx.unicode), {
    x: MARGIN,
    y: ctx.y - 8,
    size: 9,
    font: ctx.font,
    color: MUTED
  });
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request', message: 'invalid json'}, {status: 400});
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request', message: 'invalid fire report payload'}, {status: 400});
  }

  try {
    const body = parsed.data;
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    pdf.setTitle(body.title);
    pdf.setAuthor('engineers.ge');
    pdf.setSubject(`${body.scenarioLabel} · ${body.standardLabel}`);
    pdf.setCreator('engineers.ge wall-editor');

    let font: PDFFont | null = null;
    let bold: PDFFont | null = null;
    let unicode = false;
    const fontCandidates = [
      '/System/Library/Fonts/SFGeorgian.ttf',
      '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      '/Library/Fonts/Arial Unicode.ttf'
    ];
    for (const candidate of fontCandidates) {
      try {
        const bytes = await readFile(candidate);
        font = await pdf.embedFont(bytes, {subset: true});
        bold = font;
        unicode = true;
        break;
      } catch {}
    }
    if (!font || !bold) {
      font = await pdf.embedFont(StandardFonts.Helvetica);
      bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    }
    const ctx: DrawCtx = {
      doc: pdf,
      page: pdf.addPage([PAGE_W, PAGE_H]),
      font: font!,
      bold: bold!,
      y: PAGE_H - MARGIN,
      unicode
    };

    drawMetaBlock(ctx, body);
    drawSummary(ctx, body);
    await drawSnapshot(ctx, body.snapshotPngDataUrl);

    drawTable(
      ctx,
      `ცეცხლის წყაროები (${body.fires.length})`,
      ['#', 'Preset', 'Growth', 'HRR max', 'Q(t)', 'm', 'Layer H'],
      body.fires.map((item) => [
        String(item.i),
        String(item.preset),
        String(item.growth),
        String(item.hrrMax),
        item.Q,
        item.m,
        item.z
      ]),
      [28, 72, 70, 72, 60, 54, 70]
    );

    drawTable(
      ctx,
      `ოთახის სტატუსი (smoke layer ≥ ${body.thresholds.minLayerH.toFixed(1)} m)`,
      ['ოთახი', 'ფართობი', 'მოცულობა', 'Layer H', 'სტატუსი'],
      body.rooms.map((item) => [
        item.name,
        item.area,
        item.volume,
        item.layerH,
        item.pass ? 'PASS' : 'FAIL'
      ]),
      [190, 70, 78, 72, 70]
    );

    if (body.pressure.length) {
      drawTable(
        ctx,
        `ზონების Δp შესაბამისობა (min ${body.thresholds.dpMin} Pa)`,
        ['ზონა', 'Req', 'Avg', 'Peak', 'სტატუსი'],
        body.pressure.map((item) => [
          item.name,
          item.target,
          item.avg,
          item.peak,
          item.status
        ]),
        [200, 70, 70, 70, 105]
      );
    }

    if (body.sizing) {
      drawTable(
        ctx,
        'ვენტილატორის sizing / derate',
        ['Q leak', 'Q open', 'Q req', 'Q avail@T', 'T °C', 'სტატუსი'],
        [[
          body.sizing.leak,
          body.sizing.open,
          body.sizing.required,
          body.sizing.available,
          body.sizing.temp,
          body.sizing.status
        ]],
        [78, 78, 82, 98, 66, 113]
      );
    }

    drawTable(
      ctx,
      `კარის ძალა და ხარჯი (warn ${body.thresholds.warnForceN} N · max ${body.thresholds.maxForceN} N)`,
      ['ID', 'W', 'H', 'Δp', 'State', 'v class', 'Q m³/s', 'F', 'სტატუსი'],
      body.doors.map((item) => [
        `#${item.id}`,
        item.w,
        item.h,
        item.dp,
        item.state,
        item.vClass,
        item.flow,
        item.force,
        item.pass ? (item.warn ? 'WARN' : 'PASS') : 'FAIL'
      ]),
      [56, 46, 46, 52, 50, 74, 52, 56, 83]
    );

    drawTable(
      ctx,
      'ევაკუაციის მარშრუტები',
      ['ოთახი', 'გასასვლელი', 'მანძ.', 'დრო', 'Smoke', 'სტატუსი'],
      body.evac.map((item) => [
        item.name,
        item.exit,
        item.distance,
        item.travelT,
        item.smoke,
        item.status
      ]),
      [168, 108, 60, 60, 70, 70]
    );

    drawFormulaList(ctx, body.formulas);
    drawFooter(ctx, body);

    const bytes = await pdf.save();
    const filename = `${sanitizeFilePart(body.projectName)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to generate pdf';
    return NextResponse.json({error: 'failed', message}, {status: 500});
  }
}
