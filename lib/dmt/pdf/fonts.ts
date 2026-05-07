import 'server-only';
import {readFile} from 'fs/promises';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, StandardFonts, type PDFFont} from 'pdf-lib';

export type OfferPdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
  unicode: boolean;
};

// Pairs are tried in order; first pair that loads BOTH regular + bold is used.
// "static" Noto Sans Georgian static instances (separate files per weight) is
// preferred over the variable font because pdf-lib + fontkit handle static
// instances reliably across pdf viewers.
const FONT_PAIR_CANDIDATES: Array<{regular: string; bold: string}> = [
  {
    regular: path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian-Regular-static.ttf'),
    bold: path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian-Bold.ttf'),
  },
  {
    regular: path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian-Regular.ttf'),
    bold: path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian-Bold.ttf'),
  },
  // No bold-pair available for Sylfaen on Windows; falls through to single-font fallback.
];

const SINGLE_FONT_FALLBACK = [
  path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian-Regular.ttf'),
  path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian-Regular-static.ttf'),
  path.join(process.cwd(), 'public', 'fonts', 'sylfaen.ttf'),
  'C:\\Windows\\Fonts\\sylfaen.ttf',
  '/System/Library/Fonts/SFGeorgian.ttf',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/Library/Fonts/Arial Unicode.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansGeorgian-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
];

async function tryReadFile(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function loadOfferPdfFonts(pdf: PDFDocument): Promise<OfferPdfFonts> {
  pdf.registerFontkit(fontkit);

  // Prefer real Regular + Bold pair so bold actually renders heavier weight.
  for (const pair of FONT_PAIR_CANDIDATES) {
    const [regularBytes, boldBytes] = await Promise.all([
      tryReadFile(pair.regular),
      tryReadFile(pair.bold),
    ]);
    if (regularBytes && boldBytes) {
      const regular = await pdf.embedFont(regularBytes, {subset: true});
      const bold = await pdf.embedFont(boldBytes, {subset: true});
      return {regular, bold, unicode: true};
    }
  }

  // Fallback: single Unicode-capable font, bold = regular (no real bold weight).
  for (const candidate of SINGLE_FONT_FALLBACK) {
    const bytes = await tryReadFile(candidate);
    if (bytes) {
      const regular = await pdf.embedFont(bytes, {subset: true});
      return {regular, bold: regular, unicode: true};
    }
  }

  // Last resort: standard Helvetica (no Georgian support).
  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    unicode: false
  };
}
