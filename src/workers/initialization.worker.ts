/**
 * Initialization Worker
 * Handles game initialization in a Web Worker to offload CPU-intensive operations
 * like horse generation, race generation, and NPC setup from the main thread.
 */

import { expose } from "comlink";
import type { GameState } from "@/game/types";
import type { NewGameOptions } from "@/game/state";
import { generateHorse } from "@/game/horseGen";
import { generateRace, makeGradedRace } from "@/game/raceGeneration/raceGen";
import { generateInitialJockeys } from "@/game/jockeyGen";
import { generateAllStables } from "@/game/npcStables";
import { generateAllNpcHorses } from "@/game/npcHorseGen";
import { runNpcRaceEntry } from "@/game/npcRaceEntry";
import { createRng, hashStr, type Rng } from "@/game/rng";
import { GRADED_RACES } from "@/game/gradedRaces";
import { createDefaultPlayerFacilities, createFacility } from "@/core/facilities";
import { STARTING_CASH } from "@/game/constants/gameConstants";

export type InitializeInput = {
  options?: NewGameOptions;
  progressCallback?: (stage: number, totalStages: number, stageName: string) => void;
};

export type InitializeOutput = {
  state: GameState;
};

/**
 * Creates the initial game state for a new game in the worker
 */
async function createInitialState(input: InitializeInput): Promise<InitializeOutput> {
  const { options, progressCallback } = input;
  const totalStages = 7;

  // Stage 1: Generate player horses
  if (progressCallback) {
    progressCallback(1, totalStages, "Generating player horses");
  }

  const profileSeed = options?.profile.stableName ?? "initial_setup";
  const setupRng = createRng(hashStr(profileSeed));

  const playerHorseSpecs = options?.backstory.horses ?? [{ tier: "starter" as const, count: 2 }];
  const playerSilkColor = options?.profile.silk.primary;
  const horses: any[] = [];
  for (const spec of playerHorseSpecs) {
    for (let i = 0; i < spec.count; i++) {
      const h = generateHorse({ tier: spec.tier, owned: true }, setupRng);
      if (playerSilkColor) h.silk = playerSilkColor;
      horses.push(h);
    }
  }

  // Stage 2: Generate market horses
  if (progressCallback) {
    progressCallback(2, totalStages, "Generating market horses");
  }

  const market: any[] = Array.from({ length: 5 }, () => {
    const r = setupRng.next();
    const tier: "starter" | "budget" | "mid" | "elite" = r < 0.6 ? "budget" : "mid";
    return generateHorse({ tier }, setupRng);
  });

  // Stage 3: Generate races
  if (progressCallback) {
    progressCallback(3, totalStages, "Generating races");
  }

  const races: any[] = [];
  for (let d = 1; d <= 7; d++) {
    const dayRng = createRng(hashStr(`raceGen_${d}`));
    const count = dayRng.next() < 0.7 ? 2 : 3;
    for (let i = 0; i < count; i++) races.push(generateRace(d, dayRng));
  }
  for (const g of GRADED_RACES) {
    const gradedRng = createRng(hashStr(`graded_${g.key}`));
    races.push(makeGradedRace(g, g.dayOfYear, gradedRng));
  }

  // Stage 4: Generate NPC stables and horses
  if (progressCallback) {
    progressCallback(4, totalStages, "Generating NPC stables and horses");
  }

  const stableRng = createRng(hashStr("initial_stables"));
  const npcStables = generateAllStables(1, stableRng);
  const npcHorseRng = createRng(hashStr("initial_npc_horses"));
  const { stables: updatedStables, horses: npcHorses } = generateAllNpcHorses(
    npcStables,
    npcHorseRng,
  );

  // Stage 5: Generate jockeys
  if (progressCallback) {
    progressCallback(5, totalStages, "Generating jockeys");
  }

  const jockeyRng = createRng(hashStr("initial_jockeys"));
  const jockeys = generateInitialJockeys(jockeyRng);

  // Stage 6: Run initial NPC race entry
  if (progressCallback) {
    progressCallback(6, totalStages, "Running initial NPC race entry");
  }

  const pregnantIds = new Set<string>();
  const entryRng = createRng(hashStr("initial_entry"));
  const racesWithEntries = runNpcRaceEntry(
    updatedStables,
    npcHorses,
    jockeys,
    races,
    1,
    entryRng,
    7,
    pregnantIds,
  );

  // Stage 7: Setup facilities and final state
  if (progressCallback) {
    progressCallback(7, totalStages, "Finalizing game state");
  }

  const facilities = createDefaultPlayerFacilities(1);
  if (options) {
    for (const [type, level] of Object.entries(options.backstory.facilityUpgrades)) {
      if (level) {
        facilities[type as keyof typeof facilities] = createFacility(
          type as Parameters<typeof createFacility>[0],
          level as any,
          1,
        );
      }
    }
  }

  const reputationScore = options?.backstory.reputationScore ?? 0;
  const startingCash = options?.backstory.startingCash ?? STARTING_CASH;
  const welcomeText = options
    ? `${options.profile.stableName} opens its doors. Welcome, ${options.profile.ownerName}.`
    : "Welcome to your stable. Train your horses and enter them in races.";

  return {
    state: {
      day: 1,
      cash: startingCash,
      horses: [...horses, ...npcHorses],
      market,
      races: racesWithEntries,
      trainingUsed: {},
      log: [{ day: 1, text: welcomeText }],
      pregnancies: [],
      npcStables: updatedStables,
      scoutReports: [],
      auctions: [],
      jockeys: generateInitialJockeys(createRng(hashStr("initial_jockeys")), 25),
      awards: [],
      facilities,
      reputation: {
        score: reputationScore,
        events: [],
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        totalWins: 0,
        yearsActive: 0,
        tier: "unknown",
      },
      playerProfile: options?.profile,
    },
  };
}

/**
 * Initialization worker API exposed via Comlink
 */
export type InitializationWorkerApi = {
  createInitialState(input: InitializeInput): Promise<InitializeOutput>;
};

// Expose the worker API with Comlink
expose({
  createInitialState,
} as InitializationWorkerApi);
