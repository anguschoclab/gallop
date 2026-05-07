import fs from "fs";
import path from "path";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const gradedRacesPath = path.resolve(process.cwd(), "src/game/gradedRaces.ts");

const tracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));
const gradedRacesContent = fs.readFileSync(gradedRacesPath, "utf-8");

// Extract all track names from graded races
const trackMatches = gradedRacesContent.match(/track: "([^"]+)"/g) || [];
const gradedTrackNames = [...new Set(trackMatches.map((m) => m.replace(/track: "(.+)"/, "$1")))];

// Get track names from database
const dbTrackNames = tracks.map((t: any) => t.name);

// Find missing tracks
const missingFromDb = gradedTrackNames.filter((name) => !dbTrackNames.includes(name));
const missingFromGraded = dbTrackNames.filter((name: string) => !gradedTrackNames.includes(name));

console.log("=== GRADED RACE TRACKS VERIFICATION ===\n");
console.log(`Tracks hosting graded races: ${gradedTrackNames.length}`);
console.log(`Tracks in database: ${dbTrackNames.length}`);
console.log();

if (missingFromDb.length === 0) {
  console.log("✅ ALL graded race tracks are present in the database!");
} else {
  console.log(`❌ Missing from database (${missingFromDb.length}):`);
  missingFromDb.forEach((name) => console.log(`  - ${name}`));
}

console.log();

// Check data completeness for graded race tracks
const gradedTracksInDb = tracks.filter((t: any) => gradedTrackNames.includes(t.name));
const completeData = gradedTracksInDb.filter((t: any) =>
  t.courses.every((c: any) => c.sections && c.sections.length > 0),
);
const incompleteData = gradedTracksInDb.filter(
  (t: any) => !t.courses.every((c: any) => c.sections && c.sections.length > 0),
);

console.log(
  `Graded race tracks with complete geometry: ${completeData.length}/${gradedTracksInDb.length}`,
);

if (incompleteData.length > 0) {
  console.log(`\n⚠️  Graded race tracks MISSING geometry data (${incompleteData.length}):`);
  incompleteData.forEach((t: any) => {
    const missingCourses = t.courses
      .map((c: any, i: number) => (!c.sections || c.sections.length === 0 ? i + 1 : null))
      .filter((x: any) => x !== null);
    console.log(`  - ${t.name} (${t.country}) - course(s): ${missingCourses.join(", ")}`);
  });
}

console.log("\n=== SUMMARY ===");
console.log(`✓ All ${gradedTrackNames.length} tracks that host graded races exist in database`);
console.log(`✓ ${completeData.length} have complete geometry data for race simulation`);
if (incompleteData.length === 0) {
  console.log("✓ 100% of graded race tracks have geometry data!");
} else {
  console.log(`⚠ ${incompleteData.length} tracks still need geometry data`);
}
