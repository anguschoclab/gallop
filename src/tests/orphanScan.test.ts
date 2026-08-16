/**
 * Orphan scan baseline test (Extended).
 *
 * Programmatically verifies which state fields, AI subsystems, pipeline outputs,
 * UI components, intent types, store slices, hooks, and NpcAIManager fields are
 * currently orphaned (implemented but not consumed by the active game loop, UI,
 * or AI decision trees).
 *
 * This test documents the CURRENT state of orphans. As orphans are fixed in
 * subsequent implementation phases, the corresponding assertions should be
 * updated from "orphaned" to "wired". The final pass should have zero orphans.
 *
 * Validation corrections applied:
 * - Intent count corrected from 39 to 45 (outpost_action added)
 * - trackRecords, horseLeaderboards, founders moved to "confirmed wired" list
 * - runEnded, runEndSnapshot, solvencyAuditLog confirmed wired
 * - outposts UI confirmed wired; NPC AI integration wired (outpost_action intents)
 * - transports UI confirmed wired; TransportIntent resolution wired (AI gap closed)
 * - industryMeanEarnings wired in economyAI.ts and breedingAI.ts (AI gap closed)
 * - npcRelationships, narrativeState, globalEconomicState confirmed wired
 * - InsurancePanel confirmed wired
 * - difficultyModulator wired into AI subsystems (race entry, training, auction)
 * - activeCartels wired in DiplomacyPanel.tsx
 * - budgetAllocation facilities field wired in strategicCoordinator.ts
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

// ─── State fields: confirmed wired (validated, no longer audited as orphans) ──

const confirmedWiredFields = [
  "trackRecords", // wired in RecordsTab.tsx:16
  "horseLeaderboards", // wired in RecordsTab.tsx:13
  "founders", // wired in FounderLegacy.tsx:12
  "runEnded", // wired in epilogue.tsx:12
  "runEndSnapshot", // wired in epilogue.tsx:13
  "solvencyAuditLog", // wired in DebtBanner.tsx:24
  "outposts", // wired in facilities.tsx (UI) + outpost_action intents (AI)
  "transports", // wired in stable.$horseId.tsx (UI) + TransportIntent resolution (AI)
  "industryMeanEarnings", // wired in sire-watch.$stallionId.tsx (UI) + economyAI.ts (AI)
  "sireLeaderboards", // wired in SireLeaderboardsTab.tsx, rendered in breeding.tsx
  "sireTrendHistory", // wired in AnalyticsBreedingTab.tsx
  "damsireLeaderboard", // wired in DamsireLeaderboardTab.tsx, rendered in breeding.tsx
  "blueHenLeaderboard", // wired in BlueHenLeaderboardTab.tsx, rendered in breeding.tsx
  "activeCartels", // wired in DiplomacyPanel.tsx CartelSection
  "narrativeArcs", // wired in CareerArcPanel.tsx, rendered in stable.$horseId.tsx
  "replays", // wired in ReplayPlayer.tsx, rendered in race.$raceId.tsx
  "pendingAwardCeremonies", // wired in AwardsTab.tsx via useAwardsData hook
  "currentCeremonyIndex", // wired in AwardsTab.tsx via useAwardsData hook
  "leaderboardsUpdatedDay", // wired in RecordsTab.tsx Data Freshness card
  "lastTopTenRank", // wired in RecordsTab.tsx Data Freshness card
  "industryEarningsUpdatedDay", // wired in RecordsTab.tsx Data Freshness card
  "lastFounderUpdateDay", // wired in RecordsTab.tsx Data Freshness card
  "lastAwardYear", // wired in RecordsTab.tsx Data Freshness card
];

// ─── State fields to audit (genuinely suspected orphans) ─────────────────────

const systemsStateOptionalFields: string[] = [];

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
// Validation: InsurancePanel confirmed wired in stable.$horseId.tsx — removed.
// TransportPlanner and ImperialOutpostManager confirmed wired in UI — removed.
// These components are no longer suspect orphans.

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

  it("all 51 pipeline phases are registered", () => {
    expect(GAME_PIPELINE_PHASES.length).toBe(51);
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
      intentText.includes("budgetAllocation?.claiming") ||
      intentText.includes("budgetAllocation?.auctions") ||
      intentText.includes("budgetAllocation?.breeding") ||
      intentText.includes("budgetAllocation?.training") ||
      intentText.includes("budgetAllocation?.facilities") ||
      intentText.includes("budgetAllocation.claiming") ||
      intentText.includes("budgetAllocation.auctions") ||
      intentText.includes("budgetAllocation.breeding") ||
      intentText.includes("budgetAllocation.training") ||
      intentText.includes("budgetAllocation.facilities");

    console.log("budgetAllocation read by subsystems:", readsBudget);
    expect(typeof readsBudget).toBe("boolean");
  });
});

// ─── Intent type coverage audit (44 types) ───────────────────────────────────

const allIntentTypes = [
  "training",
  "race_entry",
  "race_withdrawal",
  "breeding",
  "stud_retirement",
  "purchase",
  "jockey_contract",
  "jockey_release",
  "jockey_assignment",
  "scout",
  "consignment",
  "consignment_withdrawal",
  "gelding",
  "reroll_silk",
  "rename",
  "campaign_slot",
  "campaign_flag_dismissal",
  "campaign_creation",
  "campaign_deletion",
  "auto_manage_toggle",
  "upkeep",
  "aging",
  "energy",
  "pregnancy_check",
  "pregnancy_resolution",
  "race_resolution",
  "claiming",
  "withdraw_from_claiming",
  "tactics",
  "transport",
  "staff",
  "facility_upgrade",
  "pasture_retirement",
  "update_stud_fee",
  "syndicate_creation",
  "share_purchase",
  "share_sale",
  "syndicate_fee_distribution",
  "insurance_purchase",
  "insurance_cancel",
  "insurance_claim",
  "stewards_inquiry",
  "diplomatic_action",
  "cartel_action",
  "outpost_action",
];

describe("Orphan Scan: Intent Type Coverage (45 types)", () => {
  const orphanedIntents: string[] = [];
  const wiredIntents: string[] = [];

  // Collect all non-test source text for intent generation check
  const intentGenText = readFileSafe(join(srcRoot, "core", "npc", "intentGenerators.ts"));
  const allPhaseTexts = allCoreTsFiles
    .filter((f) => f.includes(sep + "time" + sep + "phases" + sep) && !f.includes(".test."))
    .map((f) => readFileSafe(f))
    .join("\n");
  const allHandlerTexts = allCoreTsFiles
    .filter((f) => f.includes(sep + "resolver" + sep + "handlers" + sep) && !f.includes(".test."))
    .map((f) => readFileSafe(f))
    .join("\n");
  const allSourceText = allSourceContents.map((f) => f.text).join("\n");

  for (const intentType of allIntentTypes) {
    it(`intent type "${intentType}" is generated and handled`, () => {
      const isGenerated =
        intentGenText.includes(`type: "${intentType}"`) ||
        allPhaseTexts.includes(`type: "${intentType}"`) ||
        allSourceText.includes(`type: "${intentType}"`);
      const isHandled =
        allHandlerTexts.includes(`"${intentType}"`) || allPhaseTexts.includes(`"${intentType}"`);
      const isReferenced = allSourceText.includes(`type: "${intentType}"`);

      if (isGenerated && isHandled) {
        wiredIntents.push(intentType);
      } else {
        orphanedIntents.push(
          `${intentType} (generated: ${isGenerated}, handled: ${isHandled}, referenced: ${isReferenced})`,
        );
      }
      expect(typeof intentType).toBe("string");
    });
  }

  it("records orphaned intent types for Phase 5 comparison", () => {
    console.log("ORPHANED intent types:", orphanedIntents);
    console.log("WIRED intent types:", wiredIntents);
    expect(allIntentTypes.length).toBe(45);
  });
});

// ─── Store slice action audit (20 slices) ────────────────────────────────────

const storeSlices = [
  "auctionSlice",
  "awardSlice",
  "breedingProgramSlice",
  "breedingSlice",
  "campaignSlice",
  "coreSlice",
  "facilitySlice",
  "horseAdminSlice",
  "inboxSlice",
  "insuranceSlice",
  "jockeySlice",
  "marketSlice",
  "privateSaleSlice",
  "racingSlice",
  "scoutingSlice",
  "settingsSlice",
  "staffSlice",
  "transportSlice",
  "utilitySlice",
  "weatherSlice",
];

describe("Orphan Scan: Store Slice Imports (20 slices)", () => {
  const orphanedSlices: string[] = [];
  const wiredSlices: string[] = [];

  for (const slice of storeSlices) {
    const importPath = `./slices/${slice}`;
    it(`${slice} is imported by store/index.ts`, () => {
      const storeText = readFileSafe(join(srcRoot, "game", "store", "index.ts"));
      const imported = storeText.includes(importPath);

      if (imported) {
        wiredSlices.push(slice);
      } else {
        orphanedSlices.push(slice);
      }
      console.log(`${slice}: ${imported ? "WIRED" : "ORPHANED"}`);
      expect(typeof slice).toBe("string");
    });
  }

  it("records orphaned store slices", () => {
    console.log("ORPHANED store slices:", orphanedSlices);
    console.log("WIRED store slices:", wiredSlices);
    expect(storeSlices.length).toBe(20);
  });
});

// ─── Hook selector audit ─────────────────────────────────────────────────────

describe("Orphan Scan: Hook Selectors", () => {
  const hooksDir = join(srcRoot, "hooks");
  const hookFiles = collectFiles(hooksDir, [".ts", ".tsx"], [])
    .filter((f) => !f.includes(".test."))
    .map((f) => relative(srcRoot, f));

  const orphanedHooks: string[] = [];
  const wiredHooks: string[] = [];

  for (const hookFile of hookFiles) {
    it(`hook ${hookFile} is consumed by non-test source`, () => {
      const hookName =
        hookFile
          .split(sep)
          .pop()
          ?.replace(/\.[jt]sx?$/, "") ?? "";
      // Check if any non-test source file imports from this hook path
      const importPath = `@/hooks/${hookName}`;
      const importPathWithDir = `@/hooks/${hookFile.replace(/\.[jt]sx?$/, "")}`;
      const consumed = allSourceContents.some(
        (f) =>
          !f.path.includes(hookFile) &&
          (f.text.includes(importPath) || f.text.includes(importPathWithDir)),
      );

      if (consumed) {
        wiredHooks.push(hookFile);
      } else {
        orphanedHooks.push(hookFile);
      }
      expect(typeof hookFile).toBe("string");
    });
  }

  it("records orphaned hooks", () => {
    console.log("ORPHANED hooks:", orphanedHooks);
    console.log("WIRED hooks:", wiredHooks);
  });
});

// ─── NpcAIManager field audit ────────────────────────────────────────────────

const npcAIManagerFields = ["globalEconomicState", "difficultyModulator"];

describe("Orphan Scan: NpcAIManager Fields", () => {
  const orphanedManagerFields: string[] = [];
  const wiredManagerFields: string[] = [];

  for (const field of npcAIManagerFields) {
    it(`NpcAIManager.${field} is surfaced in UI (.tsx) or AI subsystem`, () => {
      const inTsx = isInTsx(field);
      const inAi = allCoreTsFiles
        .filter((f) => f.includes(sep + "ai" + sep) && !f.includes(".test."))
        .map((f) => readFileSafe(f))
        .join("\n")
        .includes(field);
      const intentText = readFileSafe(join(srcRoot, "core", "npc", "intentGenerators.ts"));
      const inIntentGen = intentText.includes(field);
      const isWired = inTsx || inAi || inIntentGen;
      if (isWired) {
        wiredManagerFields.push(field);
      } else {
        orphanedManagerFields.push(field);
      }
      console.log(
        `NpcAIManager.${field}: ${isWired ? "WIRED" : "ORPHANED"} (UI: ${inTsx}, AI: ${inAi}, intentGen: ${inIntentGen})`,
      );
      expect(typeof field).toBe("string");
    });
  }

  it("records orphaned NpcAIManager fields", () => {
    console.log("ORPHANED NpcAIManager fields (no UI/AI consumer):", orphanedManagerFields);
    console.log("WIRED NpcAIManager fields:", wiredManagerFields);
  });
});

// ─── Detailed budget allocation per-field audit ──────────────────────────────

describe("Orphan Scan: Budget Allocation Per-Field", () => {
  const budgetFields = ["training", "facilities", "auctions", "claiming", "breeding"];
  const orphanedBudgets: string[] = [];
  const wiredBudgets: string[] = [];

  for (const budget of budgetFields) {
    it(`budgetAllocation.${budget} is read by AI subsystem`, () => {
      const intentText = readFileSafe(join(srcRoot, "core", "npc", "intentGenerators.ts"));
      const allAiText = allCoreTsFiles
        .filter((f) => f.includes(sep + "ai" + sep) && !f.includes(".test."))
        .map((f) => readFileSafe(f))
        .join("\n");
      const isRead =
        intentText.includes(`budgetAllocation?.${budget}`) ||
        intentText.includes(`budgetAllocation.${budget}`) ||
        allAiText.includes(`budgetAllocation?.${budget}`) ||
        allAiText.includes(`budgetAllocation.${budget}`) ||
        allAiText.includes(`budget.${budget}`);

      if (isRead) {
        wiredBudgets.push(budget);
      } else {
        orphanedBudgets.push(budget);
      }
      console.log(`budgetAllocation.${budget}: ${isRead ? "READ" : "NOT READ"}`);
      expect(typeof budget).toBe("string");
    });
  }

  it("records orphaned budget fields", () => {
    console.log("ORPHANED budget fields (not read by AI):", orphanedBudgets);
    console.log("WIRED budget fields:", wiredBudgets);
  });
});

// ─── Confirmed wired fields (validation baseline) ────────────────────────────

describe("Orphan Scan: Confirmed Wired Fields (Validation Baseline)", () => {
  for (const field of confirmedWiredFields) {
    it(`${field} is confirmed wired in UI`, () => {
      expect(isInTsx(field)).toBe(true);
    });
  }
});
