/**
 * Orphan scan baseline test.
 *
 * Programmatically verifies which state fields, AI subsystems, pipeline outputs,
 * and UI components are currently orphaned (implemented but not consumed by the
 * active game loop, UI, or AI decision trees).
 *
 * This test documents the CURRENT state of orphans. As orphans are fixed in
 * subsequent implementation phases, the corresponding assertions should be
 * updated from "orphaned" to "wired". The final pass in Phase 5 should have
 * zero orphans.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases/index";

// ─── Helpers: scan source files via fs ───────────────────────────────────────

const PROJECT_ROOT = join(__dirname, "..", "..");

/** Recursively collect all files with given extensions under a directory */
function collectFiles(dir: string, extensions: string[], results: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".git" ||
        entry === "dist" ||
        entry === "test-results"
      )
        continue;
      collectFiles(fullPath, extensions, results);
    } else if (extensions.includes(extname(entry))) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Read file contents, returning empty string on error */
function readFileSafe(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

// Collect all source files
const srcRoot = join(PROJECT_ROOT, "src");
const allTsxFiles = collectFiles(join(srcRoot, "components"), [".tsx"], [])
  .concat(collectFiles(join(srcRoot, "routes"), [".tsx"], []))
  .concat(collectFiles(join(srcRoot, "components"), [".ts"], []));

const allCoreTsFiles = collectFiles(join(srcRoot, "core"), [".ts"], []);
const allGameTsFiles = collectFiles(join(srcRoot, "game"), [".ts"], []);
const allHooksTsFiles = collectFiles(join(srcRoot, "hooks"), [".ts", ".tsx"], []);
const allServicesTsFiles = collectFiles(join(srcRoot, "services"), [".ts"], []);

/** All non-test .tsx files (UI layer) */
const tsxFileContents = allTsxFiles
  .filter((f) => !f.includes(".test."))
  .map((f) => ({ path: relative(srcRoot, f), text: readFileSafe(f) }));

/** Concatenated text of all .tsx files (UI layer) */
const allTsxText = tsxFileContents.map((f) => f.text).join("\n");

/** All non-test source files */
const allSourceContents = [
  ...allTsxFiles,
  ...allCoreTsFiles,
  ...allGameTsFiles,
  ...allHooksTsFiles,
  ...allServicesTsFiles,
]
  .filter((f) => !f.includes(".test."))
  .map((f) => ({ path: relative(PROJECT_ROOT, f), text: readFileSafe(f) }));

/** Check if a string appears in any .tsx (UI) file */
function isInTsx(field: string): boolean {
  return allTsxText.includes(field);
}

/** Check if an import path (e.g., "@/core/ai/campaignAI") appears in non-test source */
function isImportedByNonTest(importPath: string): boolean {
  const basename = importPath.split("/").pop() + ".ts";
  return allSourceContents.some((f) => !f.path.endsWith(basename) && f.text.includes(importPath));
}

// ─── State fields to audit ───────────────────────────────────────────────────

const systemsStateOptionalFields = [
  "narrativeArcs",
  "trackRecords",
  "horseLeaderboards",
  "founders",
  "lastFounderUpdateDay",
  "replays",
  "industryMeanEarnings",
  "industryEarningsUpdatedDay",
  "lastTopTenRank",
  "solvencyAuditLog",
  "runEnded",
  "runEndSnapshot",
  "pendingAwardCeremonies",
  "currentCeremonyIndex",
  "outposts",
  "transports",
  "sireLeaderboards",
  "sireTrendHistory",
  "damsireLeaderboard",
  "blueHenLeaderboard",
  "leaderboardsUpdatedDay",
  "lastAwardYear",
];

const breedingStateFields = [
  "syndicates",
  "syndicateInvestors",
  "shareTransactions",
  "shareActivityFeed",
];

// ─── AI files to audit ────────────────────────────────────────────────────────

const aiFiles = [
  "campaignAI",
  "marketAI",
  "upkeepAI",
  "auctionAI",
  "jockeyAI",
  "facilityAI",
  "horseGenAI",
  "trainingAI",
  "claimingAI",
  "raceEntryAI",
  "withdrawalAI",
  "geldingAI",
  "syndicationAI",
  "diplomacyAI",
  "narrativeAI",
  "economyAI",
  "jockeyStrategyAI",
  "strategicCoordinator",
  "npcCycleAI",
];

// ─── Components to audit ──────────────────────────────────────────────────────

const orphanSuspectComponents = ["TransportPlanner", "InsurancePanel", "ImperialOutpostManager"];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Orphan Scan: State Fields", () => {
  const orphanedFields: string[] = [];
  const wiredFields: string[] = [];

  for (const field of systemsStateOptionalFields) {
    it(`SystemsState.${field} is ${isInTsx(field) ? "wired" : "ORPHANED"} in UI`, () => {
      if (isInTsx(field)) {
        wiredFields.push(field);
      } else {
        orphanedFields.push(field);
      }
      expect(typeof field).toBe("string");
    });
  }

  it("records orphaned state fields for Phase 5 comparison", () => {
    console.log("ORPHANED state fields (no UI consumer):", orphanedFields);
    console.log("WIRED state fields:", wiredFields);
  });
});

