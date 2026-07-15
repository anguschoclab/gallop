/**
 * Generates a full game state fixture for E2E tests.
 *
 * Calls createInitialState() with a minimal NewGameOptions, then serializes
 * the state into the {meta, horses, races, npcStables} bucket format that
 * reassembleState() expects in localStorage.
 *
 * Usage: bun run scripts/generate-e2e-fixture.ts
 * Output: src/tests/e2e/fixtures/e2e-fixture.json
 */

import { createInitialState } from "../src/game/store/initialization";
import { splitHorsesForPersistence } from "../src/core/persistence/npcCompression";
import { prunePedigree } from "../src/core/persistence/pedigreePrune";
import type { GameState } from "../src/game/types";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const META_KEYS: (keyof GameState)[] = [
  "day",
  "cash",
  "market",
  "trainingUsed",
  "log",
  "news",
  "archive",
  "pregnancies",
  "activeBreedingProgram",
  "triplecrownHistory",
  "paceSamples",
  "calibratedPars",
  "lastCalibrationDay",
  "npcAIManager",
  "scoutReports",
  "auctions",
  "jockeys",
  "awards",
  "campaigns",
  "expenses",
  "transactions",
  "replays",
  "reputation",
  "transports",
  "userSettings",
  "facilities",
  "npcFacilities",
  "playerProfile",
  "privateSaleOffers",
  "claims",
  "breedingPrograms",
  "usedHorseNames",
  "usedJockeyNames",
  "reservedHorseNames",
  "seasonRecords",
  "hallOfFame",
  "trackRecords",
  "horseLeaderboards",
  "founders",
  "lastFounderUpdateDay",
  "syndicates",
  "staffPool",
  "hiredStaff",
  "weather",
  "inbox",
  "stewardsInquiries",
  "playerNominations",
  "syndicateInvestors",
];

function buildPayload(state: GameState) {
  const stables = state.npcStables ?? [];
  const { playerHorses, npcSummaries } = splitHorsesForPersistence(stables, state.horses ?? {});

  const prunedPlayerHorses: Record<string, any> = {};
  for (const [id, horse] of Object.entries(playerHorses)) {
    prunedPlayerHorses[id] = {
      ...horse,
      pedigree: prunePedigree(horse.pedigree) ?? horse.pedigree,
    };
  }

  const meta: Record<string, unknown> = { storeVersion: 3 };
  for (const key of META_KEYS) {
    meta[key as string] = (state as any)[key];
  }

  const npcStablesBucket: Record<string, any> = {};
  for (const s of stables) {
    npcStablesBucket[s.id] = s;
  }

  return {
    meta,
    horses: { playerHorses: prunedPlayerHorses, npcSummaries },
    races: state.races ?? {},
    npcStables: npcStablesBucket,
  };
}

const state = createInitialState({
  profile: {
    stableName: "E2E Test Stables",
    ownerName: "Test Owner",
    silk: {
      pattern: "solid",
      primary: "#ff0000",
      secondary: "#0000ff",
      cap: "#00ff00",
    },
    backstoryId: "inheritor",
    founded: 1,
  },
  backstory: {
    horses: [{ tier: "starter", count: 4 }],
    facilityUpgrades: {},
    reputationScore: 0,
    startingCash: 100000,
  },
} as any);

const payload = buildPayload(state);

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "src", "tests", "e2e", "fixtures");
const outPath = join(outDir, "e2e-fixture.json");

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(payload));
console.log(
  `Fixture written to ${outPath} (${(JSON.stringify(payload).length / 1024).toFixed(0)} KB)`,
);
