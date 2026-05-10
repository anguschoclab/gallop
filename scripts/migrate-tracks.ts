import fs from "fs";
import path from "path";

const tracksFilePath = path.resolve(process.cwd(), "src/game/tracks.ts");
const outputJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");

const content = fs.readFileSync(tracksFilePath, "utf-8");

interface Course {
  surface: string;
  circumference: number;
  straightLength: number;
  sections: unknown[];
}

interface MigratedTrack {
  id: string;
  name: string;
  country: string;
  courses: Course[];
}

// Extract the TRACKS array content with improved regex
const tracksMatch = content.match(/export const TRACKS: Track\[] = \[([\s\S]*?)\];/);
if (!tracksMatch) {
  console.error("Could not find TRACKS array in tracks.ts");
  process.exit(1);
}

const tracksRaw = tracksMatch[1];

// Improved parser using more robust regex patterns
// Matches complete track objects while handling nested arrays
const trackObjects: MigratedTrack[] = [];
const trackRegex = /\{\s*id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*country:\s*"([^"]+)"\s*,\s*surfaces:\s*\[([^\]]*)\](?:\s*,\s*circumference:\s*(\d+))?(?:\s*,\s*straightLength:\s*(\d+))?\s*\}/g;
let match;

while ((match = trackRegex.exec(tracksRaw)) !== null) {
  const [, id, name, country, surfacesRaw, circumferenceRaw, straightLengthRaw] = match;

  // Parse surfaces array more robustly
  const surfaces = surfacesRaw
    .split(",")
    .map((s) => s.trim().replace(/"/g, ""))
    .filter((s) => s.length > 0);

  const circumference = circumferenceRaw ? parseInt(circumferenceRaw, 10) : 1600;
  const straightLength = straightLengthRaw ? parseInt(straightLengthRaw, 10) : 400;

  if (id && name && country) {
    trackObjects.push({
      id,
      name,
      country,
      courses: surfaces.map((s) => ({
        surface: s,
        circumference,
        straightLength,
        sections: [], // To be filled by ingestion
      })),
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
