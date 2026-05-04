import fs from "fs";
import path from "path";

const tracksFilePath = path.resolve(process.cwd(), "src/game/tracks.ts");
const outputJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");

const content = fs.readFileSync(tracksFilePath, "utf-8");

// Extract the TRACKS array content
const tracksMatch = content.match(/export const TRACKS: Track\[] = \[([\s\S]*?)\];/);
if (!tracksMatch) {
  console.error("Could not find TRACKS array in tracks.ts");
  process.exit(1);
}

const tracksRaw = tracksMatch[1];

// A very hacky parser for the current TRACKS array
// We look for objects: { id: "...", name: "...", ... }
const trackObjects: any[] = [];
const objectRegex = /\{([\s\S]*?)\}/g;
let match;

while ((match = objectRegex.exec(tracksRaw)) !== null) {
  const objContent = match[1];
  
  // Extract fields
  const id = objContent.match(/id: "(.*?)"/)?.[1];
  const name = objContent.match(/name: "(.*?)"/)?.[1];
  const country = objContent.match(/country: "(.*?)"/)?.[1];
  const surfacesMatch = objContent.match(/surfaces: \[(.*?)\]/);
  const surfaces = surfacesMatch ? surfacesMatch[1].replace(/"/g, "").split(",").map(s => s.trim()) : [];
  const circumference = parseInt(objContent.match(/circumference: (\d+)/)?.[1] || "1600");
  const straightLength = parseInt(objContent.match(/straightLength: (\d+)/)?.[1] || "400");

  if (id && name && country) {
    trackObjects.push({
      id,
      name,
      country,
      courses: surfaces.map(s => ({
        surface: s,
        circumference,
        straightLength,
        sections: [] // To be filled by ingestion
      }))
    });
  }
}

// Ensure directory exists
const dir = path.dirname(outputJsonPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputJsonPath, JSON.stringify(trackObjects, null, 2));
console.log(`Migrated ${trackObjects.length} tracks to ${outputJsonPath}`);
