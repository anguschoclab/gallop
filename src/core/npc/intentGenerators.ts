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
import { PERSONALITY_CONFIG } from "@/game/npcStables";
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

  // Generate training intents for each NPC stable
  for (const stable of state.npcStables) {
    intents.push(...generateNpcTrainingIntents(state, stable, day));
    intents.push(...generateNpcRaceEntryIntents(state, stable, day));
    intents.push(...generateNpcBreedingIntents(state, stable, day));
    // NPC auction bidding lives in auctionRunner / resolveAuctionSale, not the
    // intent pipeline — auctions are theatrical and resolve in their own pass.
    intents.push(...generateNpcClaimingIntents(state, stable, day));
    intents.push(...generateNpcWithdrawalIntents(state, stable, day));
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
): TrainingIntent[] {
  const intents: TrainingIntent[] = [];
  const ownedHorses = state.horses.filter((h) => h.stableId === stable.id);

  // Get or create training AI state for this stable
  const aiManager: NpcAIManager = (state as any).npcAIManager || {
    stableStates: new Map(),
    globalDay: day,
  };
  let stableAIState = aiManager.stableStates.get(stable.id);
  if (!stableAIState) {
    stableAIState = {
      stableId: stable.id,
      personalityState: { personality: stable.personality } as any,
      learningState: { outcomes: [], successRates: new Map(), patterns: new Map(), lastUpdate: 0 },
      lastUpdateDay: day,
    };
  }

  // Create training AI state
  const trainingAI = createTrainingAIState(stable);

  for (const horse of ownedHorses) {
    // AI-driven training decision
    if (
      horse.energy >= 15 &&
      !state.pregnancies.some((p) => !p.resolved && p.damId === horse.id)
    ) {
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
): RaceEntryIntent[] {
  const intents: RaceEntryIntent[] = [];
  const ownedHorses = state.horses.filter((h) => h.stableId === stable.id);
  const upcomingRaces = state.races.filter((r) => !r.resolved && r.day >= day && r.day <= day + 7);

  for (const race of upcomingRaces) {
    for (const horse of ownedHorses) {
      // Simple logic: enter if horse is eligible and has energy
      if (horse.energy >= 40 && !race.entries.some((e) => e.horseId === horse.id)) {
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
): BreedingIntent[] {
  const intents: BreedingIntent[] = [];
  const ownedHorses = state.horses.filter((h) => h.stableId === stable.id);

  // Find eligible mares and stallions
  const mares = ownedHorses.filter((h) => h.gender === "mare" && h.age >= 3 && h.age <= 15);
  const stallions = ownedHorses.filter(
    (h) => (h.gender === "horse" || h.gender === "gelding") && h.stud?.atStud,
  );

  for (const mare of mares) {
    // Skip if already pregnant
    if (state.pregnancies.some((p) => !p.resolved && p.damId === mare.id)) continue;

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
): ClaimingIntent[] {
  const intents: ClaimingIntent[] = [];
  const upcomingRaces = state.races.filter((r) => !r.resolved && r.day >= day && r.day <= day + 7);

  // Create claiming AI state
  const claimingAI = createClaimingAIState(stable);

  for (const race of upcomingRaces) {
    // Skip if not a claiming race
    if (!race.claimingPrice) continue;

    for (const entry of race.entries) {
      const horse = state.horses.find((h) => h.id === entry.horseId);
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
): WithdrawFromClaimingIntent[] {
  const intents: WithdrawFromClaimingIntent[] = [];
  const personality = PERSONALITY_CONFIG[stable.personality];
  const upcomingRaces = state.races.filter((r) => !r.resolved && r.day >= day && r.day <= day + 7);

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
      const horse = state.horses.find((h) => h.id === entry.horseId);
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
