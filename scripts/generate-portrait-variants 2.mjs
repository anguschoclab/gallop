/**
 * Generate 5 missing horse portrait variants by recoloring existing portraits.
 *
 * Missing: seal-brown, liver-chestnut, dun, grulla, champagne
 * Uses sharp for per-pixel RGBA color transformation.
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTRAITS_DIR = path.join(__dirname, "..", "src", "assets", "portraits");

/**
 * Recolor a portrait PNG using a per-pixel transform function.
 * @param {string} sourceName - Source filename (e.g. "horse-portrait-bay.png")
 * @param {string} outputName - Output filename
 * @param {(r:number, g:number, b:number, a:number) => [number,number,number,number]} transform
 */
async function recolorPortrait(sourceName, outputName, transform) {
  const inputPath = path.join(PORTRAITS_DIR, sourceName);
  const outputPath = path.join(PORTRAITS_DIR, outputName);

  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const buffer = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = channels === 4 ? data[i + 3] : 255;

    const [nr, ng, nb, na] = transform(r, g, b, a);
    buffer[i] = Math.max(0, Math.min(255, Math.round(nr)));
    buffer[i + 1] = Math.max(0, Math.min(255, Math.round(ng)));
    buffer[i + 2] = Math.max(0, Math.min(255, Math.round(nb)));
    if (channels === 4) buffer[i + 3] = Math.max(0, Math.min(255, Math.round(na)));
  }

  await sharp(buffer, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`✓ ${outputName} (${(stats.size / 1024).toFixed(0)}KB)`);
}

// Helper: convert RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h, s, l];
}

// Helper: convert HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

async function main() {
  console.log("Generating 5 missing portrait variants...\n");

  // 1. Seal-brown from bay: Very dark brown, nearly black body, dark mane
  await recolorPortrait("horse-portrait-bay.png", "horse-portrait-seal-brown.png", (r, g, b, a) => {
    if (a < 10) return [r, g, b, a]; // preserve transparent
    const [h, s, l] = rgbToHsl(r, g, b);
    // Darken significantly, keep warm brown hue
    const newL = l * 0.45;
    const newS = Math.min(1, s * 0.8);
    const [nr, ng, nb] = hslToRgb(h, newS, newL);
    return [nr, ng, nb, a];
  });

  // 2. Liver-chestnut from chestnut: Deeper, darker red-brown
  await recolorPortrait(
    "horse-portrait-chestnut.png",
    "horse-portrait-liver-chestnut.png",
    (r, g, b, a) => {
      if (a < 10) return [r, g, b, a];
      const [h, s, l] = rgbToHsl(r, g, b);
      // Darken and push toward deeper red-brown
      const newL = l * 0.6;
      const newS = Math.min(1, s * 1.1);
      // Shift hue slightly toward red
      const newH = h > 0.02 && h < 0.15 ? h * 0.9 : h;
      const [nr, ng, nb] = hslToRgb(newH, newS, newL);
      return [nr, ng, nb, a];
    },
  );

  // 3. Dun from buckskin: Sandy/dusty tan, slightly muted vs buckskin's golden
  await recolorPortrait("horse-portrait-buckskin.png", "horse-portrait-dun.png", (r, g, b, a) => {
    if (a < 10) return [r, g, b, a];
    const [h, s, l] = rgbToHsl(r, g, b);
    // Desaturate somewhat and shift toward dusty/sandy tone
    const newS = s * 0.6;
    const newL = l * 0.9;
    // Shift hue slightly warmer (toward more yellow-brown)
    const newH = h > 0.05 && h < 0.2 ? h + 0.02 : h;
    const [nr, ng, nb] = hslToRgb(newH, newS, newL);
    return [nr, ng, nb, a];
  });

  // 4. Grulla from gray: Smoky mouse-dun, warm olive-brown tint over gray
  await recolorPortrait("horse-portrait-gray.png", "horse-portrait-grulla.png", (r, g, b, a) => {
    if (a < 10) return [r, g, b, a];
    const [h, s, l] = rgbToHsl(r, g, b);
    // Add warm brown-olive tint to grays
    const newH = 0.08; // olive-brown hue
    const newS = Math.min(1, s + 0.15); // add some saturation
    const newL = l * 0.85; // slightly darker
    const [nr, ng, nb] = hslToRgb(newH, newS, newL);
    return [nr, ng, nb, a];
  });

  // 5. Champagne from palomino: Lighter, pinker golden, slightly desaturated
  await recolorPortrait(
    "horse-portrait-palomino.png",
    "horse-portrait-champagne.png",
    (r, g, b, a) => {
      if (a < 10) return [r, g, b, a];
      const [h, s, l] = rgbToHsl(r, g, b);
      // Lighten, desaturate, add slight pink warmth
      const newL = Math.min(1, l * 1.15 + 0.05);
      const newS = s * 0.65;
      // Shift hue slightly toward pink/rose
      const newH = h > 0.02 && h < 0.15 ? h - 0.02 : h;
      const [nr, ng, nb] = hslToRgb(newH, newS, newL);
      return [nr, ng, nb, a];
    },
  );

  console.log("\nDone! All 5 portrait variants generated.");
}

main().catch(console.error);