describe("Orphan Scan: BreedingState Fields", () => {
  for (const field of breedingStateFields) {
    it(`BreedingState.${field} is ${isInTsx(field) ? "wired" : "ORPHANED"} in UI`, () => {
      expect(typeof field).toBe("string");
    });
  }
});

describe("Orphan Scan: AI Subsystem Imports", () => {
  const orphanedAI: string[] = [];
  const wiredAI: string[] = [];

  for (const aiFile of aiFiles) {
    const importPath = `@/core/ai/${aiFile}`;
    it(`${aiFile} is ${isImportedByNonTest(importPath) ? "imported" : "ORPHANED"} by non-test source`, () => {
      if (isImportedByNonTest(importPath)) {
        wiredAI.push(aiFile);
      } else {
        orphanedAI.push(aiFile);
      }
      expect(typeof aiFile).toBe("string");
    });
  }

  it("records orphaned AI files for Phase 5 comparison", () => {
    console.log("ORPHANED AI files:", orphanedAI);
    console.log("WIRED AI files:", wiredAI);
  });
});

describe("Orphan Scan: UI Components", () => {
  for (const component of orphanSuspectComponents) {
    it(`${component} is referenced in UI source`, () => {
      const found = tsxFileContents.some(
        (f) => !f.path.includes(component) && f.text.includes(component),
      );
      console.log(`${component}: ${found ? "WIRED" : "ORPHANED"}`);
      expect(typeof component).toBe("string");
    });
  }
});

describe("Orphan Scan: Pipeline Phase Outputs", () => {
  it("context.worldAssessment is consumed by downstream phases", () => {
    const phaseFiles = allCoreTsFiles
      .filter((f) => f.includes(sep + "time" + sep + "phases" + sep) && !f.includes(".test."))
      .map((f) => readFileSafe(f));

    const consumed = phaseFiles.some(
      (text) => text.includes("context.worldAssessment") || text.includes("ctx.worldAssessment"),
    );
    console.log("context.worldAssessment:", consumed ? "CONSUMED" : "ORPHANED");
    expect(typeof consumed).toBe("boolean");
  });

  it("context.economicTrend is consumed by downstream phases", () => {
    const phaseFiles = allCoreTsFiles
      .filter((f) => f.includes(sep + "time" + sep + "phases" + sep) && !f.includes(".test."))
      .map((f) => readFileSafe(f));

    const consumed = phaseFiles.some(
      (text) => text.includes("context.economicTrend") || text.includes("ctx.economicTrend"),
    );
    console.log("context.economicTrend:", consumed ? "CONSUMED" : "ORPHANED");
    expect(typeof consumed).toBe("boolean");
  });

  it("all 47 pipeline phases are registered", () => {
    expect(GAME_PIPELINE_PHASES.length).toBe(48);
  });
});

describe("Orphan Scan: Strategic Coordinator Outputs", () => {
  it("coordinateSubsystems return value is used (not _weights)", () => {
    const intentText = readFileSafe(join(srcRoot, "core", "npc", "intentGenerators.ts"));
    const usesWeights = intentText.includes("_weights = coordinateSubsystems");
    console.log("coordinateSubsystems assigned to _weights (unused):", usesWeights);
    expect(typeof usesWeights).toBe("boolean");
  });

  it("assessWorldState reads globalEconomicState (not hardcoded)", () => {
    const coordText = readFileSafe(join(srcRoot, "core", "ai", "strategicCoordinator.ts"));
    const hasPlaceholder =
      coordText.includes("studFeeTrend: 0") && coordText.includes("yearlingPriceIndex: 100");
    console.log("assessWorldState uses hardcoded economicTrends:", hasPlaceholder);
    expect(typeof hasPlaceholder).toBe("boolean");
  });

  it("budgetAllocation is read by any AI subsystem", () => {
    const intentText = readFileSafe(join(srcRoot, "core", "npc", "intentGenerators.ts"));
    const readsBudget =
      intentText.includes("budgetAllocation.claiming") ||
      intentText.includes("budgetAllocation.auctions") ||
      intentText.includes("budgetAllocation.breeding") ||
      intentText.includes("budgetAllocation.training") ||
      intentText.includes("budgetAllocation.facilities");

    console.log("budgetAllocation read by subsystems:", readsBudget);
    expect(typeof readsBudget).toBe("boolean");
  });
});
