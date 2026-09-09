/**
 * scripts/orphan-audit.ts - Automated repository-wide orphan and wiring scanner
 *
 * Scans the codebase for:
 * 1. Intent coverage: player-generated, NPC-generated, and resolver-handled status across all 45 intents.
 * 2. Dormant AI functions: functions implemented/tested but not invoked in intent generation or execution loops.
 * 3. Facility type parity: compares FacilityType against Outpost SLOT_FOOTPRINTS.
 * 4. Summary metrics and actionable wiring items.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";

export interface IntentCoverageReport {
  allIntents: string[];
  playerGenerated: string[];
  npcGenerated: string[];
  handled: string[];
  orphanedFromNpc: string[];
  orphanedFromPlayer: string[];
}

export interface DormantAiReport {
  checkedFunctions: string[];
  dormantFunctions: string[];
  activeFunctions: string[];
}

export interface FacilityParityReport {
  facilityTypes: string[];
  outpostFootprints: string[];
  missingFromFacilityTypes: string[];
}

export interface OrphanAuditSummary {
  totalIntents: number;
  npcCoveragePercent: number;
  handledPercent: number;
  dormantAiCount: number;
  missingFacilityCount: number;
}

export interface OrphanAuditResult {
  intents: IntentCoverageReport;
  dormantAi: DormantAiReport;
  facilityParity: FacilityParityReport;
  summary: OrphanAuditSummary;
}

export const ALL_INTENT_TYPES = [
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
      ) {
        continue;
      }
      collectFiles(fullPath, extensions, results);
    } else if (extensions.includes(extname(entry))) {
      results.push(fullPath);
    }
  }
  return results;
}

function readFileSafe(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function scanIntentCoverage(srcRoot: string): IntentCoverageReport {
  const npcDir = join(srcRoot, "core", "npc");
  const npcFiles = collectFiles(npcDir, [".ts"]);
  const npcContent = npcFiles.map((f) => readFileSafe(f)).join("\n");

  const uiDir = join(srcRoot, "components");
  const routesDir = join(srcRoot, "routes");
  const storeDir = join(srcRoot, "game", "store");
  const playerFiles = [
    ...collectFiles(uiDir, [".tsx", ".ts"]),
    ...collectFiles(routesDir, [".tsx", ".ts"]),
    ...collectFiles(storeDir, [".ts"]),
  ].filter((f) => !f.includes(".test."));
  const playerContent = playerFiles.map((f) => readFileSafe(f)).join("\n");

  const handlersDir = join(srcRoot, "core", "resolver", "handlers");
  const phasesDir = join(srcRoot, "core", "time", "phases");
  const handlerFiles = [
    ...collectFiles(handlersDir, [".ts"]),
    ...collectFiles(phasesDir, [".ts"]),
  ].filter((f) => !f.includes(".test."));
  const handlerContent = handlerFiles.map((f) => readFileSafe(f)).join("\n");

  const playerGenerated: string[] = [];
  const npcGenerated: string[] = [];
  const handled: string[] = [];
  const orphanedFromNpc: string[] = [];
  const orphanedFromPlayer: string[] = [];

  for (const type of ALL_INTENT_TYPES) {
    const pattern = `type: "${type}"`;
    const isPlayer = playerContent.includes(pattern) || playerContent.includes(`type: '${type}'`);
    const isNpc = npcContent.includes(pattern) || npcContent.includes(`type: '${type}'`);
    const isHandled =
      handlerContent.includes(`"${type}"`) || handlerContent.includes(`'${type}'`);

    if (isPlayer) playerGenerated.push(type);
    else orphanedFromPlayer.push(type);

    if (isNpc) npcGenerated.push(type);
    else orphanedFromNpc.push(type);

    if (isHandled) handled.push(type);
  }

  return {
    allIntents: ALL_INTENT_TYPES,
    playerGenerated,
    npcGenerated,
    handled,
    orphanedFromNpc,
    orphanedFromPlayer,
  };
}

export function scanDormantAiFunctions(srcRoot: string): DormantAiReport {
  const candidateFunctions = [
    { name: "shouldWithdrawForTrackCondition", file: "src/core/ai/withdrawalAI.ts" },
    { name: "detectConsecutiveWithdrawalPattern", file: "src/core/ai/withdrawalAI.ts" },
  ];

  const nonTestFiles = collectFiles(srcRoot, [".ts", ".tsx"]).filter(
    (f) => !f.includes(".test.") && !f.includes(sep + "test-utils" + sep),
  );

  const checkedFunctions: string[] = [];
  const dormantFunctions: string[] = [];
  const activeFunctions: string[] = [];

  for (const fn of candidateFunctions) {
    checkedFunctions.push(fn.name);
    let callerCount = 0;

    for (const file of nonTestFiles) {
      if (file.endsWith(fn.file.replace(/\//g, sep))) continue;
      const content = readFileSafe(file);
      if (content.includes(fn.name)) {
        callerCount++;
      }
    }

    if (callerCount === 0) {
      dormantFunctions.push(fn.name);
    } else {
      activeFunctions.push(fn.name);
    }
  }

  return {
    checkedFunctions,
    dormantFunctions,
    activeFunctions,
  };
}

export function scanFacilityTypeParity(srcRoot: string): FacilityParityReport {
  const facilityTypesPath = join(srcRoot, "core", "facilities", "facilityTypes.ts");
  const outpostTypesPath = join(srcRoot, "core", "facilities", "outpostTypes.ts");

  const facilityTypesContent = readFileSafe(facilityTypesPath);
  const outpostTypesContent = readFileSafe(outpostTypesPath);

  // Extract facility types from `FacilityType` enum/union
  const facilityTypeMatches =
    facilityTypesContent.match(/export type FacilityType\s*=\s*([^;]+);/s)?.[1] || "";
  const facilityTypes = Array.from(facilityTypeMatches.matchAll(/"([^"]+)"/g)).map((m) => m[1]);

  // Extract keys from SLOT_FOOTPRINTS
  const slotFootprintsMatch =
    outpostTypesContent.match(/SLOT_FOOTPRINTS:\s*{([^}]+)}/s)?.[1] || "";
  const outpostFootprints = Array.from(
    slotFootprintsMatch.matchAll(/([a-z_]+)\s*:/g),
  ).map((m) => m[1]);

  const missingFromFacilityTypes = outpostFootprints.filter(
    (fp) => !facilityTypes.includes(fp),
  );

  return {
    facilityTypes,
    outpostFootprints,
    missingFromFacilityTypes,
  };
}

export function runOrphanAudit(projectRoot: string): OrphanAuditResult {
  const srcRoot = join(projectRoot, "src");
  const intents = scanIntentCoverage(srcRoot);
  const dormantAi = scanDormantAiFunctions(srcRoot);
  const facilityParity = scanFacilityTypeParity(srcRoot);

  const summary: OrphanAuditSummary = {
    totalIntents: intents.allIntents.length,
    npcCoveragePercent: Math.round(
      (intents.npcGenerated.length / intents.allIntents.length) * 100,
    ),
    handledPercent: Math.round((intents.handled.length / intents.allIntents.length) * 100),
    dormantAiCount: dormantAi.dormantFunctions.length,
    missingFacilityCount: facilityParity.missingFromFacilityTypes.length,
  };

  return {
    intents,
    dormantAi,
    facilityParity,
    summary,
  };
}

// CLI entry point
if (import.meta.main) {
  const projectRoot = process.cwd();
  const result = runOrphanAudit(projectRoot);

  console.log("\n=======================================================");
  console.log("             GALLOP ORPHAN & WIRING AUDIT               ");
  console.log("=======================================================\n");

  console.log(`[1] INTENT MATRIX COVERAGE (${result.summary.totalIntents} intent types)`);
  console.log(`    - Handled by Resolvers: ${result.intents.handled.length}/${result.summary.totalIntents} (${result.summary.handledPercent}%)`);
  console.log(`    - NPC AI Emitted:      ${result.intents.npcGenerated.length}/${result.summary.totalIntents} (${result.summary.npcCoveragePercent}%)`);
  console.log(`    - Player UI Emitted:   ${result.intents.playerGenerated.length}/${result.summary.totalIntents}`);
  if (result.intents.orphanedFromNpc.length > 0) {
    console.log(`    ⚠️  Missing from NPC AI:`, result.intents.orphanedFromNpc);
  }

  console.log(`\n[2] DORMANT AI LOGIC`);
  console.log(`    - Dormant functions (tested only, 0 production callers):`, result.dormantAi.dormantFunctions);
  console.log(`    - Active functions:`, result.dormantAi.activeFunctions);

  console.log(`\n[3] FACILITY TYPE PARITY`);
  console.log(`    - Defined FacilityTypes:`, result.facilityParity.facilityTypes);
  console.log(`    - Outpost Footprints:    `, result.facilityParity.outpostFootprints);
  if (result.facilityParity.missingFromFacilityTypes.length > 0) {
    console.log(`    ⚠️  In footprints but missing from FacilityType:`, result.facilityParity.missingFromFacilityTypes);
  }

  console.log("\n=======================================================\n");
}
