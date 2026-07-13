#!/usr/bin/env node

/**
 * validate-uuids.ts
 *
 * This script scans all data files for UUIDs and validates them for:
 * - Proper UUID v4 format
 * - Duplicates across all files
 * - Suspicious patterns (all-zero segments, etc.)
 *
 * Run with: bunx tsx scripts/validate-uuids.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UUIDLocation {
  file: string;
  line: number;
  context: string;
}

interface ValidationResult {
  totalUUIDs: number;
  duplicates: Array<{ uuid: string; locations: UUIDLocation[] }>;
  invalidFormat: Array<{ uuid: string; locations: UUIDLocation[] }>;
  suspiciousPatterns: Array<{ uuid: string; reason: string; locations: UUIDLocation[] }>;
  byFile: Record<string, number>;
}

const UUID_V4_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

function isValidUUIDv4(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

function hasSuspiciousPattern(uuid: string): string | null {
  const segments = uuid.split("-");

  // Check for all-zero segments
  if (segments.some((s) => s === "00000000" || s === "0000")) {
    return "Contains all-zero segments (manually crafted or poorly generated)";
  }

  // Check for sequential patterns (e.g., 00000001, 00000002)
  if (/0{7}[1-9]/.test(segments[0])) {
    return "Sequential pattern in first segment";
  }

  // Check for repeated characters (e.g., aaaaaaaa)
  if (segments.some((s) => /^([0-9a-f])\1+$/.test(s))) {
    return "Repeated characters in segment";
  }

  return null;
}

function scanFileForUUIDs(filePath: string): {
  entityUUIDs: string[];
  referenceUUIDs: string[];
  locations: Map<string, UUIDLocation[]>;
} {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const entityUUIDs: string[] = [];
  const referenceUUIDs: string[] = [];
  const locations = new Map<string, UUIDLocation[]>();

  lines.forEach((line, index) => {
    const matches = line.matchAll(UUID_V4_REGEX);
    for (const match of matches) {
      const uuid = match[0];
      const trimmedLine = line.trim();

      // Determine if this is a reference UUID (e.g., trackId, horseId, etc.)
      const isReference = /trackId|horseId|jockeyId|auctionId|stallionId|mareId/i.test(trimmedLine);

      if (isReference) {
        referenceUUIDs.push(uuid);
      } else {
        entityUUIDs.push(uuid);
      }

      if (!locations.has(uuid)) {
        locations.set(uuid, []);
      }
      locations.get(uuid)!.push({
        file: filePath,
        line: index + 1,
        context: trimmedLine.substring(0, 100),
      });
    }
  });

  return { entityUUIDs, referenceUUIDs, locations };
}

function main() {
  const result: ValidationResult = {
    totalUUIDs: 0,
    duplicates: [],
    invalidFormat: [],
    suspiciousPatterns: [],
    byFile: {},
  };

  const allEntityUUIDs = new Map<string, UUIDLocation[]>();

  // Scan TypeScript and JSON files
  const filesToScan = [
    "./src/core/data/gradedRaces.ts",
    "./src/game/data/tracks.json",
    "./src/game/trackSchedulesData.ts",
  ];

  filesToScan.forEach((relativePath) => {
    const fullPath = path.join(__dirname, "..", relativePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`Skipping ${relativePath} - file not found`);
      return;
    }

    console.log(`Scanning ${relativePath}...`);
    const { entityUUIDs, referenceUUIDs, locations } = scanFileForUUIDs(fullPath);

    result.totalUUIDs += entityUUIDs.length + referenceUUIDs.length;
    result.byFile[relativePath] = entityUUIDs.length + referenceUUIDs.length;

    // Check for duplicates among entity UUIDs only (references can repeat)
    entityUUIDs.forEach((uuid: string) => {
      if (allEntityUUIDs.has(uuid)) {
        const existing = allEntityUUIDs.get(uuid)!;
        const newLocations = [...existing, ...locations.get(uuid)!];
        allEntityUUIDs.set(uuid, newLocations);
      } else {
        allEntityUUIDs.set(uuid, [...locations.get(uuid)!]);
      }
    });

    // Check for invalid format (both entity and reference UUIDs)
    [...entityUUIDs, ...referenceUUIDs].forEach((uuid: string) => {
      if (!isValidUUIDv4(uuid)) {
        if (!result.invalidFormat.find((i) => i.uuid === uuid)) {
          result.invalidFormat.push({
            uuid,
            locations: locations.get(uuid)!,
          });
        }
      }
    });

    // Check for suspicious patterns (both entity and reference UUIDs)
    [...entityUUIDs, ...referenceUUIDs].forEach((uuid: string) => {
      const reason = hasSuspiciousPattern(uuid);
      if (reason) {
        if (!result.suspiciousPatterns.find((s) => s.uuid === uuid)) {
          result.suspiciousPatterns.push({
            uuid,
            reason,
            locations: locations.get(uuid)!,
          });
        }
      }
    });
  });

  // Collect duplicates (only from entity UUIDs)
  allEntityUUIDs.forEach((locations, uuid) => {
    if (locations.length > 1) {
      result.duplicates.push({ uuid, locations });
    }
  });

  // Print results
  console.log("\n=== UUID Validation Results ===\n");
  console.log(`Total UUIDs found: ${result.totalUUIDs}`);
  console.log(`Files scanned: ${Object.keys(result.byFile).length}`);

  console.log("\n--- UUIDs by File ---");
  Object.entries(result.byFile).forEach(([file, count]) => {
    console.log(`  ${file}: ${count}`);
  });

  if (result.duplicates.length > 0) {
    console.log(`\n❌ DUPLICATES FOUND: ${result.duplicates.length}`);
    result.duplicates.forEach(({ uuid, locations }) => {
      console.log(`  ${uuid}:`);
      locations.forEach((loc) => {
        console.log(`    ${loc.file}:${loc.line}`);
      });
    });
  } else {
    console.log("\n✅ No duplicates found");
  }

  if (result.invalidFormat.length > 0) {
    console.log(`\n❌ INVALID FORMAT: ${result.invalidFormat.length}`);
    result.invalidFormat.forEach(({ uuid, locations }) => {
      console.log(`  ${uuid}:`);
      locations.forEach((loc) => {
        console.log(`    ${loc.file}:${loc.line}`);
      });
    });
  } else {
    console.log("\n✅ All UUIDs have valid v4 format");
  }

  if (result.suspiciousPatterns.length > 0) {
    console.log(`\n⚠️  SUSPICIOUS PATTERNS: ${result.suspiciousPatterns.length}`);
    result.suspiciousPatterns.forEach(({ uuid, reason, locations }) => {
      console.log(`  ${uuid} (${reason}):`);
      locations.forEach((loc) => {
        console.log(`    ${loc.file}:${loc.line}`);
      });
    });
  } else {
    console.log("\n✅ No suspicious patterns found");
  }

  // Exit with error code if issues found
  const hasErrors = result.duplicates.length > 0 || result.invalidFormat.length > 0;
  process.exit(hasErrors ? 1 : 0);
}

main();
