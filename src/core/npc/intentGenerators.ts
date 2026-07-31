/**
 * npc/intentGenerators.ts - NPC intent generators
 *
 * This file provides intent generation for NPC stables during the intent
 * collection phase, including training, race entry, breeding, claiming,
 * and withdrawal intents.
 *
 * Dependencies: @/core/resolver/intents (intent types), @/game/types (GameState, Horse, Race, Stable), @/game/uuid (generateUUID), @/core/stable/stableConfig (PERSONALITY_CONFIG), @/game/claiming (isHorseEligibleForClaimingPrice), @/core/horse/stats (calculateOverallRating), @/core/ai/trainingAI (training AI functions), @/core/ai/claimingAI (claiming AI functions), @/core/ai/raceEntryAI (race entry AI functions), @/core/ai/npcCycleAI (NpcAIManager functions)
 * Related files: npcCycle.ts (uses intents)
 */

// NPC Intent Generators
// Generates intents for NPC stables during the intent collection phase

import type {
  AnyIntent,
  TrainingIntent,
  RaceEntryIntent,
  BreedingIntent,
  ClaimingIntent,
  WithdrawFromClaimingIntent,
  GeldingIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  DiplomaticActionIntent,
  CartelActionIntent,
} from "@/core/resolver/intents";
import type { GameState, Horse, Race, Stable, Jockey } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { isHorseEligibleForClaimingPrice } from "@/core/market/claiming";
import { calculateOverallRating } from "@/core/horse/stats";
import { getAvailableTrainingTypes } from "@/core/facilities";
import {
  createTrainingAIState,
  selectTrainingType,
  shouldTrainToday,
  updateHorseTraining,
  recordTrainingOutcome,
} from "@/core/ai/trainingAI";
import { createRaceEntryAIState, calculateStrategicEntryScore } from "@/core/ai/raceEntryAI";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import {
  createClaimingAIState,
  shouldClaimHorse,
  recordClaimingDecision,
  recordClaimingOutcome,
} from "@/core/ai/claimingAI";
import {
  createWithdrawalAIState,
  shouldWithdrawHorse,
  recordWithdrawalDecision,
} from "@/core/ai/withdrawalAI";
import { createGeldingAIState, shouldGeldHorse } from "@/core/ai/geldingAI";
import {
  shouldCreateSyndicate,
  calculateSharePurchase,
  calculateShareSale,
  calculateSharePrice,
} from "@/core/ai/syndicationAI";
import {
  getOrCreateStableAIState,
  updateStableAIState,
  type NpcAIManager,
  type StableAIState,
} from "@/core/ai/npcCycleAI";
import {
  assessWorldState,
  generateStrategicDirectives,
  allocateBudget,
  coordinateSubsystems,
  type WorldAssessment,
  type StrategicDirective,
  type BudgetAllocation,
  type SubsystemWeights,
} from "@/core/ai/strategicCoordinator";
import { calculateOptimalTactics, createJockeyStrategyAIState } from "@/core/ai/jockeyStrategyAI";

/**
 * Generate all NPC intents for the day.
 *
 * Generates intent objects for all NPC stables including breeding, race entries,
 * claiming, auction participation, and facility upgrades based on AI state and
 * current game conditions.
 *
 * @param state - Current game state
 * @param day - Current game day
 * @returns Array of intent objects for all NPC actions
 */
