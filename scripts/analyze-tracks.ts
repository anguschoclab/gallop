import fs from "fs";
import path from "path";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const tracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));

interface TrackStatus {
  id: string;
  name: string;
  country: string;
  osmId?: string;
  courseCount: number;
  hasSections: boolean;
  sectionsCount: number;
  circumference: number;
  straightLength: number;
  needsUpdate: boolean;
  reason: string;
}

interface Course {
  sections?: unknown[];
  circumference?: number;
  straightLength?: number;
}

interface Track {
  id: string;
  name: string;
  country: string;
  osmId?: string;
  courses: Course[];
}

const analysis: TrackStatus[] = (tracks as Track[]).map((t) => {
  const hasSections = t.courses.some((c) => c.sections && c.sections.length > 0);
  const sectionsCount = t.courses.reduce((acc: number, c) => acc + (c.sections?.length || 0), 0);

  // Primary course for reporting
  const primaryCourse = t.courses[0] || {};

  const needsUpdate = !hasSections;

  return {
    id: t.id,
    name: t.name,
    country: t.country,
    osmId: t.osmId,
    courseCount: t.courses.length,
    hasSections,
    sectionsCount,
    circumference: primaryCourse.circumference || 0,
    straightLength: primaryCourse.straightLength || 0,
    needsUpdate,
    reason: needsUpdate ? "Empty sections" : "Has existing data",
  };
});

// Statistics
const total = analysis.length;
const needsUpdate = analysis.filter((t) => t.needsUpdate).length;
const hasData = analysis.filter((t) => !t.needsUpdate).length;
const withOsmId = analysis.filter((t) => t.osmId).length;

console.log("=== Track Analysis Report ===\n");
console.log(`Total tracks: ${total}`);
console.log(
  `Needs update (empty sections): ${needsUpdate} (${Math.round((needsUpdate / total) * 100)}%)`,
);
console.log(`Already has data: ${hasData} (${Math.round((hasData / total) * 100)}%)`);
console.log(`Has OSM ID: ${withOsmId} (${Math.round((withOsmId / total) * 100)}%)`);

// Group by country
const byCountry = analysis.reduce((acc: Record<string, number>, t) => {
  if (t.needsUpdate) {
    acc[t.country] = (acc[t.country] || 0) + 1;
  }
  return acc;
}, {});

console.log("\n=== Tracks Needing Update by Country ===");
Object.entries(byCountry)
  .sort((a, b) => b[1] - a[1])
  .forEach(([country, count]) => {
    console.log(`  ${country}: ${count}`);
  });

// List tracks already with data
console.log("\n=== Tracks Already With Section Data (will be skipped) ===");
analysis
  .filter((t) => !t.needsUpdate)
  .forEach((t) => {
    console.log(`  ✓ ${t.name} (${t.country}) - ${t.sectionsCount} sections`);
  });

// Export JSON files
const tracksNeedingUpdate = analysis
  .filter((t) => t.needsUpdate)
  .map((t) => ({
    id: t.id,
    name: t.name,
    country: t.country,
    osmId: t.osmId,
    currentCircumference: t.circumference,
    currentStraightLength: t.straightLength,
  }));

const tracksWithData = analysis
  .filter((t) => !t.needsUpdate)
  .map((t) => ({
    id: t.id,
    name: t.name,
    country: t.country,
    sectionsCount: t.sectionsCount,
    circumference: t.circumference,
    straightLength: t.straightLength,
  }));

fs.writeFileSync("tracks-needing-update.json", JSON.stringify(tracksNeedingUpdate, null, 2));

fs.writeFileSync("tracks-with-existing-data.json", JSON.stringify(tracksWithData, null, 2));

console.log("\n=== Files Created ===");
console.log("  tracks-needing-update.json - Tracks to process via OSM");
console.log("  tracks-with-existing-data.json - Tracks that will be skipped");

console.log("\n=== Next Step ===");
console.log("Run: bunx tsx scripts/ingest-empty-tracks.ts");
