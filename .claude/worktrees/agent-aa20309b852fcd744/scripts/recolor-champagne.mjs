/**
 * Recolor chestnut sprite to champagne color.
 * Champagne horses have a golden/tan hue.
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "..", "src", "assets");

async function recolorToChampagne() {
  const inputPath = path.join(ASSETS_DIR, "horse-ch.png");
  const outputPath = path.join(ASSETS_DIR, "horse-champagne.png");

  // Read the chestnut sprite
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  // Create champagne-colored version
  // Champagne: golden/tan with pinkish tint
  const channels = info.channels;
  const buffer = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Convert to champagne color
    // Increase red/green, reduce blue for golden/tan hue
    const newR = Math.min(255, Math.floor(r * 1.1 + 20));
    const newG = Math.min(255, Math.floor(g * 1.05 + 15));
    const newB = Math.max(0, Math.floor(b * 0.7));

    buffer[i] = newR;
    buffer[i + 1] = newG;
    buffer[i + 2] = newB;
    buffer[i + 3] = a;
  }

  // Write the recolored image
  await sharp(buffer, { raw: info }).png().toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`✓ Created champagne sprite: ${(stats.size / 1024).toFixed(1)}KB`);
}

recolorToChampagne().catch(console.error);
