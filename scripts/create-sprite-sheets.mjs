/**
 * Create 6-frame sprite sheets from single-frame horse sprites.
 * 
 * Each sprite sheet: 300x50px (6 frames × 50px width each)
 * Frame sequence: running animation loop
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');

// Frame transformations for galloping animation
// Each frame applies slight offset/transform to simulate motion
const FRAME_OFFSETS = [
  { y: 2, rotate: -2 },    // Frame 0: Prep - legs gathering
  { y: -2, rotate: -1 },   // Frame 1: Push off - rear legs driving
  { y: -4, rotate: 0 },    // Frame 2: Extension - all legs off ground  
  { y: -1, rotate: 1 },    // Frame 3: Landing - front legs touch
  { y: 3, rotate: 2 },     // Frame 4: Compression - weight down
  { y: 1, rotate: 1 },     // Frame 5: Recovery - preparing next stride
];

async function createSpriteSheet(name) {
  const inputPath = path.join(ASSETS_DIR, `horse-${name}.png`);
  const outputPath = path.join(ASSETS_DIR, `horse-${name}.png`);
  const backupPath = path.join(ASSETS_DIR, `horse-${name}-single.png`);
  
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Input not found: ${inputPath}`);
    return;
  }
  
  // Backup original
  fs.copyFileSync(inputPath, backupPath);
  
  // Read source image
  const source = sharp(inputPath);
  const metadata = await source.metadata();
  
  console.log(`Processing ${name}: ${metadata.width}x${metadata.height}px`);
  
  // Create 6 variations as buffers
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
    
    // Resize source and overlay with offset
    const resized = source.resize(44, 44, { fit: 'inside' });
    
    // Composite the resized image onto the frame with offset
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
  
  console.log(`✓ Created: horse-${name}.png (300x50, 6 frames)`);
}

async function main() {
  const sprites = ['roan', 'palomino', 'white', 'seal', 'liver', 'dun', 'grulla', 'champagne'];
  
  console.log('Creating 6-frame sprite sheets...\n');
  
  for (const name of sprites) {
    try {
      await createSpriteSheet(name);
    } catch (err) {
      console.error(`✗ Failed ${name}:`, err.message);
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
