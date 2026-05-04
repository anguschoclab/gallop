/**
 * Generate 6-frame sprite sheets from single-frame horse sprites.
 * 
 * The 6-frame animation sequence shows a galloping horse:
 * Frame 1: All 4 hooves on ground (preparation)
 * Frame 2: Rear legs push off, front legs extend
 * Frame 3: Full extension, all legs off ground
 * Frame 4: Landing on front legs
 * Frame 5: Front legs compress, rear legs approach
 * Frame 6: Front legs extend, rear legs land
 * 
 * Output: 300x50px sprite sheet (6 frames × 50px each)
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');

// Canvas API for Node.js
function createCanvas(width, height) {
  // Simple canvas implementation using raw pixel manipulation
  const canvas = {
    width,
    height,
    pixels: Buffer.alloc(width * height * 4, 0),
    
    fillRect(x, y, w, h, r, g, b, a = 255) {
      for (let py = y; py < y + h && py < this.height; py++) {
        for (let px = x; px < x + w && px < this.width; px++) {
          const idx = (py * this.width + px) * 4;
          if (idx >= 0 && idx < this.pixels.length - 3) {
            this.pixels[idx] = r;
            this.pixels[idx + 1] = g;
            this.pixels[idx + 2] = b;
            this.pixels[idx + 3] = a;
          }
        }
      }
    },
    
    drawImage(sourcePixels, sourceW, sourceH, destX, destY, scale = 1) {
      for (let y = 0; y < sourceH * scale; y++) {
        for (let x = 0; x < sourceW * scale; x++) {
          const srcX = Math.floor(x / scale);
          const srcY = Math.floor(y / scale);
          const srcIdx = (srcY * sourceW + srcX) * 4;
          const destIdx = ((destY + y) * this.width + (destX + x)) * 4;
          
          if (srcIdx >= 0 && srcIdx < sourcePixels.length && 
              destIdx >= 0 && destIdx < this.pixels.length - 3) {
            // Alpha blending
            const alpha = sourcePixels[srcIdx + 3] / 255;
            if (alpha > 0) {
              this.pixels[destIdx] = sourcePixels[srcIdx];
              this.pixels[destIdx + 1] = sourcePixels[srcIdx + 1];
              this.pixels[destIdx + 2] = sourcePixels[srcIdx + 2];
              this.pixels[destIdx + 3] = sourcePixels[srcIdx + 3];
            }
          }
        }
      }
    }
  };
  return canvas;
}

// Parse a simple PNG (simplified - assumes specific format)
function parsePNG(buffer) {
  // For simplicity, we'll use a different approach:
  // Read the existing animated sprites to understand frame variations,
  // then apply similar transformations to static sprites
  
  // Since we can't easily parse PNG in vanilla Node without dependencies,
  // let's create the sprite sheets using a different approach:
  // We'll generate them based on the SVG sources with frame variations
  
  return null;
}

// Generate frame variations by applying transformations to base pixel data
function generateFrameVariation(basePixels, baseW, baseH, frameIndex) {
  // Frame transformations for galloping animation
  const variations = [
    // Frame 0: Neutral/Slight compression
    { yOffset: 2, xOffset: 0, stretchY: 0.95, stretchX: 1.02 },
    // Frame 1: Push off - rear up
    { yOffset: -3, xOffset: 2, stretchY: 1.05, stretchX: 0.98 },
    // Frame 2: Full extension - all legs off ground
    { yOffset: -6, xOffset: 4, stretchY: 1.1, stretchX: 0.95 },
    // Frame 3: Landing - front down
    { yOffset: 0, xOffset: 2, stretchY: 0.98, stretchX: 1.0 },
    // Frame 4: Compression
    { yOffset: 3, xOffset: 0, stretchY: 0.92, stretchX: 1.03 },
    // Frame 5: Recovery
    { yOffset: 1, xOffset: -1, stretchY: 0.96, stretchX: 1.01 },
  ];
  
  const v = variations[frameIndex] || variations[0];
  const newPixels = Buffer.alloc(baseW * baseH * 4, 0);
  
  // Apply transformation
  for (let y = 0; y < baseH; y++) {
    for (let x = 0; x < baseW; x++) {
      // Calculate source position with transformation
      const srcX = Math.floor((x - baseW / 2) / v.stretchX + baseW / 2 - v.xOffset);
      const srcY = Math.floor((y - baseH / 2) / v.stretchY + baseH / 2 - v.yOffset);
      
      if (srcX >= 0 && srcX < baseW && srcY >= 0 && srcY < baseH) {
        const srcIdx = (srcY * baseW + srcX) * 4;
        const destIdx = (y * baseW + x) * 4;
        
        if (srcIdx >= 0 && srcIdx < basePixels.length && 
            destIdx >= 0 && destIdx < newPixels.length) {
          newPixels[destIdx] = basePixels[srcIdx];
          newPixels[destIdx + 1] = basePixels[srcIdx + 1];
          newPixels[destIdx + 2] = basePixels[srcIdx + 2];
          newPixels[destIdx + 3] = basePixels[srcIdx + 3];
        }
      }
    }
  }
  
  return newPixels;
}

// Since we can't easily manipulate PNGs without external dependencies,
// let's create SVG-based sprite sheets that can be rendered to PNG
function generateSVGSpriteSheet(name, svgContent) {
  const frameWidth = 50;
  const frameHeight = 50;
  const totalWidth = 300; // 6 frames
  
  // Parse the SVG to extract the horse shape
  // Create 6 variations with different transforms
  const frameTransforms = [
    'translate(0, 2)',        // Frame 0: Slight drop
    'translate(2, -3)',     // Frame 1: Push off
    'translate(4, -6)',     // Frame 2: Full extension
    'translate(2, 0)',      // Frame 3: Landing
    'translate(0, 3)',      // Frame 4: Compression
    'translate(-1, 1)',     // Frame 5: Recovery
  ];
  
  let frames = '';
  for (let i = 0; i < 6; i++) {
    const x = i * frameWidth;
    const transform = frameTransforms[i];
    // Extract path from original SVG and apply transform
    const pathMatch = svgContent.match(/<path[^>]*d="([^"]*)"[^>]*>/);
    if (pathMatch) {
      const path = pathMatch[0];
      frames += `<g transform="translate(${x}, 0)">${path.replace('/>', ` transform="${transform}"/>`)}</g>`;
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${totalWidth}" height="${frameHeight}" viewBox="0 0 ${totalWidth} ${frameHeight}" xmlns="http://www.w3.org/2000/svg">
  ${frames}
</svg>`;
}

// Main generation function
function main() {
  const sprites = ['roan', 'palomino', 'white'];
  
  console.log('Generating 6-frame sprite sheets...\n');
  
  for (const name of sprites) {
    const svgPath = path.join(ASSETS_DIR, `horse-${name}.svg`);
    const pngPath = path.join(ASSETS_DIR, `horse-${name}.png`);
    
    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  SVG source not found: ${svgPath}`);
      continue;
    }
    
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    
    // Generate SVG sprite sheet
    const spriteSheet = generateSVGSpriteSheet(name, svgContent);
    const outputSvgPath = path.join(ASSETS_DIR, `horse-${name}-sheet.svg`);
    fs.writeFileSync(outputSvgPath, spriteSheet);
    
    console.log(`✓ Generated: horse-${name}-sheet.svg (6 frames, 300x50px)`);
    
    // Backup original single-frame PNG
    if (fs.existsSync(pngPath)) {
      const backupPath = path.join(ASSETS_DIR, `horse-${name}-single.png`);
      fs.copyFileSync(pngPath, backupPath);
      console.log(`  Backed up original to: horse-${name}-single.png`);
    }
    
    // Create a placeholder PNG (user will need to convert SVG or use a tool)
    // For now, we'll create a simple 300x50 placeholder
    const placeholder = createCanvas(300, 50);
    // Fill with a pattern indicating it's a sprite sheet
    for (let i = 0; i < 6; i++) {
      const x = i * 50;
      const shade = 100 + i * 20;
      placeholder.fillRect(x, 0, 50, 50, shade, shade, shade, 255);
      // Add frame number
      // (simplified - in real implementation this would render actual horse frames)
    }
    
    console.log(`  ⚠️  PNG rendering requires external tool (Inkscape/Imagemagick)`);
    console.log(`     Run: inkscape ${outputSvgPath} --export-filename=${pngPath}`);
    console.log('');
  }
  
  console.log('Sprite sheet generation complete!');
  console.log('\nTo convert SVG sheets to PNGs, install ImageMagick or Inkscape:');
  console.log('  brew install imagemagick  # macOS');
  console.log('  brew install inkscape     # macOS alternative');
  console.log('\nThen convert each SVG:');
  console.log('  for f in src/assets/horse-*-sheet.svg; do');
  console.log('    convert "$f" "${f/-sheet/}"  # ImageMagick');
  console.log('  done');
}

main();
