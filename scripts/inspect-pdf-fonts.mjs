#!/usr/bin/env node
// Enumerate all embedded font objects in a PDF and extract them to disk if possible.
import {existsSync} from 'fs';
import {readFile, writeFile, mkdir} from 'fs/promises';
import path from 'path';
import {PDFDocument, PDFRawStream, PDFName, PDFDict, PDFArray, PDFRef} from 'pdf-lib';

const root = process.cwd();
const sourcePdf = process.argv[2] || path.join(process.env.USERPROFILE ?? '', 'Downloads', 'აურა ფიტნესი.pdf');
const dumpDir = path.join(root, 'public', 'dmt', '_pdf-fonts');

if (!existsSync(sourcePdf)) {
  console.error(`Missing PDF at ${sourcePdf}`);
  process.exit(1);
}

await mkdir(dumpDir, {recursive: true});
const buf = await readFile(sourcePdf);
const doc = await PDFDocument.load(buf, {ignoreEncryption: true});
const ctx = doc.context;
console.log(`PDF loaded — ${doc.getPageCount()} pages, ${ctx.indirectObjects.size} objects`);

const seenFontFiles = new Set();
const fontDescriptors = [];

for (const [ref, obj] of ctx.indirectObjects) {
  if (!(obj instanceof PDFDict)) continue;
  const type = obj.lookup(PDFName.of('Type'));
  if (!(type instanceof PDFName)) continue;
  const typeName = type.encodedName;
  if (typeName === '/Font') {
    const subtype = obj.lookup(PDFName.of('Subtype'));
    const baseFont = obj.lookup(PDFName.of('BaseFont'));
    const encoding = obj.lookup(PDFName.of('Encoding'));
    fontDescriptors.push({
      ref: String(ref),
      subtype: subtype instanceof PDFName ? subtype.encodedName : '?',
      baseFont: baseFont instanceof PDFName ? baseFont.encodedName : '?',
      encoding: encoding instanceof PDFName ? encoding.encodedName : (encoding ? '<dict>' : ''),
    });
  }
  if (typeName === '/FontDescriptor') {
    const fontName = obj.lookup(PDFName.of('FontName'));
    const flags = obj.lookup(PDFName.of('Flags'));
    const fontFile = obj.lookup(PDFName.of('FontFile'))
      || obj.lookup(PDFName.of('FontFile2'))
      || obj.lookup(PDFName.of('FontFile3'));
    const variant = obj.lookup(PDFName.of('FontFile2')) ? 'TrueType (FontFile2)'
      : obj.lookup(PDFName.of('FontFile3')) ? 'OpenType (FontFile3)'
      : obj.lookup(PDFName.of('FontFile')) ? 'Type1 (FontFile)' : '?';

    const name = fontName instanceof PDFName ? fontName.encodedName : '?';
    const flagsStr = flags?.numberValue ?? '?';
    console.log(`\n  FontDescriptor ${ref}: ${name}`);
    console.log(`    flags=${flagsStr} variant=${variant}`);

    if (fontFile instanceof PDFRawStream) {
      const cleanName = name.replace(/^\//, '').replace(/[^A-Za-z0-9_-]/g, '_');
      if (!seenFontFiles.has(cleanName)) {
        seenFontFiles.add(cleanName);
        const ext = variant.includes('OpenType') ? 'otf' : 'ttf';
        const out = path.join(dumpDir, `${cleanName}.${ext}`);
        try {
          // Write the raw font program bytes — these are NOT compressed in our case
          // because pdf-lib stores PDFRawStream's contents already decoded.
          // Some PDFs store it compressed; if so, the stream would decode via /Filter.
          const filter = obj.lookup ? null : null;
          // Best effort: write raw bytes; if it's flate-encoded TTF, manual inflate may be needed
          await writeFile(out, Buffer.from(fontFile.contents));
          console.log(`    -> dumped ${path.relative(root, out)} (${fontFile.contents.length} bytes raw)`);
        } catch (err) {
          console.warn(`    write failed: ${err.message}`);
        }
      }
    }
  }
}

console.log(`\n=== Font references summary ===`);
fontDescriptors.forEach((f) => {
  console.log(`  ${f.ref}: subtype=${f.subtype} baseFont=${f.baseFont} encoding=${f.encoding}`);
});

console.log(`\nDumped ${seenFontFiles.size} font file(s) to ${path.relative(root, dumpDir)}`);
