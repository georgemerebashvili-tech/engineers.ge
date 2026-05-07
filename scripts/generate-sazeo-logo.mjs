#!/usr/bin/env node
// Process the user-provided brand assets (icon + wordmark) to trimmed PNGs
// with transparent backgrounds, ready for the offer PDF template.
import {existsSync} from 'fs';
import {mkdir} from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const padding = 24;

const targets = [
  {
    label: 'icon',
    source: path.join(root, 'public', 'dmt', 'logo-source.jpg'),
    output: path.join(root, 'public', 'dmt', 'logo.png'),
  },
  {
    label: 'wordmark',
    source: path.join(root, 'public', 'dmt', 'wordmark-source.png'),
    output: path.join(root, 'public', 'dmt', 'wordmark.png'),
  },
];

async function processOne({label, source, output}) {
  if (!existsSync(source)) {
    console.error(`[${label}] Missing source: ${path.relative(root, source)} (skipping)`);
    return;
  }
  await mkdir(path.dirname(output), {recursive: true});

  // 1) detect non-white bbox in raw pixels
  const probe = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const ch = probe.info.channels;
  let left = probe.info.width;
  let top = probe.info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < probe.info.height; y += 1) {
    for (let x = 0; x < probe.info.width; x += 1) {
      const offset = (y * probe.info.width + x) * ch;
      const r = probe.data[offset];
      const g = probe.data[offset + 1];
      const b = probe.data[offset + 2];
      const a = probe.data[offset + 3];
      const isBg = a <= 10 || (r >= 245 && g >= 245 && b >= 245);
      if (isBg) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) {
    console.error(`[${label}] No non-white pixels found in ${path.basename(source)}`);
    return;
  }
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(probe.info.width - 1, right + padding);
  bottom = Math.min(probe.info.height - 1, bottom + padding);

  // 2) crop + flatten white-to-transparent
  const cropped = await sharp(source)
    .extract({left, top, width: right - left + 1, height: bottom - top + 1})
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject: true});

  const px = cropped.data;
  for (let i = 0; i < px.length; i += cropped.info.channels) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (r >= 245 && g >= 245 && b >= 245) px[i + 3] = 0;
  }

  const result = await sharp(px, {
    raw: {
      width: cropped.info.width,
      height: cropped.info.height,
      channels: cropped.info.channels,
    },
  }).png({compressionLevel: 9}).toFile(output);

  console.log(`[${label}] → ${path.relative(root, output)} (${result.width}x${result.height})`);
}

for (const t of targets) await processOne(t);
