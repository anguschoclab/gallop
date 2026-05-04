/**
 * Create 6-frame sprite sheets for new Thoroughbred coat colors.
 * 
 * Generates sprites by applying color transformations to existing base sprites:
 * - seal-brown: Darker brown from dark-bay
 * - liver-chestnut: Darker chestnut from chestnut
 * - buckskin: Golden from bay with dilution
 * - dun: Tan/buff from chestnut with primitive marks
 * - grulla: Mouse-gray from black/gray
 * - champagne: Metallic sheen from chestnut/bay
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');

// Color transformation matrices (simplified RGB shifts)
const COLOR_TRANSFORMS = {
  // Seal brown: Very dark brown, nearly black (use dark-bay base, darken)
  'seal': {
    base: 'dkb',
    brightness: 0.70,
    saturation: 0.85,
    hue: 0, // no hue shift
    redShift: -20,
    greenShift: -10,
    blueShift: -5,
  },
  // Liver chestnut: Dark reddish brown (use chestnut base, darken and redden)
  'liver': {
    base: 'ch',
    brightness: 0.65,
    saturation: 1.1,
    hue: -5, // slightly more red
    redShift: -10,
    greenShift: -25,
    blueShift: -25,
  },
  // Buckskin: Golden-tan with black points (use bay base, lighten and yellow)
  'buck': {
    base: 'b',
    brightness: 1.15,
    saturation: 0.8,
    hue: 15, // toward yellow/gold
    redShift: 20,
    greenShift: 15,
    blueShift: -30,
  },
  // Dun: Tan with primitive markings (use chestnut base, desaturate to tan)
  'dun': {
    base: 'ch',
    brightness: 1.05,
    saturation: 0.6,
    hue: 25, // toward tan/buff
    redShift: 10,
    greenShift: 5,
    blueShift: -20,
  },
  // Grulla: Mouse-gray (use gray base, shift to blue-gray)
  'grulla': {
    base: 'gr',
    brightness: 0.90,
    saturation: 0.7,
    hue: -20, // toward blue-gray
    redShift: -15,
    greenShift: -10,
    blueShift: 5,
  },
  // Champagne: Metallic golden sheen (use palomino base, enhance metallic)
  'champagne': {
    base: 'palomino',
    brightness: 1.1,
    saturation: 0.75,
    hue: 10, // peachy gold
    redShift: 25,
    greenShift: 15,
    blueShift: -10,
  },
};

async function applyColorTransform(inputPath, outputPath, transform) {
  const { brightness, saturation, hue, redShift, greenShift, blueShift } = transform;
  
  // Apply transformations using Sharp's modulation and linear adjustments
  await sharp(inputPath)
    .modulate({
      brightness: brightness || 1.0,
      saturation: saturation || 1.0,
      hue: hue || 0,
    })
    .linear(
      1.0, // contrast multiplier
      { 
        r: redShift || 0, 
        g: greenShift || 0, 
        b: blueShift || 0 
      } // RGB shifts
    )
    .toFile(outputPath);
}

async function createNewSprites() {
  console.log('Creating sprite sheets for new Thoroughbred coat colors...\n');
  
  for (const [name, transform] of Object.entries(COLOR_TRANSFORMS)) {
    const basePath = path.join(ASSETS_DIR, `horse-${transform.base}.png`);
    const outputPath = path.join(ASSETS_DIR, `horse-${name}.png`);
    
    if (!fs.existsSync(basePath)) {
      console.log(`⚠️  Base sprite not found: ${basePath}`);
      continue;
    }
    
    try {
      await applyColorTransform(basePath, outputPath, transform);
      
      // Verify output
      const metadata = await sharp(outputPath).metadata();
      console.log(`✓ Created: horse-${name}.png (${metadata.width}x${metadata.height}px)`);
    } catch (err) {
      console.error(`✗ Failed ${name}:`, err.message);
    }
  }
  
  console.log('\nDone! New sprite sheets created.');
}

createNewSprites().catch(console.error);
