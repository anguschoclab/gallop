// NPC Intent Generators
// Generates intents for NPC stables during the intent collection phase

import type {
  AnyIntent,
  TrainingIntent,
  RaceEntryIntent,
  BreedingIntent,
  ClaimingIntent,
  WithdrawFromClaimingIntent,
} from "@/core/resolver/intents";
import type { GameState, Horse, Race, Stable } from "@/game/types";
import { generateUUID } from "@/game/uuid";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { isHorseEligibleForClaimingPrice } from "@/game/claiming";
import { calculateOverallRating } from "@/core/horse/stats";
import {
  createTrainingAIState,
  selectTrainingType,
  shouldTrainToday,
  updateHorseTraining,
  recordTrainingOutcome,
} from "@/core/ai/trainingAI";
import {
  createClaimingAIState,
  shouldClaimHorse,
  recordClaimingDecision,
} from "@/core/ai/claimingAI";
import {
  getOrCreateStableAIState,
  updateStableAIState,
  type NpcAIManager,
  type StableAIState,
} from "@/core/ai/npcCycleAI";

/**
 * Generate all NPC intents for the day
 */
export function generateNpcIntents(state: GameState, day: number): AnyIntent[] {
  const intents: AnyIntent[] = [];
  const aiManager = state.npcAIManager;

  // Index horses by stable for fast lookup
  const horseMap = new Map(state.horses.map((h) => [h.id, h]));
  const horsesByStable = new Map<string, Horse[]>();
  for (const horse of state.horses) {
    if (horse.stableId) {
      if (!horsesByStable.has(horse.stableId)) horsesByStable.set(horse.stableId, []);
      horsesByStable.get(horse.stableId)!.push(horse);
    }
  }

  // Pre-index active pregnancies
  const activePregnanciesByDam = new Set<string>();
  if (state.pregnancies) {
    for (const p of state.pregnancies) {
      if (!p.resolved) activePregnanciesByDam.add(p.damId);
    }
  }

  // Cache upcoming races and index them by region
  const upcomingRaces = state.races.filter((r) => !r.resolved && r.day >= day && r.day <= day + 7);

  const racesByRegion = new Map<string, Race[]>();
  const globalGradedRaces: Race[] = [];

  for (const race of upcomingRaces) {
    const region = race.graded ? race.graded.country || "Other" : "Other";
    if (!racesByRegion.has(region)) racesByRegion.set(region, []);
    racesByRegion.get(region)!.push(race);

    if (race.graded) {
      globalGradedRaces.push(race);
    }
  }

  // Pre-index entries for faster lookup in loops
  const raceEntrySets = new Map<string, Set<string>>();
  for (const race of upcomingRaces) {
    raceEntrySets.set(race.id, new Set(race.entries.map((e) => e.horseId)));
  }

  // Generate intents for each NPC stable
  for (const stable of state.npcStables) {
    const ownedHorses = horsesByStable.get(stable.id) || [];

    // Get or create AI state for this stable
    const stableAI = aiManager ? getOrCreateStableAIState(aiManager, stable, day) : undefined;

    // Only check races in the stable's country, plus any Graded races (which are "global")
    const stableRegion = stable.country || "Other";
    const relevantRaces = [
      ...(racesByRegion.get(stableRegion) || []),
      ...globalGradedRaces.filter((r) => r.graded?.country !== stableRegion),
    ];

    intents.push(
      ...generateNpcTrainingIntents(
        state,
        stable,
        stableAI,
        day,
        ownedHorses,
        activePregnanciesByDam,
      ),
    );
    intents.push(
      ...generateNpcRaceEntryIntents(
        state,
        stable,
        stableAI,
        day,
        ownedHorses,
        relevantRaces,
        raceEntrySets,
      ),
    );
    intents.push(
      ...generateNpcBreedingIntents(
        state,
        stable,
        stableAI,
        day,
        ownedHorses,
        activePregnanciesByDam,
      ),
    );
    intents.push(
      ...generateNpcClaimingIntents(state, stable, stableAI, day, relevantRaces, horseMap),
    );
    intents.push(
      ...generateNpcWithdrawalIntents(
        state,
        stable,
        stableAI,
        day,
        ownedHorses,
        relevantRaces,
        horseMap,
      ),
    );

    // Update stable AI state in the manager
    if (aiManager && stableAI) {
      aiManager.stableStates[stable.id] = updateStableAIState(stableAI, day);
    }
  }

  return intents;
}

/**
 * Generate training intents for an NPC stable
 */
function generateNpcTrainingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  activePregnanciesByDam: Set<string>,
): TrainingIntent[] {
  const intents: TrainingIntent[] = [];

  // Use persisted AI state if available, otherwise fallback to temporary state
  const trainingAI =
    stableAI?.trainingAI ||
    (stableAI ? (stableAI.trainingAI = createTrainingAIState(stable)) : createTrainingAIState(stable));

  for (const horse of ownedHorses) {
    // AI-driven training decision
    if (horse.energy >= 15 && !activePregnanciesByDam.has(horse.id)) {
      // Use AI to determine if horse should train today
      if (shouldTrainToday(trainingAI, horse, day)) {
        // Use AI to select training type
        const trainingType = selectTrainingType(trainingAI, horse, day);

        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50, // NPC intents have lower priority than player
          type: "training",
          horseId: horse.id,
          trainingType,
        });
      }
    }
  }

  return intents;
}

