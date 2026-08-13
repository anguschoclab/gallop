/**
 * store/initialization.ts - Game state initialization
 *
 * This file provides game state initialization logic for creating the initial
 * game state for new games, including horses, races, jockeys, stables, and facilities.
 *
 * Dependencies: @/game/types (GameState, Horse, Race), @/game/state (NewGameOptions), @/game/horseGen (generateHorse), @/game/raceGeneration/raceGen (generateRace, makeGradedRace), @/game/jockeyGen (generateInitialJockeys), @/game/npcStables (generateAllStables), @/game/npcHorseGen (generateAllNpcHorses), @/game/famousStallions (generateFamousStallions), @/game/npcRaceEntry (runNpcRaceEntry), @/game/rng (createRng, hashStr, Rng), @/game/gradedRaces (GRADED_RACES), @/core/facilities (createDefaultPlayerFacilities, createFacility, FacilityLevel), @/game/constants (STARTING_CASH)
 * Related files: store/index.ts (uses initialization), types.ts (state types)
 */

/**
 * Game Initialization Logic
 * Creates the initial game state for new games
 */

import type { GameState, Horse, Race } from "@/game/types";
import type { NewGameOptions } from "@/game/store/state";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { generateRace, makeGradedRace } from "@/core/race/generation/raceGen";
import { generateInitialJockeys } from "@/core/jockey/generator";
import { generateAllStables } from "@/core/npc/stables";
import { generateAllNpcHorses } from "@/core/npc/horseGenerator";
import { generateFamousStallions } from "@/data/famousStallions";
import { runNpcRaceEntry } from "@/core/npc/raceEntry";
import { createRng, hashStr, type Rng } from "@/core/common/rng";
import { GRADED_RACES } from "@/data/gradedRaces";
import { createDefaultPlayerFacilities, createFacility } from "@/core/facilities";
import type { FacilityLevel } from "@/core/facilities";
import { STARTING_CASH } from "@/constants";
import { seedGazetteNews } from "@/services/narrative/seedNewsGenerator";
import { createStableAIState } from "@/core/ai/npcCycleAI";
import { generateUpcomingRaces } from "@/game/store/helpers/market";
import { ensureMaidenRaces } from "@/core/race/maidenGuarantee";

/**
 * Creates the initial game state for a new game.
 *
 * Generates player horses (backstory-driven if options provided), market horses,
 * races for the first week and full graded stakes schedule, NPC stables and horses,
 * jockeys, and facilities. Applies backstory upgrades to facilities if provided.
 *
 * @param options - Optional new game options including backstory and profile
 * @returns Initial game state with all entities populated
 */
