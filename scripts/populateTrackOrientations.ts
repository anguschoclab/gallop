/**
 * populateTrackOrientations.ts
 *
 * Derives per-section orientation fields from `homeStraightOrientationDeg`
 * for standard oval track layouts.
 *
 * Usage:
 *   npx tsx scripts/populateTrackOrientations.ts
 *
 * Rules:
 * - For each course with `homeStraightOrientationDeg`:
 *   - Standard 4-section oval (S-T-S-T): derive all orientations automatically.
 *   - Standard 6-section oval (S-T-S-T-S-T): derive all orientations automatically.
 *   - Non-standard layouts: log a warning for manual override.
 * - Writes updated tracks.json back to src/data/tracks.json.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const TRACKS_JSON_PATH = resolve("src/data/tracks.json");

type TrackSection = {
  type: "straight" | "turn";
  length: number;
  radius?: number;
  gradient?: number;
  banking?: number;
  orientationDeg?: number;
  entryOrientationDeg?: number;
  exitOrientationDeg?: number;
};

type CourseSpecification = {
  surface: "Turf" | "Dirt" | "Synthetic";
  name?: string;
  circumference: number;
  straightLength: number;
  width?: number;
  sections: TrackSection[];
  homeStraightOrientationDeg?: number;
};

type Track = {
  id: string;
  name: string;
  country: string;
  courses: CourseSpecification[];
  elevation?: number;
  osmId?: string;
};

function normalizeAngle(deg: number): number {
  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  return deg;
}

function deriveOvalOrientations(
  sections: TrackSection[],
  homeStraightOrientationDeg: number,
): TrackSection[] {
  const count = sections.length;
  if (count === 4) {
    // S-T-S-T
    return [
      { ...sections[0], orientationDeg: normalizeAngle(homeStraightOrientationDeg) },
      {
        ...sections[1],
        entryOrientationDeg: normalizeAngle(homeStraightOrientationDeg),
        exitOrientationDeg: normalizeAngle(homeStraightOrientationDeg + 180),
      },
      { ...sections[2], orientationDeg: normalizeAngle(homeStraightOrientationDeg + 180) },
      {
        ...sections[3],
        entryOrientationDeg: normalizeAngle(homeStraightOrientationDeg + 180),
        exitOrientationDeg: normalizeAngle(homeStraightOrientationDeg),
      },
    ];
  }
  if (count === 6) {
    // S-T-S-T-S-T (tri-oval or extended oval)
    return [
      { ...sections[0], orientationDeg: normalizeAngle(homeStraightOrientationDeg) },
      {
        ...sections[1],
        entryOrientationDeg: normalizeAngle(homeStraightOrientationDeg),
        exitOrientationDeg: normalizeAngle(homeStraightOrientationDeg + 180),
      },
      { ...sections[2], orientationDeg: normalizeAngle(homeStraightOrientationDeg + 180) },
      {
        ...sections[3],
        entryOrientationDeg: normalizeAngle(homeStraightOrientationDeg + 180),
        exitOrientationDeg: normalizeAngle(homeStraightOrientationDeg + 180),
      },
      { ...sections[4], orientationDeg: normalizeAngle(homeStraightOrientationDeg + 180) },
      {
        ...sections[5],
        entryOrientationDeg: normalizeAngle(homeStraightOrientationDeg + 180),
        exitOrientationDeg: normalizeAngle(homeStraightOrientationDeg),
      },
    ];
  }
  return sections;
}

function isStandardOval(sections: TrackSection[]): boolean {
  const count = sections.length;
  if (count !== 4 && count !== 6) return false;
  for (let i = 0; i < count; i++) {
    const expected = i % 2 === 0 ? "straight" : "turn";
    if (sections[i].type !== expected) return false;
  }
  return true;
}

function processTracks(tracks: Track[]): { tracks: Track[]; warnings: string[] } {
  const warnings: string[] = [];

  for (const track of tracks) {
    for (const course of track.courses) {
      if (course.homeStraightOrientationDeg === undefined) {
        warnings.push(
          `SKIP ${track.name} / ${course.name ?? "unnamed course"}: no homeStraightOrientationDeg`,
        );
        continue;
      }
      if (!isStandardOval(course.sections)) {
        warnings.push(
          `WARN ${track.name} / ${course.name ?? "unnamed course"}: non-standard layout (${course.sections.length} sections)` +
            " — manual override required",
        );
        continue;
      }
      course.sections = deriveOvalOrientations(
        course.sections,
        course.homeStraightOrientationDeg,
      );
    }
  }

  return { tracks, warnings };
}

function main() {
  const raw = readFileSync(TRACKS_JSON_PATH, "utf-8");
  const tracks: Track[] = JSON.parse(raw);

  const { tracks: updated, warnings } = processTracks(tracks);

  writeFileSync(TRACKS_JSON_PATH, JSON.stringify(updated, null, 2) + "\n");

  console.log(`Updated ${TRACKS_JSON_PATH}`);
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) {
    console.log("  " + w);
  }
}

main();
