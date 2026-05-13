/**
 * Script to convert SVG placeholders to PNG sprites
 * Uses Node.js canvas to render SVG files
 */

const fs = require("fs");
const path = require("path");

// Check if canvas is available
try {
  const { createCanvas, loadImage } = require("canvas");

  const assetsDir = path.join(__dirname, "../src/assets");

  // SVG files to convert
  const svgs = [
    "horse-roan.svg",
    "horse-palomino.svg",
    "horse-white.svg",
    "track-synthetic.svg",
    "bg-sky-cloudy.svg",
    "bg-sky-sunset.svg",
    "bg-sky-night.svg",
  ];

  async function convertSvgToPng(svgFile) {
    const svgPath = path.join(assetsDir, svgFile);
    const pngFile = svgFile.replace(".svg", ".png");
    const pngPath = path.join(assetsDir, pngFile);

    if (!fs.existsSync(svgPath)) {
      console.log(`Skipping ${svgFile} - not found`);
      return;
    }

    try {
      // Read SVG dimensions
      const svgContent = fs.readFileSync(svgPath, "utf8");
      const widthMatch = svgContent.match(/width="(\d+)"/);
      const heightMatch = svgContent.match(/height="(\d+)"/);

      const width = widthMatch ? parseInt(widthMatch[1]) : 200;
      const height = heightMatch ? parseInt(heightMatch[1]) : 200;

      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Load and draw SVG
      const img = await loadImage(svgPath);
      ctx.drawImage(img, 0, 0, width, height);

      // Save as PNG
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(pngPath, buffer);

      console.log(`✓ Converted ${svgFile} -> ${pngFile} (${width}x${height})`);
    } catch (err) {
      console.error(`✗ Failed to convert ${svgFile}:`, err.message);
    }
  }

  async function main() {
    console.log("Converting SVG assets to PNG...\n");

    for (const svg of svgs) {
      await convertSvgToPng(svg);
    }

    console.log("\nDone!");
  }

  main().catch(console.error);
} catch (err) {
  console.log("Canvas library not installed. Installing...");
  console.log("Run: npm install canvas");
  console.log("\nOr manually convert the SVGs using an online tool or graphics software.");
}
