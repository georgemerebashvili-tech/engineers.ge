#!/usr/bin/env node
import {existsSync} from 'fs';
import {mkdir} from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const input = path.join(root, 'public', 'dmt', '_raw', 'sazeo-uncropped.png');
const output = path.join(root, 'public', 'dmt', 'logo.png');
const padding = 8;

if (!existsSync(input)) {
  console.error(`[crop-logo] Missing raw logo: ${path.relative(root, input)}`);
  console.error('[crop-logo] Save the provided sazeo wordmark there, then run `npm run crop-logo`.');
  process.exit(1);
}

const image = sharp(input).ensureAlpha();
const {data, info} = await image.raw().toBuffer({resolveWithObject: true});
const channels = info.channels;
let left = info.width;
let top = info.height;
let right = -1;
let bottom = -1;

function isBackground(offset) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const a = data[offset + 3];
  return a <= 10 || (r >= 250 && g >= 250 && b >= 250);
}

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * channels;
    if (isBackground(offset)) continue;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
}

if (right < left || bottom < top) {
  console.error('[crop-logo] Could not find non-white logo pixels.');
  process.exit(1);
}

left = Math.max(0, left - padding);
top = Math.max(0, top - padding);
right = Math.min(info.width - 1, right + padding);
bottom = Math.min(info.height - 1, bottom + padding);

await mkdir(path.dirname(output), {recursive: true});
const result = await sharp(input)
  .extract({left, top, width: right - left + 1, height: bottom - top + 1})
  .png({compressionLevel: 9})
  .toFile(output);

console.log(`[crop-logo] Wrote ${path.relative(root, output)} (${result.width}x${result.height})`);