export function generateNpcIntents(state: GameState, day: number): AnyIntent[] {
  const intents: AnyIntent[] = [];
  const aiManager = state.npcAIManager;

  // Cross-System Coordination: assess world state once per cycle
  const worldAssessment: WorldAssessment | undefined = aiManager
    ? assessWorldState(state, aiManager)
    : undefined;

  // Index horses by stable for fast lookup
  const horseMap = new Map(Object.entries(state.horses));
  const horsesByStable = new Map<string, Horse[]>();
  for (const horse of Object.values(state.horses)) {
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
  const upcomingRaces = Object.values(state.races).filter(
    (r) => !r.resolved && r.day >= day && r.day <= day + 7,
  );

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
    raceEntrySets.set(race.id, new Set(race.entries.map((e: { horseId: string }) => e.horseId)));
  }

  // Generate intents for each NPC stable
  for (const stable of state.npcStables) {
    try {
      const ownedHorses = horsesByStable.get(stable.id) || [];

      // Get or create AI state for this stable
      let stableAI = aiManager ? getOrCreateStableAIState(aiManager, stable, day) : undefined;

      // Cross-System Coordination: generate directives, allocate budget, coordinate subsystems
      if (aiManager && stableAI && worldAssessment) {
        const directives = generateStrategicDirectives(stable, worldAssessment, stable.personality);
        const budget = allocateBudget(stable, directives);
        const _weights = coordinateSubsystems(directives, budget);

        // Store coordination results on stableAI state
        stableAI = {
          ...stableAI,
          strategicDirectives: directives,
          budgetAllocation: budget,
          worldAssessment,
        };
      }

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
          horseMap,
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
      intents.push(...generateNpcGeldingIntents(state, stable, stableAI, day, ownedHorses));
      intents.push(...generateNpcSyndicateIntents(state, stable, day, ownedHorses));
      intents.push(...generateNpcDiplomaticIntents(state, stable, stableAI, day, aiManager));

      // Update stable AI state in the manager (immutable update)
      if (aiManager && stableAI) {
        const updatedState = updateStableAIState(stableAI, day);
        aiManager.stableStates = {
          ...aiManager.stableStates,
          [stable.id]: updatedState,
        };
      }
    } catch (err) {
      console.warn("Failed to generate intents for NPC", stable.id, err);
      continue;
    }
  }

  return intents;
}

/**
 * Generate training intents for an NPC stable
 *
 * @param state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param ownedHorses - Horses owned by the stable
 * @param activePregnanciesByDam - Set of IDs for horses that are currently pregnant
 * @returns Array of training intents
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
  const trainingAI = stableAI?.trainingAI ?? createTrainingAIState(stable);

  const stableFacilities = state.npcFacilities?.[stable.id];
  const availableTypes = stableFacilities
    ? getAvailableTrainingTypes(stableFacilities)
    : ["speed", "stamina", "acceleration", "rest"];

  for (const horse of ownedHorses) {
    // AI-driven training decision
    if (horse.energy >= 15 && !activePregnanciesByDam.has(horse.id)) {
      // Use AI to determine if horse should train today
      if (shouldTrainToday(trainingAI, horse, day)) {
        // Use AI to select training type
        const trainingType = selectTrainingType(trainingAI, horse, day, availableTypes);

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
 *
 * @param state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param ownedHorses - Horses owned by the stable
 * @param upcomingRaces - Array of upcoming races to consider
 * @param raceEntrySets - Map of race IDs to sets of horse IDs already entered
 * @param horseMap - Map of all horses for competitor quality analysis
 * @returns Array of race entry intents
 */
function generateNpcRaceEntryIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  upcomingRaces: Race[],
  raceEntrySets: Map<string, Set<string>>,
  horseMap: Map<string, Horse>,
): RaceEntryIntent[] {
  const intents: RaceEntryIntent[] = [];

  // Use persisted AI state if available, otherwise fallback to temporary state
  const raceEntryAI = stableAI?.raceEntryAI ?? createRaceEntryAIState(stable);

  // Initialize jockey strategy AI if not present
  const jockeyStrategyAI = stableAI?.jockeyStrategyAI ?? createJockeyStrategyAIState(stable);

  // Create a jockey map for tactics calculation (use first available jockey for now)
  const jockeyMap = new Map((state.jockeys || []).map((j) => [j.id, j]));

  for (const race of upcomingRaces) {
    const entrySet = raceEntrySets.get(race.id);
    for (const horse of ownedHorses) {
      // Skip if already entered
      if (entrySet && entrySet.has(horse.id)) continue;

      // Skip invite-only races for uninvited horses (unless Win-and-You're-In)
      if (race.graded?.requiresInvitation) {
        const invitedIds = race.invitedHorseIds ?? race.graded.invitedHorseIds ?? [];
        const isInvited = invitedIds.includes(horse.id);
        const currentYear = Math.floor((day - 1) / 365) + 1;
        const isWinAndYouIn =
          race.graded.key &&
          horse.winAndYouInQualified?.some(
            (q) => q.raceKey === race.graded!.key && q.year === currentYear,
          );
        if (!isInvited && !isWinAndYouIn) continue;
      }

      // Use AI to determine suitability
      const suitability = calculateStrategicEntryScore(
        raceEntryAI,
        horse,
        race,
        stable,
        day,
        horseMap,
      );

      // Diplomacy-aware: if in a racing coalition and ally already entered this race,
      // raise the threshold to reduce internal competition
      let threshold = 60;
      if (stableAI?.npcRelationships) {
        for (const entry of race.entries) {
          const otherHorse = horseMap.get(entry.horseId);
          if (!otherHorse?.stableId || otherHorse.stableId === stable.id) continue;
          const rel = stableAI.npcRelationships[otherHorse.stableId];
          if (rel?.allianceType === "racing_coalition") {
            threshold = 70; // Higher bar to avoid splitting coalition votes
            break;
          }
        }
      }

      if (suitability > threshold) {
        // Calculate optimal jockey instructions for this horse in this race
        // Prefer a jockey contracted to this stable, fall back to any available
        const allJockeys = state.jockeys || [];
        const jockey = allJockeys.find((j) => j.stableId === stable.id) || allJockeys[0];
        if (!jockey) continue;
        const jockeyInstructions = calculateOptimalTactics(
          jockeyStrategyAI,
          horse,
          race,
          jockey,
          stable,
        );

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
          jockeyInstructions,
        });
      }
    }
  }

  return intents;
}

/**
 * Generate breeding intents for an NPC stable
 *
 * @param state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param ownedHorses - Horses owned by the stable
 * @param activePregnanciesByDam - Set of IDs for horses that are currently pregnant
 * @returns Array of breeding intents (currently empty as breeding is handled elsewhere)
 */
function generateNpcBreedingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  activePregnanciesByDam: Set<string>,
): BreedingIntent[] {
  // Breeding is now handled entirely by the autonomous npcBreedingPhase
  // at the start of the breeding season.
  return [];
}

/**
 * Generate claiming intents for an NPC stable
 *
 * @param state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param upcomingRaces - Array of upcoming races to consider
 * @param horseMap - Map of all horses for fast lookup
 * @returns Array of claiming intents
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
  let claimingAI = stableAI?.claimingAI ?? createClaimingAIState(stable);

  for (const race of upcomingRaces) {
    // Skip if not a claiming race
    if (!race.claimingPrice) continue;

    for (const entry of race.entries) {
      const horse = horseMap.get(entry.horseId);

      if (!horse) continue;
      if (horse.stableId === stable.id) continue; // Don't claim own horses

      // Diplomacy-aware: don't claim horses from allied stables
      if (horse.stableId && stableAI?.npcRelationships?.[horse.stableId]) {
        const rel = stableAI.npcRelationships[horse.stableId];
        if (
          rel.allianceType === "breeding_partnership" ||
          rel.allianceType === "racing_coalition"
        ) {
          continue; // Don't claim ally's horses
        }
      }

      // Use AI to determine if should claim
      const friction = stableAI?.friction ?? 0;
      if (shouldClaimHorse(claimingAI, horse, race, stable, day, friction)) {
        // Check horse eligibility
        if (
          !isHorseEligibleForClaimingPrice(horse, race.claimingPrice, Object.values(state.horses))
        )
          continue;

        // Record claiming decision for learning
        claimingAI = recordClaimingDecision(claimingAI, horse, race, stable, day);

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
 *
 * @param state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param ownedHorses - Horses owned by the stable
 * @param upcomingRaces - Array of upcoming races to consider
 * @param horseMap - Map of all horses for fast lookup
 * @returns Array of withdrawal intents
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

  // Use persisted AI state if available, otherwise fallback to temporary state
  let withdrawalAI =
    stableAI?.withdrawalAI ||
    (stableAI
      ? (stableAI.withdrawalAI = createWithdrawalAIState(stable))
      : createWithdrawalAIState(stable));

  for (const race of upcomingRaces) {
    // Skip if not a claiming race
    if (!race.claimingPrice) continue;

    for (const entry of race.entries) {
      if (entry.stableId !== stable.id) continue;

      const horse = horseMap.get(entry.horseId);
      if (!horse) continue;

      // Use AI to determine if horse should be withdrawn from claiming
      const { shouldWithdraw, reason } = shouldWithdrawHorse(
        withdrawalAI,
        horse,
        race,
        stable,
        day,
      );

      if (shouldWithdraw) {
        // Record the decision
        withdrawalAI = recordWithdrawalDecision(
          withdrawalAI,
          horse,
          race,
          stable,
          true,
          reason || "risk_assessment",
          day,
        );

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

/**
 * Generate gelding intents for an NPC stable
 *
 * @param state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param ownedHorses - Horses owned by the stable
 * @returns Array of gelding intents
 */
function generateNpcGeldingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
): GeldingIntent[] {
  const intents: GeldingIntent[] = [];

  // Use persisted AI state if available, otherwise fallback to temporary state
  const geldingAI =
    stableAI?.geldingAI ||
    (stableAI ? (stableAI.geldingAI = createGeldingAIState(stable)) : createGeldingAIState(stable));

  for (const horse of ownedHorses) {
    if (shouldGeldHorse(geldingAI, horse, day)) {
      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 50,
        type: "gelding",
        horseId: horse.id,
      });
    }
  }

  return intents;
}

/**
 * Generate syndicate-related intents for an NPC stable:
 * - Create syndicates for eligible G1-winning stallions.
 * - Sell shares in existing syndicates when overvalued / declining / cash-poor.
 * - Opportunistically buy shares in other stables' syndicates.
 *
 * Runs weekly (day % 7 === stable-hash) to avoid daily spam.
 * @param state The current game state.
 * @param stable The NPC stable.
 * @param day The current game day.
 * @param ownedHorses The list of horses owned by the NPC stable.
 */
function generateNpcSyndicateIntents(
  state: GameState,
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
): AnyIntent[] {
  const intents: AnyIntent[] = [];
  const syndicates = state.syndicates || {};

  // Weekly cadence, staggered per stable to spread activity.
  const stableHash = stable.id.split("").reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
  if ((day + stableHash) % 7 !== 0) return intents;

  // 1) Create syndicates for eligible stallions.
  for (const horse of ownedHorses) {
    if (shouldCreateSyndicate(stable, horse, syndicates)) {
      const totalShares = 40;
      const sharePrice = Math.max(
        1000,
        Math.round(
          calculateSharePrice(
            {
              id: `syndicate_${horse.id}`,
              stallionId: horse.id,
              stallionName: horse.name,
              totalShares,
              shareHolders: {},
              sharePrice: 0,
              studFee: horse.stud?.standingFee || 0,
              isPublic: true,
              lifetimeEarnings: 0,
            },
            horse,
          ),
        ),
      );
      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        day,
        priority: 40,
        type: "syndicate_creation",
        stallionId: horse.id,
        totalShares,
        sharePrice,
        // Owner keeps a controlling initial stake (60%).
        initialShareholders: { [stable.id]: Math.floor(totalShares * 0.6) },
      };
      intents.push(intent);
    }
  }

  // 2) Sell / 3) Buy shares in existing syndicates.
  for (const syndicate of Object.values(syndicates)) {
    const stallion = state.horses[syndicate.stallionId];
    if (!stallion) continue;

    // Sell
    const sellCount = calculateShareSale(stable, syndicate, stallion);
    if (sellCount > 0) {
      const price = calculateSharePrice(syndicate, stallion);
      const saleIntent: ShareSaleIntent = {
        id: generateUUID(),
        entityId: syndicate.id,
        source: "npc",
        day,
        priority: 40,
        type: "share_sale",
        syndicateId: syndicate.id,
        sellerStableId: stable.id,
        shares: sellCount,
        pricePerShare: price,
      };
      intents.push(saleIntent);
      continue; // Don't buy the same syndicate on the same tick.
    }

    // Buy (only in stallions the NPC doesn't own, to keep syndication interesting).
    if (stallion.stableId === stable.id) continue;
    const buyCount = calculateSharePurchase(stable, syndicate, stallion);
    if (buyCount > 0) {
      const price = calculateSharePrice(syndicate, stallion);
      const purchaseIntent: SharePurchaseIntent = {
        id: generateUUID(),
        entityId: syndicate.id,
        source: "npc",
        day,
        priority: 40,
        type: "share_purchase",
        syndicateId: syndicate.id,
        buyerStableId: stable.id,
        shares: buyCount,
        pricePerShare: price,
      };
      intents.push(purchaseIntent);
    }
  }

  return intents;
}

