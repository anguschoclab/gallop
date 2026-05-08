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
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";

/**
 * Generate all NPC intents for the day
 */
export function generateNpcIntents(state: GameState, day: number): AnyIntent[] {
  const intents: AnyIntent[] = [];

  // Index horses by stable for fast lookup
  const horseMap = new Map(state.horses.map(h => [h.id, h]));
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
  const upcomingRaces = state.races.filter(r => !r.resolved && r.day >= day && r.day <= day + 7);
  
  const racesByRegion = new Map<string, Race[]>();
  const globalGradedRaces: Race[] = [];
  
  for (const race of upcomingRaces) {
    const region = race.graded ? (race.graded.country || 'Other') : 'Other';
    if (!racesByRegion.has(region)) racesByRegion.set(region, []);
    racesByRegion.get(region)!.push(race);
    
    if (race.graded) {
      globalGradedRaces.push(race);
    }
  }

  // Pre-index entries for faster lookup in loops
  const raceEntrySets = new Map<string, Set<string>>();
  for (const race of upcomingRaces) {
    raceEntrySets.set(race.id, new Set(race.entries.map(e => e.horseId)));
  }

  // Generate intents for each NPC stable
  for (const stable of state.npcStables) {
    const ownedHorses = horsesByStable.get(stable.id) || [];
    
    // Only check races in the stable's country, plus any Graded races (which are "global")
    const stableRegion = stable.country || 'Other';
    const relevantRaces = [
      ...(racesByRegion.get(stableRegion) || []),
      ...globalGradedRaces.filter(r => r.graded?.country !== stableRegion)
    ];

    intents.push(...generateNpcTrainingIntents(state, stable, day, ownedHorses, activePregnanciesByDam));
    intents.push(...generateNpcRaceEntryIntents(state, stable, day, ownedHorses, relevantRaces, raceEntrySets));
    intents.push(...generateNpcBreedingIntents(state, stable, day, ownedHorses, activePregnanciesByDam));
    intents.push(...generateNpcClaimingIntents(state, stable, day, relevantRaces, horseMap));
    intents.push(...generateNpcWithdrawalIntents(state, stable, day, ownedHorses, relevantRaces, horseMap));
  }

  return intents;
}


/**
 * Generate training intents for an NPC stable
 */
function generateNpcTrainingIntents(
  state: GameState,
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
  activePregnanciesByDam: Set<string>,
): TrainingIntent[] {
  const intents: TrainingIntent[] = [];


  // Skip AI state management for now to avoid stack overflow
  // TODO: Re-enable AI state once serialization issues are resolved

  // Create training AI state
  const trainingAI = createTrainingAIState(stable);

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
  day: number,
  upcomingRaces: Race[],
  horseMap: Map<string, Horse>,
): ClaimingIntent[] {
  const intents: ClaimingIntent[] = [];


  // Create claiming AI state
  const claimingAI = createClaimingAIState(stable);

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
  day: number,
  ownedHorses: Horse[],
  upcomingRaces: Race[],
): WithdrawFromClaimingIntent[] {
  const intents: WithdrawFromClaimingIntent[] = [];
  const personality = PERSONALITY_CONFIG[stable.personality];


  for (const race of upcomingRaces) {
    // Skip if not an optional claiming race
    if (race.raceClass !== "OptionalClaiming" && race.raceClass !== "MaidenOptionalClaiming")
      continue;

    // Personality-based withdrawal propensity
    const withdrawalPropensity =
      stable.personality === "conservative"
        ? 0.7
        : stable.personality === "developer"
          ? 0.6
          : stable.personality === "breeder"
            ? 0.5
            : 0.2;

    for (const entry of race.entries) {
      const horse = horseMap.get(entry.horseId);

      if (!horse) continue;
      if (horse.stableId !== stable.id) continue; // Only own horses
      if (entry.withdrawnFromClaiming) continue; // Already withdrawn

      // Random check based on personality
      if (Math.random() > withdrawalPropensity) continue;

      // Check horse value vs claiming price
      const overall = calculateOverallRating(horse);
      const estimatedValue = overall * 1000;

      // Withdraw if horse is significantly undervalued
      if (estimatedValue > race.claimingPrice! * 1.3) {
        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 70,
          type: "withdraw_from_claiming",
          raceId: race.id,
          horseId: horse.id,
        });
      }
    }
  }

  return intents;
}
