/**
 * Convert large single-frame horse sprites to 6-frame animated sprite sheets.
 * 
 * For seal, liver, dun, grulla: 300x100 single-frame → 300x50 animated (6 frames × 50px)
 * For champagne: 300x50 single-frame → 300x50 animated (6 frames × 50px)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');

// Frame transformations for galloping animation
const FRAME_OFFSETS = [
  { y: 2, rotate: -2 },    // Frame 0: Prep
  { y: -2, rotate: -1 },   // Frame 1: Push off
  { y: -4, rotate: 0 },    // Frame 2: Extension
  { y: -1, rotate: 1 },    // Frame 3: Landing
  { y: 3, rotate: 2 },     // Frame 4: Compression
  { y: 1, rotate: 1 },     // Frame 5: Recovery
];

async function createSpriteSheetFromLarge(name, sourceHeight) {
  const inputPath = path.join(ASSETS_DIR, `horse-${name}.png`);
  const outputPath = path.join(ASSETS_DIR, `horse-${name}.png`);
  const backupPath = path.join(ASSETS_DIR, `horse-${name}-backup.png`);
  
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Input not found: ${inputPath}`);
    return;
  }
  
  // Backup original
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
  }
  
  // Read source image
  const source = sharp(inputPath);
  const metadata = await source.metadata();
  
  console.log(`Processing ${name}: ${metadata.width}x${metadata.height}px`);
  
  // Extract the horse from the center of the 300x100 image
  // Assuming horse is in the middle, crop to 50x50 region
  const cropWidth = 50;
  const cropHeight = 50;
  const cropLeft = Math.floor((metadata.width - cropWidth) / 2);
  const cropTop = Math.floor((metadata.height - cropHeight) / 2);
  
  // Extract base horse frame
  const baseHorse = await source
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();
  
  // Create 6 animated frames
  const frames = [];
  for (let i = 0; i < 6; i++) {
    const offset = FRAME_OFFSETS[i];
    
    // Create frame with transformation
    const frame = sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    
    // Resize base horse slightly smaller for animation effect
    const resized = sharp(baseHorse).resize(44, 44, { fit: 'inside' });
    
    // Composite with offset
    const frameBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: await resized.toBuffer(),
        top: 3 + offset.y,
        left: 3,
      }])
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    frames.push(frameBuffer.data);
  }
  
  // Create 300x50 canvas and place frames side by side
  const canvas = sharp({
    create: {
      width: 300,
      height: 50,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });
  
  // Composite all frames
  const composites = frames.map((frameData, i) => ({
    input: Buffer.from(frameData),
    raw: { width: 50, height: 50, channels: 4 },
    left: i * 50,
    top: 0,
  }));
  
  await canvas
    .composite(composites)
    .png()
    .toFile(outputPath);
  
  const stats = fs.statSync(outputPath);
  console.log(`✓ Created: horse-${name}.png (300x50, 6 frames, ${(stats.size / 1024).toFixed(1)}KB)`);
}

async function main() {
  const sprites = [
    { name: 'seal', height: 100 },
    { name: 'liver', height: 100 },
    { name: 'dun', height: 100 },
    { name: 'grulla', height: 100 },
    { name: 'champagne', height: 50 },
  ];
  
  console.log('Converting single-frame sprites to animated sprite sheets...\n');
  
  for (const { name, height } of sprites) {
    try {
      await createSpriteSheetFromLarge(name, height);
    } catch (err) {
      console.error(`✗ Failed ${name}:`, err.message);
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