/**
 * Generate diplomatic and cartel intents for an NPC stable.
 *
 * Evaluates relationships with other NPC stables and generates:
 * - Alliance proposals when trust is high and no alliance exists
 * - Alliance breaks when trust drops below threshold
 * - Cartel actions when economic conditions are favorable
 *
 * Runs on a weekly cadence (day % 7) staggered per stable to avoid daily spam.
 *
 * @param _state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param aiManager - Current NPC AI manager
 * @returns Array of diplomatic and cartel intents
 */
function generateNpcDiplomaticIntents(
  _state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  aiManager: NpcAIManager | undefined,
): AnyIntent[] {
  const intents: AnyIntent[] = [];
  if (!stableAI?.npcRelationships || !aiManager) return intents;

  // Weekly cadence, staggered per stable
  const stableHash = stable.id.split("").reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
  if ((day + stableHash) % 7 !== 0) return intents;

  for (const [otherStableId, rel] of Object.entries(stableAI.npcRelationships)) {
    // Propose alliance when trust is high and no alliance exists
    if (rel.trust >= 70 && !rel.allianceType) {
      const allianceType: DiplomaticActionIntent["allianceType"] =
        stable.personality === "breeder" || stable.personality === "developer"
          ? "breeding_partnership"
          : stable.personality === "trader"
            ? "economic_cartel"
            : stable.personality === "aggressive"
              ? "racing_coalition"
              : "non_aggression";

      intents.push({
        id: generateUUID(),
        entityId: stable.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 30,
        type: "diplomatic_action",
        targetStableId: otherStableId,
        action: "propose_alliance",
        allianceType,
      } as DiplomaticActionIntent);
    }

    // Break alliance when trust drops below 20
    if (rel.allianceType && rel.trust < 20) {
      intents.push({
        id: generateUUID(),
        entityId: stable.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 60,
        type: "diplomatic_action",
        targetStableId: otherStableId,
        action: "break_alliance",
      } as DiplomaticActionIntent);
    }
  }

  // Cartel action: evaluate cartel opportunity with high-trust partners
  const highTrustIds = Object.entries(stableAI.npcRelationships)
    .filter(([, rel]) => rel.trust >= 60 && !rel.allianceType)
    .map(([id]) => id);

  if (highTrustIds.length >= 1) {
    intents.push({
      id: generateUUID(),
      entityId: stable.id,
      source: "npc",
      sourceId: stable.id,
      day,
      priority: 25,
      type: "cartel_action",
      action: "join_cartel",
      targetStableIds: highTrustIds.slice(0, 2),
      marketAction: "avoid_bidding_war",
    } as CartelActionIntent);
  }

  return intents;
}