/**
 * Generate race entry intents for an NPC stable
 */
function generateNpcRaceEntryIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  upcomingRaces: Race[],
  raceEntrySets: Map<string, Set<string>>,
): RaceEntryIntent[] {
  const intents: RaceEntryIntent[] = [];

  for (const race of upcomingRaces) {
    const entrySet = raceEntrySets.get(race.id);
    for (const horse of ownedHorses) {
      // Simple logic: enter if horse is eligible and has energy
      if (horse.energy >= 40 && (!entrySet || !entrySet.has(horse.id))) {
        if (race.entries.length < race.fieldSize) {
          intents.push({
            id: generateUUID(),
            entityId: race.id,
            source: "npc",
            sourceId: stable.id,
            day,
            priority: 50,
            type: "race_entry",
            raceId: race.id,
            horseId: horse.id,
          });
        }
      }
    }
  }

  return intents;
}

/**
 * Generate breeding intents for an NPC stable
 */
function generateNpcBreedingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  activePregnanciesByDam: Set<string>,
): BreedingIntent[] {
  const intents: BreedingIntent[] = [];

  // Find eligible mares and stallions
  const mares = ownedHorses.filter((h) => h.gender === "mare" && h.age >= 3 && h.age <= 15);
  const stallions = ownedHorses.filter(
    (h) => (h.gender === "horse" || h.gender === "gelding") && h.stud?.atStud,
  );

  for (const mare of mares) {
    // Skip if already pregnant
    if (activePregnanciesByDam.has(mare.id)) continue;

    for (const stallion of stallions) {
      // Simple logic: breed if stable has cash and stallion has bookings available
      if (
        stable.cash >= 2000 &&
        stallion.stud &&
        stallion.stud.seasonBookings < stallion.stud.bookSize
      ) {
        intents.push({
          id: generateUUID(),
          entityId: mare.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50,
          type: "breeding",
          sireId: stallion.id,
          damId: mare.id,
          liveFoalGuarantee: false,
        });
        break; // One breeding per mare per day
      }
    }
  }

  return intents;
}

/**
 * Generate claiming intents for an NPC stable
 */
function generateNpcClaimingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  upcomingRaces: Race[],
  horseMap: Map<string, Horse>,
): ClaimingIntent[] {
  const intents: ClaimingIntent[] = [];

  // Use persisted AI state if available, otherwise fallback to temporary state
  const claimingAI =
    stableAI?.claimingAI ||
    (stableAI ? (stableAI.claimingAI = createClaimingAIState(stable)) : createClaimingAIState(stable));

  for (const race of upcomingRaces) {
    // Skip if not a claiming race
    if (!race.claimingPrice) continue;

    for (const entry of race.entries) {
      const horse = horseMap.get(entry.horseId);

      if (!horse) continue;
      if (horse.stableId === stable.id) continue; // Don't claim own horses

      // Use AI to determine if should claim
      if (shouldClaimHorse(claimingAI, horse, race, stable, day)) {
        // Check horse eligibility
        if (!isHorseEligibleForClaimingPrice(horse, race.claimingPrice, state.horses)) continue;

        // Record claiming decision for learning
        recordClaimingDecision(claimingAI, horse, race, stable, day);

        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 60,
          type: "claiming",
          raceId: race.id,
          horseId: horse.id,
          claimantStableId: stable.id,
          claimingPrice: race.claimingPrice,
        });
      }
    }
  }

  return intents;
}

/**
 * Generate withdrawal intents for an NPC stable
 */
function generateNpcWithdrawalIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  upcomingRaces: Race[],
  horseMap: Map<string, Horse>,
): WithdrawFromClaimingIntent[] {
  const intents: WithdrawFromClaimingIntent[] = [];
  const personality = PERSONALITY_CONFIG[stable.personality];

  for (const race of upcomingRaces) {
    // Skip if not a claiming race
    if (!race.claimingPrice) continue;

    for (const entry of race.entries) {
      if (entry.stableId !== stable.id) continue;

      const horse = horseMap.get(entry.horseId);
      if (!horse) continue;

      // Withdrawal logic: Withdraw if horse is too valuable to lose or health is poor
      const rating = calculateOverallRating(horse);
      const estValue = rating * 1000;

      // Withdraw if value significantly exceeds claiming price (and personality is not reckless)
      const valueRatio = estValue / race.claimingPrice;
      const withdrawThreshold = personality.riskTolerance < 0.3 ? 1.2 : 1.5;

      if (valueRatio > withdrawThreshold || horse.healthStatus !== "healthy") {
        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 70,
          type: "withdraw_claiming",
          raceId: race.id,
          horseId: horse.id,
        });
      }
    }
  }

  return intents;
}
