#!/usr/bin/env node
// Walk every PDF page's /Resources/XObject and extract Image streams to disk.
// pdf-lib doesn't expose direct image extraction, so we walk the AST and
// reconstruct PNG/JPG bytes from the raw stream + filter information.
import {existsSync} from 'fs';
import {readFile, writeFile, mkdir} from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import {PDFDocument, PDFRawStream, PDFName, PDFArray, PDFDict} from 'pdf-lib';
import sharp from 'sharp';

const root = process.cwd();
const sourcePdf = path.join(process.env.USERPROFILE ?? '', 'Downloads', 'test.pdf');
const dumpDir = path.join(root, 'public', 'dmt', '_pdf-dump');

if (!existsSync(sourcePdf)) {
  console.error(`[sakpatenti] missing test.pdf at ${sourcePdf}`);
  process.exit(1);
}

await mkdir(dumpDir, {recursive: true});

const buf = await readFile(sourcePdf);
const doc = await PDFDocument.load(buf, {ignoreEncryption: true});
const ctx = doc.context;
console.log(`[sakpatenti] PDF loaded — ${doc.getPageCount()} pages`);

const seen = new Set();

const handleXObject = async (objRef, obj, page, key) => {
  if (!(obj instanceof PDFRawStream)) return;
  const dict = obj.dict;
  const subtypeRef = dict.lookup(PDFName.of('Subtype'));
  const subtype = subtypeRef instanceof PDFName ? subtypeRef.encodedName : '';
  if (subtype !== '/Image') return;
  const refKey = String(objRef);
  if (seen.has(refKey)) return;
  seen.add(refKey);

  const widthObj = dict.lookup(PDFName.of('Width'));
  const heightObj = dict.lookup(PDFName.of('Height'));
  const w = widthObj?.numberValue ?? 0;
  const h = heightObj?.numberValue ?? 0;
  const filterObj = dict.lookup(PDFName.of('Filter'));
  let filters = [];
  if (filterObj instanceof PDFName) filters = [filterObj.encodedName];
  else if (filterObj instanceof PDFArray) {
    filters = filterObj.array.map((it) => (it instanceof PDFName ? it.encodedName : String(it)));
  }
  const colorSpaceObj = dict.lookup(PDFName.of('ColorSpace'));
  const colorSpace = colorSpaceObj instanceof PDFName ? colorSpaceObj.encodedName : (colorSpaceObj ? '<complex>' : '');
  const bpc = dict.lookup(PDFName.of('BitsPerComponent'))?.numberValue ?? 8;

  const filterStr = filters.join(',');
  const stem = `page${page}-${key}-${w}x${h}-${filterStr.replace(/[\/]/g, '')}`;
  console.log(`[img] ${stem}  cs=${colorSpace} bpc=${bpc} bytes=${obj.contents.length}`);

  // DCTDecode = JPEG raw bytes — write directly.
  if (filters.includes('/DCTDecode')) {
    const out = path.join(dumpDir, `${stem}.jpg`);
    await writeFile(out, Buffer.from(obj.contents));
    return;
  }
  // FlateDecode + 8bpc + DeviceRGB/DeviceGray = raw pixel data — wrap into PNG.
  if (filters.includes('/FlateDecode')) {
    let raw;
    try {
      raw = zlib.inflateSync(Buffer.from(obj.contents));
    } catch (err) {
      console.warn(`[img] inflate failed for ${stem}: ${err.message}`);
      return;
    }
    let channels = 0;
    if (colorSpace === '/DeviceRGB') channels = 3;
    else if (colorSpace === '/DeviceGray') channels = 1;
    else if (colorSpace === '/DeviceCMYK') channels = 4;
    if (channels === 0) {
      const guess = Math.round(raw.length / (w * h));
      if ([1, 3, 4].includes(guess)) channels = guess;
    }
    if (!w || !h || !channels) {
      console.warn(`[img] unknown dimensions for ${stem}`);
      return;
    }
    try {
      const out = path.join(dumpDir, `${stem}.png`);
      await sharp(raw, {raw: {width: w, height: h, channels}})
        .png({compressionLevel: 9})
        .toFile(out);
    } catch (err) {
      console.warn(`[img] sharp failed for ${stem}: ${err.message}`);
    }
  }
};

for (let i = 0; i < doc.getPageCount(); i += 1) {
  const page = doc.getPage(i);
  const resourcesRef = page.node.get(PDFName.of('Resources'));
  const resources = resourcesRef instanceof PDFDict ? resourcesRef : ctx.lookup(resourcesRef);
  if (!resources || !(resources instanceof PDFDict)) continue;
  const xobjectsRef = resources.get(PDFName.of('XObject'));
  const xobjects = xobjectsRef instanceof PDFDict ? xobjectsRef : ctx.lookup(xobjectsRef);
  if (!xobjects || !(xobjects instanceof PDFDict)) continue;
  for (const [keyName, valueRef] of xobjects.entries()) {
    const obj = ctx.lookup(valueRef);
    await handleXObject(valueRef, obj, i + 1, keyName.encodedName.replace('/', ''));
  }
}

console.log(`[sakpatenti] dumped to ${path.relative(root, dumpDir)}`);