export function createInitialState(options?: NewGameOptions): GameState {
  const profileSeed = options?.profile.stableName ?? "initial_setup";
  const setupRng = createRng(hashStr(profileSeed));

  // Generate player horses — backstory-driven if options provided, else default 2 starters
  const playerHorseSpecs = options?.backstory.horses ?? [{ tier: "starter" as const, count: 2 }];
  const playerSilkColor = options?.profile.silk.primary;
  const horses: Horse[] = [];
  const usedNames = new Set<string>();
  for (const spec of playerHorseSpecs) {
    for (let i = 0; i < spec.count; i++) {
      const h = ensurePhenotypeResolved(
        generateHorse({ tier: spec.tier, owned: true }, setupRng, {
          existingNames: usedNames,
        }),
      );
      if (playerSilkColor) h.silk = playerSilkColor;
      horses.push(h);
      usedNames.add(h.name.toLowerCase());
    }
  }

  const market: Horse[] = Array.from({ length: 5 }, () => {
    const r = setupRng.next();
    const tier: "starter" | "budget" | "mid" | "elite" = r < 0.6 ? "budget" : "mid";
    const h = generateHorse({ tier }, setupRng, { existingNames: usedNames });
    usedNames.add(h.name.toLowerCase());
    return h;
  });

  const races: Race[] = [];
  for (let d = 1; d <= 7; d++) {
    const dayRng = createRng(hashStr(`raceGen_${d}`));
    const count = dayRng.next() < 0.7 ? 2 : 3;
    for (let i = 0; i < count; i++) races.push(generateRace(d, dayRng));
  }
  // Schedule the full first year of real graded stakes
  for (const g of GRADED_RACES) {
    const gradedRng = createRng(hashStr(`graded_${g.key}`));
    races.push(makeGradedRace(g, g.dayOfYear, gradedRng));
  }

  // Generate track-based races for days 2-8 (graded dedup prevents duplicates)
  const racesWithTrack = generateUpcomingRaces(races, 1);

  // Guarantee starter-eligible maiden races for days 2-7
  const racesWithMaidens = ensureMaidenRaces(racesWithTrack, 2, 7, setupRng);

  // Generate NPC stables and horses
  const stableRng = createRng(hashStr("initial_stables"));
  const npcStables = generateAllStables(1, stableRng);
  const npcHorseRng = createRng(hashStr("initial_npc_horses"));

  // Generate famous stallions first
  const famousStallions = generateFamousStallions(npcStables, npcHorseRng);

  // Generate remaining NPC horses (non-stallions) and integrate famous stallions
  const {
    stables: updatedStables,
    horses: npcHorses,
    usedNames: npcUsedNames,
  } = generateAllNpcHorses(npcStables, npcHorseRng, undefined, 1, famousStallions);

  // Merge used names
  for (const name of npcUsedNames) usedNames.add(name);

  // Generate initial jockeys
  const jockeyRng = createRng(hashStr("initial_jockeys"));
  const usedJockeyNames = new Set<string>();
  const jockeys = generateInitialJockeys(jockeyRng, 25, usedJockeyNames);

  // Run initial NPC race entry to populate races
  const pregnantIds = new Set<string>();
  const entryRng = createRng(hashStr("initial_entry"));
  const racesWithEntries = runNpcRaceEntry(
    updatedStables,
    npcHorses,
    jockeys,
    racesWithMaidens,
    1,
    entryRng,
    7,
    pregnantIds,
  );

  // Facilities — start with all-basic default, then apply backstory upgrades
  const facilities = createDefaultPlayerFacilities(1);
  if (options) {
    for (const [type, level] of Object.entries(options.backstory.facilityUpgrades)) {
      if (level) {
        const facilityType = type as Parameters<typeof createFacility>[0];
        const facilityLevel = level as FacilityLevel;
        facilities[type as keyof typeof facilities] = createFacility(
          facilityType,
          facilityLevel,
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

  // Generate Day 1 Seed Gazette
  const gazetteRng = createRng(hashStr(`gazette_${profileSeed}`));
  const { news: seedNews, introStableIds } = seedGazetteNews(
    updatedStables,
    npcHorses,
    racesWithEntries,
    options?.profile,
    gazetteRng,
  );

  // Build npcAIManager with intro marks for seed-gazette'd stables
  const npcAIManager = {
    stableStates: {} as Record<string, ReturnType<typeof createStableAIState>>,
    globalDay: 1,
    regionalKings: {} as Record<string, string>,
  };
  for (const stableId of introStableIds) {
    const stable = updatedStables.find((s) => s.id === stableId);
    if (stable) {
      const aiState = createStableAIState(stable, 1);
      aiState.introPublishedDay = 1;
      npcAIManager.stableStates[stableId] = aiState;
    }
  }

  return {
    day: 1,
    cash: startingCash,
    horses: Object.fromEntries([...horses, ...npcHorses].map((h) => [h.id, h])),
    market,
    races: Object.fromEntries(racesWithEntries.map((r) => [r.id, r])),
    trainingUsed: {},
    playerNominations: [],
    log: [{ day: 1, text: welcomeText }],
    pregnancies: [],
    npcStables: updatedStables,
    npcAIManager,
    scoutReports: [],
    auctions: [],
    jockeys,
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
    usedHorseNames: Array.from(usedNames),
    usedJockeyNames: Array.from(usedJockeyNames),
    reservedHorseNames: [],
    seasonRecords: [],
    hallOfFame: [],
    transactions: [],
    expenses: [],
    news: seedNews,
    inbox: [],
    archive: {
      horses: [],
      races: [],
      pregnancies: [],
      news: [],
    },
    activeBreedingProgram: null,
    paceSamples: {},
    calibratedPars: {},
    lastCalibrationDay: 0,
    campaigns: [],
    replays: [],
    transports: [],
    trackRecords: {},
    horseLeaderboards: {},
    founders: {},
    lastFounderUpdateDay: 0,
    syndicates: {},
    syndicateInvestors: {},
    shareTransactions: [],
    shareActivityFeed: [],
    staffPool: [],
    hiredStaff: [],
    breedingPrograms: [],
    privateSaleOffers: [],
    claims: [],
    stewardsInquiries: [],
    savedMatingPlans: [],
  };
}
