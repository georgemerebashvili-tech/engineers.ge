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

const FONT_CANDIDATES = [
  path.join(process.cwd(), 'public', 'fonts', 'noto-sans-georgian.ttf'),
  path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian-Regular.ttf'),
  path.join(process.cwd(), 'public', 'fonts', 'sylfaen.ttf'),
  'C:\\Windows\\Fonts\\sylfaen.ttf',
  'C:\\Windows\\Fonts\\arial.ttf',
  '/System/Library/Fonts/SFGeorgian.ttf',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/Library/Fonts/Arial Unicode.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansGeorgian-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
];

export async function loadOfferPdfFonts(pdf: PDFDocument): Promise<OfferPdfFonts> {
  pdf.registerFontkit(fontkit);

  for (const candidate of FONT_CANDIDATES) {
    try {
      const bytes = await readFile(candidate);
      const regular = await pdf.embedFont(bytes, {subset: true});
      return {regular, bold: regular, unicode: true};
    } catch {}
  }

  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    unicode: false
  };
}
