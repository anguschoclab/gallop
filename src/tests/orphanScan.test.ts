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
import { GAME_PHASE_DESCRIPTORS } from "@/core/time/phases/descriptors";
import { runCapabilityAudit } from "../../scripts/orphan-audit";

// ─── Helpers: scan source files via fs ───────────────────────────────────────

const PROJECT_ROOT = join(__dirname, "..", "..");
const quarantineManifest = JSON.parse(
  readFileSync(join(PROJECT_ROOT, "src/tests/fixtures/campaignManifest.json"), "utf8"),
) as {
  deletionManifest: { path: string; disposition: string }[];
};
const quarantinedProductionPaths = new Set(
  quarantineManifest.deletionManifest
    .filter((entry) => entry.disposition === "quarantined_unique")
    .map((entry) => entry.path.replace(/^src\//, "")),
);

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
const agentsSimulationRoot = join(srcRoot, "domains", "agents", "simulation");
const allAgentTsFiles = collectFiles(agentsSimulationRoot, [".ts"], []);
const agentIntentGeneratorsPath = join(agentsSimulationRoot, "npc", "intentGenerators.ts");
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
  ...allAgentTsFiles,
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

/** Check if an import path (e.g., "@/domains/agents/simulation/campaignAI") appears in non-test source */
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
  "syndicates", // wired in syndicate.$syndicateId.tsx
  "syndicateInvestors", // wired in syndicate.$syndicateId.tsx
  "shareTransactions", // wired in syndicate.$syndicateId.tsx Transaction History
  "shareActivityFeed", // wired in ShareActivityFeed.tsx, rendered in syndicate.$syndicateId.tsx
  "syndicateValueSnapshots", // wired in SyndicateLedgerPanel.tsx on the Portfolio syndicates tab
];

// ─── State fields to audit (genuinely suspected orphans) ─────────────────────

const systemsStateOptionalFields: string[] = [];

const breedingStateFields: string[] = [];

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

  it("has no unclassified state-field orphans", () => {
    expect(orphanedFields).toEqual([]);
  });
});

describe("Orphan Scan: BreedingState Fields", () => {
  for (const field of breedingStateFields) {
    it(`BreedingState.${field} is ${isInTsx(field) ? "wired" : "ORPHANED"} in UI`, () => {
      expect(typeof field).toBe("string");
    });
  }

  it("all breeding state fields are confirmed wired", () => {
    expect(breedingStateFields.length).toBe(0);
  });
});

describe("Orphan Scan: AI Subsystem Imports", () => {
  const orphanedAI: string[] = [];
  const wiredAI: string[] = [];

  for (const aiFile of aiFiles) {
    const importPath = `@/domains/agents/simulation/${aiFile}`;
    it(`${aiFile} is ${isImportedByNonTest(importPath) ? "imported" : "ORPHANED"} by non-test source`, () => {
      const imported = isImportedByNonTest(importPath);
      if (imported) {
        wiredAI.push(aiFile);
      } else {
        orphanedAI.push(aiFile);
      }
      expect(imported).toBe(true);
    });
  }

  it("has no unclassified AI module orphans", () => {
    expect(orphanedAI).toEqual([]);
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
    expect(consumed).toBe(true);
  });

  it("context.economicTrend is consumed by downstream phases", () => {
    const phaseFiles = allCoreTsFiles
      .filter((f) => f.includes(sep + "time" + sep + "phases" + sep) && !f.includes(".test."))
      .map((f) => readFileSafe(f));

    const consumed = phaseFiles.some(
      (text) => text.includes("context.economicTrend") || text.includes("ctx.economicTrend"),
    );
    expect(consumed).toBe(true);
  });

  it("all registered pipeline phases have descriptors", () => {
    expect(GAME_PIPELINE_PHASES.length).toBe(GAME_PHASE_DESCRIPTORS.length);
  });
});

describe("Orphan Scan: Strategic Coordinator Outputs", () => {
  it("coordinateSubsystems return value is used (not _weights)", () => {
    const intentText = readFileSafe(agentIntentGeneratorsPath);
    const usesWeights = intentText.includes("_weights = coordinateSubsystems");
    expect(usesWeights).toBe(false);
  });

  it("assessWorldState reads globalEconomicState (not hardcoded)", () => {
    const coordText = readFileSafe(join(agentsSimulationRoot, "strategicCoordinator.ts"));
    const readsGlobalState = coordText.includes("manager.globalEconomicState");
    const hasFallback = coordText.includes("studFeeTrend: 0");
    console.log(
      `assessWorldState reads globalEconomicState: ${readsGlobalState}, has fallback defaults: ${hasFallback}`,
    );
    expect(readsGlobalState).toBe(true);
  });

  it("budgetAllocation is read by any AI subsystem", () => {
    const intentText = readFileSafe(agentIntentGeneratorsPath);
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

    expect(readsBudget).toBe(true);
  });
});

// ─── Intent type coverage audit ───────────────────────────────────────────────

const capabilityAudit = runCapabilityAudit(PROJECT_ROOT);
const allIntentTypes = capabilityAudit.intents.all;

