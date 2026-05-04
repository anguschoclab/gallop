/**
 * Create 6-frame sprite sheets for new Thoroughbred coat colors.
 * 
 * Generates sprites by applying color transformations to existing base sprites
 * using Sharp's tint and modulate operations.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');

// Color transformation definitions
// Each defines how to transform a base sprite into a new color variant
const COLOR_TRANSFORMS = {
  // Seal brown: Very dark brown, nearly black
  'seal': {
    base: 'dkb',
    modulate: { brightness: 0.70, saturation: 0.85 },
    tint: { r: 80, g: 60, b: 50 }, // Dark brown tint
  },
  // Liver chestnut: Dark reddish brown
  'liver': {
    base: 'ch',
    modulate: { brightness: 0.65, saturation: 1.15 },
    tint: { r: 120, g: 40, b: 30 }, // Dark reddish tint
  },
  // Buckskin: Golden-tan with black points
  'buck': {
    base: 'b',
    modulate: { brightness: 1.2, saturation: 0.75 },
    tint: { r: 220, g: 180, b: 100 }, // Golden tint
  },
  // Dun: Tan/buff with primitive markings
  'dun': {
    base: 'ch',
    modulate: { brightness: 1.05, saturation: 0.55 },
    tint: { r: 180, g: 160, b: 120 }, // Tan/buff tint
  },
  // Grulla: Mouse-gray (blue-gray)
  'grulla': {
    base: 'gr',
    modulate: { brightness: 0.85, saturation: 0.6 },
    tint: { r: 100, g: 110, b: 115 }, // Blue-gray tint
  },
  // Champagne: Metallic golden sheen
  'champagne': {
    base: 'palomino',
    modulate: { brightness: 1.15, saturation: 0.65 },
    tint: { r: 230, g: 200, b: 170 }, // Peachy gold metallic
  },
};

async function applyColorTransform(inputPath, outputPath, transform) {
  let pipeline = sharp(inputPath);
  
  // Apply modulation (brightness, saturation)
  if (transform.modulate) {
    pipeline = pipeline.modulate(transform.modulate);
  }
  
  // Apply tint
  if (transform.tint) {
    pipeline = pipeline.tint(transform.tint);
  }
  
  await pipeline.toFile(outputPath);
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