describe("Orphan Scan: Intent Type Coverage", () => {
  const orphanedIntents: string[] = [];
  const wiredIntents: string[] = [];

  // Collect all non-test source text for intent generation check
  const intentGenText = readFileSafe(agentIntentGeneratorsPath);
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
      expect(isGenerated && isHandled).toBe(true);
    });
  }

  it("has no unhandled, unproduced, or unvalidated intent contracts", () => {
    expect(orphanedIntents).toEqual([]);
    expect(capabilityAudit.intents.unhandled).toEqual([]);
    expect(capabilityAudit.intents.unproduced).toEqual([]);
    expect(capabilityAudit.intents.unvalidated).toEqual([]);
  });
});

// ─── Store slice action audit ────────────────────────────────────────────────

const storeSlices = readdirSync(join(srcRoot, "game", "store", "slices"))
  .filter((file) => file.endsWith("Slice.ts"))
  .map((file) => file.replace(/\.ts$/, ""))
  .sort();

describe("Orphan Scan: Store Slice Imports", () => {
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
      expect(imported).toBe(true);
    });
  }

  it("has no orphaned store slices", () => {
    expect(storeSlices.length).toBeGreaterThan(0);
    expect(orphanedSlices).toEqual([]);
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
      // hookFile is relative to srcRoot (e.g., "hooks/analytics/useAnalyticsData.ts")
      // so the import path is "@/hooks/analytics/useAnalyticsData"
      const importPathWithDir = `@/${hookFile.replace(/\.[jt]sx?$/, "")}`;
      // Also check bare hook name for relative imports (./useXxx) within same directory
      const relativeImport = `./${hookName}`;
      const consumed = allSourceContents.some(
        (f) =>
          !f.path.includes(hookFile) &&
          (f.text.includes(importPathWithDir) || f.text.includes(relativeImport)),
      );

      const classified = consumed || quarantinedProductionPaths.has(hookFile);
      if (consumed) {
        wiredHooks.push(hookFile);
      } else if (!classified) {
        orphanedHooks.push(hookFile);
      }
      expect(classified).toBe(true);
    });
  }

  it("has no unclassified hook orphans", () => {
    expect(orphanedHooks).toEqual([]);
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
      const inAi = allAgentTsFiles
        .filter((f) => !f.includes(".test."))
        .map((f) => readFileSafe(f))
        .join("\n")
        .includes(field);
      const intentText = readFileSafe(agentIntentGeneratorsPath);
      const inIntentGen = intentText.includes(field);
      const isWired = inTsx || inAi || inIntentGen;
      if (isWired) {
        wiredManagerFields.push(field);
      } else {
        orphanedManagerFields.push(field);
      }
      expect(isWired).toBe(true);
    });
  }

  it("has no unclassified NpcAIManager field orphans", () => {
    expect(orphanedManagerFields).toEqual([]);
  });
});

// ─── Detailed budget allocation per-field audit ──────────────────────────────

describe("Orphan Scan: Budget Allocation Per-Field", () => {
  const budgetFields = ["training", "facilities", "auctions", "claiming", "breeding"];
  const orphanedBudgets: string[] = [];
  const wiredBudgets: string[] = [];

  for (const budget of budgetFields) {
    it(`budgetAllocation.${budget} is read by AI subsystem`, () => {
      const intentText = readFileSafe(agentIntentGeneratorsPath);
      const allAiText = allAgentTsFiles
        .filter((f) => !f.includes(".test."))
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
      expect(isRead).toBe(true);
    });
  }

  it("has no unread budget allocation fields", () => {
    expect(orphanedBudgets).toEqual([]);
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

// ─── Extended Audit: Dormant Systems & Intent Symmetry ─────────────────────────

describe("Orphan Scan: Dormant AI Functions", () => {
  it("shouldWithdrawForTrackCondition has callers in production code", () => {
    const callerFiles = allAgentTsFiles
      .filter((f) => !f.includes("withdrawalAI.ts") && !f.includes(".test."))
      .filter((f) => readFileSafe(f).includes("shouldWithdrawForTrackCondition"));
    expect(callerFiles.length).toBeGreaterThan(0);
  });
});

describe("Orphan Scan: Facility Type Parity", () => {
  it("FacilityType includes imperial facilities (jockey_academy, museum)", () => {
    const facilityTypesText = readFileSafe(join(srcRoot, "core", "facilities", "facilityTypes.ts"));
    expect(facilityTypesText.includes('"jockey_academy"')).toBe(true);
    expect(facilityTypesText.includes('"museum"')).toBe(true);
  });
});

describe("Orphan Scan: NPC Insurance Intents", () => {
  it("NPC AI generates insurance_purchase intents", () => {
    const intentGenFiles = allAgentTsFiles.filter(
      (f) => f.includes(sep + "npc" + sep) && !f.includes(".test."),
    );
    const hasInsurance = intentGenFiles.some((f) =>
      readFileSafe(f).includes('type: "insurance_purchase"'),
    );
    expect(hasInsurance).toBe(true);
  });
});
