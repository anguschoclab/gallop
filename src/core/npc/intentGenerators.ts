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
  ClaimingIntent,
  WithdrawFromClaimingIntent,
  GeldingIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  DiplomaticActionIntent,
  CartelActionIntent,
  ConsignmentIntent,
  UpdateStudFeeIntent,
  TransportIntent,
  FacilityUpgradeIntent,
} from "@/core/resolver/intents";
import type { GameState, Horse, Race, Stable, Jockey, AuctionSale } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { isHorseEligibleForClaimingPrice } from "@/core/market/claiming";
import { calculateOverallRating } from "@/core/horse/stats";
import {
  getAvailableTrainingTypes,
  FACILITY_UPGRADE_COSTS,
  type FacilityType,
  type FacilityLevel,
  type PlayerFacilities,
} from "@/core/facilities";
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
  type DifficultyState,
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
import {
  calculateOptimalTactics,
  createJockeyStrategyAIState,
  applyAffinityBoost,
} from "@/core/ai/jockeyStrategyAI";
import { createAuctionAIState, shouldConsignHorse } from "@/core/ai/auctionAI";
import type { DistressLevel } from "@/core/ai/financialDistressAI";
import {
  STUD_FEE_REDUCTION_MULTIPLIER,
  STUD_FEE_MINIMUM,
  STUD_FEE_INTENT_PRIORITY,
  PRESTIGE_STUD_FEE_RESISTANCE,
  TRADER_STUD_FEE_AGGRESSION,
  TRAINING_CAUTION_MIN_ENERGY,
} from "@/constants/financialDistressConstants";
import { MEDIUM_PURSE_THRESHOLD } from "@/constants";
import {
  HORSE_RATING_TO_VALUE_MULTIPLIER,
  CONSIGNMENT_INTENT_PRIORITY,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "@/constants/aiConstants";
import { generateDirectiveChangeNews } from "@/services/narrative/directiveNewsGenerator";
import type { NewsItem } from "@/services/narrative/newsTypes";

/**
 * Generate all NPC intents for the day.
 *
 * Generates intent objects for all NPC stables including breeding, race entries,
 * claiming, auction participation, and facility upgrades based on AI state and
 * current game conditions.
 *
 * @param state - Current game state
 * @param day - Current game day
 * @param cachedWorldAssessment - Optional pre-computed world assessment from worldAssessmentPhase
 * @returns Array of intent objects for all NPC actions
 */
export function generateNpcIntents(
  state: GameState,
  day: number,
  cachedWorldAssessment?: WorldAssessment,
): AnyIntent[] {
  const intents: AnyIntent[] = [];
  const aiManager = state.npcAIManager;

  // Cross-System Coordination: use cached world assessment if available, otherwise compute
  const worldAssessment: WorldAssessment | undefined =
    cachedWorldAssessment ?? (aiManager ? assessWorldState(state, aiManager) : undefined);

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
    (r) => !r.resolved && !r.cancelled && r.day >= day && r.day <= day + 7,
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
        const financialDistress = stableAI.financialDistress;
        const oldDirectives = stableAI.strategicDirectives;
        const directives = generateStrategicDirectives(
          stable,
          worldAssessment,
          stable.personality,
          financialDistress,
        );

        // Smart notification: generate news if top directive changed
        const directiveNews = generateDirectiveChangeNews(stable, oldDirectives, directives, day);
        if (directiveNews) {
          if (!aiManager.pendingNewsItems) aiManager.pendingNewsItems = [];
          aiManager.pendingNewsItems.push(directiveNews);
        }

        const budget = allocateBudget(stable, directives);
        const weights = coordinateSubsystems(directives, budget);

        // Store coordination results on stableAI state
        // Facilities budget is tracked for future facility upgrade decisions
        const facilitiesBudget = stableAI?.budgetAllocation?.facilities ?? budget.facilities;
        stableAI = {
          ...stableAI,
          strategicDirectives: directives,
          budgetAllocation: { ...budget, facilities: facilitiesBudget },
          subsystemWeights: weights,
          worldAssessment,
        };
      }

      // Only check races in the stable's country, plus any Graded races (which are "global")
      const stableRegion = stable.country || "Other";
      const relevantRaces = [
        ...(racesByRegion.get(stableRegion) || []),
        ...globalGradedRaces.filter((r) => r.graded?.country !== stableRegion),
      ];

      const weights = stableAI?.subsystemWeights;
      const distressLevel = stableAI?.financialDistress?.level ?? "healthy";

      // Training intents (distress reduces training for low-energy horses)
      intents.push(
        ...generateNpcTrainingIntents(
          state,
          stable,
          stableAI,
          day,
          ownedHorses,
          activePregnanciesByDam,
          weights?.training,
          distressLevel,
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
          weights?.raceEntry,
          distressLevel,
          aiManager?.difficultyModulator,
        ),
      );

      // Block claiming when in financial distress
      if (distressLevel === "healthy") {
        intents.push(
          ...generateNpcClaimingIntents(
            state,
            stable,
            stableAI,
            day,
            relevantRaces,
            horseMap,
            weights?.claiming,
          ),
        );
      }
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
      intents.push(
        ...generateNpcGeldingIntents(state, stable, stableAI, day, ownedHorses, weights?.breeding),
      );

      // Syndicate intents: bypass weekly cadence when in distress
      intents.push(...generateNpcSyndicateIntents(state, stable, day, ownedHorses, distressLevel));

      // Diplomatic intents: skip entirely when in distress
      if (distressLevel === "healthy") {
        intents.push(...generateNpcDiplomaticIntents(state, stable, stableAI, day, aiManager));
      }

      // Auction consignment intents: bypass weekly cadence when in distress
      intents.push(
        ...generateNpcAuctionIntents(
          state,
          stable,
          stableAI,
          day,
          ownedHorses,
          state.auctions ?? [],
          weights?.auction,
          distressLevel,
        ),
      );

      // Stud fee intents: generate when in distress to reduce fees
      if (distressLevel !== "healthy") {
        intents.push(...generateNpcStudFeeIntents(stable, day, ownedHorses, distressLevel));
      }

      // Transport intents: move horses between outposts for regional racing advantage
      if (stable.outposts && stable.outposts.length > 1) {
        intents.push(...generateNpcTransportIntents(stable, day, ownedHorses));
      }

      // Facility upgrade intents: upgrade facilities when budget allows
      intents.push(
        ...generateNpcFacilityUpgradeIntents(stable, stableAI, day, state.npcFacilities),
      );

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
 * @param trainingWeight - Subsystem weight that modulates training willingness
 * @param distressLevel - Current financial distress level (defaults to healthy)
 * @returns Array of training intents
 */
function generateNpcTrainingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  activePregnanciesByDam: Set<string>,
  trainingWeight = 1.0,
  distressLevel: DistressLevel = "healthy",
): TrainingIntent[] {
  const intents: TrainingIntent[] = [];

  // Critical distress: skip all training intents
  if (distressLevel === "critical") return intents;

  // Use persisted AI state if available, otherwise fallback to temporary state
  const trainingAI = stableAI?.trainingAI ?? createTrainingAIState(stable);

  // Budget enforcement: cap training sessions based on training budget
  const trainingBudget = stableAI?.budgetAllocation?.training;
  const trainingCostPerSession = 500; // approximate cost per training session
  let cumulativeTrainingSpend = 0;

  const stableFacilities = state.npcFacilities?.[stable.id];
  const availableTypes = stableFacilities
    ? getAvailableTrainingTypes(stableFacilities)
    : ["speed", "stamina", "acceleration", "rest"];

  for (const horse of ownedHorses) {
    // Distress-aware: at caution+, skip training for low-energy horses
    const minEnergy = distressLevel === "healthy" ? 15 : TRAINING_CAUTION_MIN_ENERGY;
    if (horse.energy >= minEnergy && !activePregnanciesByDam.has(horse.id)) {
      // At emergency, only allow rest training
      if (distressLevel === "emergency") {
        if (!shouldTrainToday(trainingAI, horse, day, trainingWeight)) continue;
        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50,
          type: "training",
          horseId: horse.id,
          trainingType: "rest",
        });
        continue;
      }

      // Use AI to determine if horse should train today
      if (shouldTrainToday(trainingAI, horse, day, trainingWeight)) {
        // Use AI to select training type
        const trainingType = selectTrainingType(trainingAI, horse, day, availableTypes);

        // Budget enforcement: skip if budget exhausted (but allow at least one)
        if (trainingBudget !== undefined && trainingBudget <= 0 && cumulativeTrainingSpend > 0) {
          continue;
        }
        cumulativeTrainingSpend += trainingCostPerSession;

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
 * @param raceEntryWeight - Subsystem weight that modulates race entry willingness
 * @param distressLevel - Current financial distress level (defaults to healthy)
 * @param difficultyModulator - Optional difficulty state that adjusts NPC competence
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
  raceEntryWeight = 1.0,
  distressLevel: DistressLevel = "healthy",
  difficultyModulator?: DifficultyState,
): RaceEntryIntent[] {
  const intents: RaceEntryIntent[] = [];

  // Use persisted AI state if available, otherwise fallback to temporary state
  const raceEntryAI = stableAI?.raceEntryAI ?? createRaceEntryAIState(stable);

  // Initialize jockey strategy AI if not present
  const jockeyStrategyAI = stableAI?.jockeyStrategyAI ?? createJockeyStrategyAIState(stable);

  // Create a jockey map for tactics calculation (use first available jockey for now)
  const jockeyMap = new Map((state.jockeys || []).map((j) => [j.id, j]));

  for (const race of upcomingRaces) {
    // At critical distress, skip low-purse races to focus on earnings
    if (distressLevel === "critical" && race.purse < MEDIUM_PURSE_THRESHOLD) continue;

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

      // Apply subsystem weight: higher weight lowers threshold (more willing to enter)
      threshold /= raceEntryWeight;

      // Difficulty modulator: higher NPC competence raises threshold (more selective)
      if (difficultyModulator) {
        threshold *= difficultyModulator.npcCompetenceMultiplier;
      }

      if (suitability > threshold) {
        // Calculate optimal jockey instructions for this horse in this race
        // Prefer a jockey contracted to this stable, fall back to any available
        const allJockeys = state.jockeys || [];
        const jockey = allJockeys.find((j) => j.stableId === stable.id) || allJockeys[0];
        if (!jockey) continue;
        const jockeyInstructions = applyAffinityBoost(
          calculateOptimalTactics(jockeyStrategyAI, horse, race, jockey, stable),
          jockey,
          horse.id,
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
 * Generate claiming intents for an NPC stable
 *
 * @param state - Current game state
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param upcomingRaces - Array of upcoming races to consider
 * @param horseMap - Map of all horses for fast lookup
 * @param claimingWeight - Subsystem weight that modulates claiming willingness
 * @returns Array of claiming intents
 */
function generateNpcClaimingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  upcomingRaces: Race[],
  horseMap: Map<string, Horse>,
  claimingWeight = 1.0,
): ClaimingIntent[] {
  const intents: ClaimingIntent[] = [];

  // Use persisted AI state if available, otherwise fallback to temporary state
  let claimingAI = stableAI?.claimingAI ?? createClaimingAIState(stable);

  // Budget enforcement: track cumulative claiming spend
  const claimingBudget = stableAI?.budgetAllocation?.claiming;
  let cumulativeClaimSpend = 0;

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

      // Budget enforcement: skip if cumulative spend exceeds claiming budget
      if (claimingBudget !== undefined && claimingBudget <= 0) continue;
      if (
        claimingBudget !== undefined &&
        cumulativeClaimSpend + race.claimingPrice > claimingBudget
      ) {
        continue;
      }

      // Use AI to determine if should claim
      const friction = stableAI?.friction ?? 0;
      if (shouldClaimHorse(claimingAI, horse, race, stable, day, friction, claimingWeight)) {
        // Check horse eligibility
        if (
          !isHorseEligibleForClaimingPrice(horse, race.claimingPrice, Object.values(state.horses))
        )
          continue;

        // Record claiming decision for learning
        claimingAI = recordClaimingDecision(claimingAI, horse, race, stable, day);

        // Track cumulative spend
        cumulativeClaimSpend += race.claimingPrice;

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
 * @param breedingWeight - Subsystem weight that modulates gelding decisions
 * @returns Array of gelding intents
 */
function generateNpcGeldingIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  breedingWeight = 1.0,
): GeldingIntent[] {
  const intents: GeldingIntent[] = [];

  // Use persisted AI state if available, otherwise fallback to temporary state
  const geldingAI =
    stableAI?.geldingAI ||
    (stableAI ? (stableAI.geldingAI = createGeldingAIState(stable)) : createGeldingAIState(stable));

  // Budget enforcement: cap breeding-related spending based on breeding budget
  const breedingBudget = stableAI?.budgetAllocation?.breeding;
  const geldingCost = 2000; // approximate cost per gelding procedure
  let cumulativeBreedingSpend = 0;

  for (const horse of ownedHorses) {
    if (shouldGeldHorse(geldingAI, horse, day, breedingWeight)) {
      // Budget enforcement: skip if budget exhausted (but allow at least one)
      if (breedingBudget !== undefined && breedingBudget <= 0 && cumulativeBreedingSpend > 0) {
        continue;
      }
      cumulativeBreedingSpend += geldingCost;

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
 * @param distressLevel Current financial distress level (defaults to healthy).
 */
function generateNpcSyndicateIntents(
  state: GameState,
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
  distressLevel: DistressLevel = "healthy",
): AnyIntent[] {
  const intents: AnyIntent[] = [];
  const syndicates = state.syndicates || {};

  // Weekly cadence, staggered per stable to spread activity.
  // Bypass cadence when in financial distress — run daily.
  if (distressLevel === "healthy") {
    const stableHash = stable.id
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    if ((day + stableHash) % 7 !== 0) return intents;
  }

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
    const sellCount = calculateShareSale(stable, syndicate, stallion, distressLevel);
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

/**
 * Generate auction consignment intents for an NPC stable.
 *
 * Evaluates owned horses for consignment to active auction sales based on
 * the auction AI state, subsystem weight, and weekly cadence.
 *
 * @param _state - Current game state (unused)
 * @param stable - The stable to generate intents for
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param ownedHorses - Horses owned by the stable
 * @param auctions - Active auction sales
 * @param auctionWeight - Subsystem weight that modulates consignment willingness
 * @param distressLevel - Current financial distress level (defaults to healthy)
 * @returns Array of consignment intents
 */
function generateNpcAuctionIntents(
  _state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  auctions: AuctionSale[],
  auctionWeight = DEFAULT_SUBSYSTEM_WEIGHT,
  distressLevel: DistressLevel = "healthy",
): ConsignmentIntent[] {
  const intents: ConsignmentIntent[] = [];

  // Skip if no active auctions or weight is zero
  if (auctions.length === 0 || auctionWeight <= 0) return intents;

  // Weekly cadence, staggered per stable — bypass when in financial distress
  if (distressLevel === "healthy") {
    const stableHash = stable.id
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    if ((day + stableHash) % 7 !== 0) return intents;
  }

  // Get or create auction AI state
  const auctionAI = stableAI?.auctionAI ?? createAuctionAIState(stable);

  // Budget enforcement: cap auction spending based on auctions budget
  const auctionBudget = stableAI?.budgetAllocation?.auctions;
  let cumulativeAuctionSpend = 0;

  // Find active (non-resolved) auctions
  const activeSales = auctions.filter((s) => !s.resolved);
  if (activeSales.length === 0) return intents;

  for (const sale of activeSales) {
    for (const horse of ownedHorses) {
      const result = shouldConsignHorse(
        auctionAI,
        horse,
        stable,
        day,
        auctionWeight,
        distressLevel,
      );
      if (result.shouldConsign) {
        const reservePrice = Math.floor(
          calculateOverallRating(horse) * HORSE_RATING_TO_VALUE_MULTIPLIER,
        );

        // Budget enforcement: skip if budget exhausted (but allow at least one)
        if (auctionBudget !== undefined && auctionBudget <= 0 && cumulativeAuctionSpend > 0) {
          continue;
        }
        cumulativeAuctionSpend += reservePrice;

        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: CONSIGNMENT_INTENT_PRIORITY,
          type: "consignment",
          horseId: horse.id,
          saleId: sale.id,
          reservePrice,
        });
      }
    }
  }

  return intents;
}

/**
 * Generate stud fee reduction intents for an NPC stable in financial distress.
 *
 * Reduces stud fees for owned stallions with active stud careers based on
 * distress level and personality. Only generates intents that reduce fees
 * (never increases).
 *
 * @param stable - The NPC stable
 * @param day - Current game day
 * @param ownedHorses - Horses owned by the stable
 * @param distressLevel - Current financial distress level
 * @returns Array of update_stud_fee intents
 */
function generateNpcStudFeeIntents(
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
  distressLevel: DistressLevel,
): UpdateStudFeeIntent[] {
  const intents: UpdateStudFeeIntent[] = [];

  let reductionMultiplier: number;
  switch (distressLevel) {
    case "caution":
      reductionMultiplier = STUD_FEE_REDUCTION_MULTIPLIER.caution;
      break;
    case "emergency":
      reductionMultiplier = STUD_FEE_REDUCTION_MULTIPLIER.emergency;
      break;
    case "critical":
      reductionMultiplier = STUD_FEE_REDUCTION_MULTIPLIER.critical;
      break;
    default:
      return intents;
  }

  const personality = stable.personality;
  if (personality === "prestige") {
    reductionMultiplier = 1 - (1 - reductionMultiplier) * PRESTIGE_STUD_FEE_RESISTANCE;
  } else if (personality === "trader") {
    reductionMultiplier = 1 - (1 - reductionMultiplier) * TRADER_STUD_FEE_AGGRESSION;
  }

  for (const horse of ownedHorses) {
    if (!horse.stud || !horse.stud.atStud) continue;
    if (horse.stableId !== stable.id) continue;

    const currentFee = horse.stud.standingFee;
    if (currentFee <= 0) continue;

    const minFee = STUD_FEE_MINIMUM[distressLevel];
    const newFee = Math.max(minFee, Math.floor(currentFee * reductionMultiplier));

    if (newFee < currentFee) {
      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: STUD_FEE_INTENT_PRIORITY,
        type: "update_stud_fee",
        horseId: horse.id,
        newFee,
      });
    }
  }

  return intents;
}

/**
 * Generate transport intents for NPC stables with multiple outposts.
 * Moves horses to outposts that better match their surface aptitude.
 *
 * @param stable - The NPC stable generating transport intents
 * @param day - Current game day
 * @param ownedHorses - Horses owned by this stable
 * @returns Array of transport intents
 */
function generateNpcTransportIntents(
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
): TransportIntent[] {
  const intents: TransportIntent[] = [];
  if (!stable.outposts || stable.outposts.length < 2) return intents;

  const TRANSPORT_COST = 5000;
  const MAX_TRANSPORTS_PER_DAY = 2;
  let transportCount = 0;

  for (const horse of ownedHorses) {
    if (transportCount >= MAX_TRANSPORTS_PER_DAY) break;
    if (horse.stableId !== stable.id) continue;
    if (horse.age < 2) continue;

    // Find current outpost (where horse is acclimatizing or assigned)
    const currentOutpost = stable.outposts.find((o) =>
      Object.keys(o.acclimatizationDays ?? {}).includes(horse.id),
    );
    if (!currentOutpost) continue;

    // Check if horse is still acclimatizing — don't move if so
    const acclimRemaining = currentOutpost.acclimatizationDays?.[horse.id] ?? 0;
    if (acclimRemaining > 0) continue;

    // Find a better outpost: prefer one with facilities matching horse's surface aptitude
    const turfApt = horse.surfaceAptitude?.Turf ?? 0;
    const dirtApt = horse.surfaceAptitude?.Dirt ?? 0;
    const horseSurface = turfApt > dirtApt ? "Turf" : "Dirt";
    const candidateOutposts = stable.outposts.filter((o) => o.id !== currentOutpost.id);

    // Find outpost with a main track matching horse's preferred surface
    const bestOutpost = candidateOutposts.find((o) => {
      const mainTrack = Object.values(o.facilities ?? {}).find((f) => f.type === "main_track");
      return mainTrack?.branch === (horseSurface === "Turf" ? "turf" : "dirt");
    });

    if (bestOutpost) {
      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 20,
        type: "transport",
        transportId: `${currentOutpost.id}->${bestOutpost.id}`,
        cost: TRANSPORT_COST,
      });
      transportCount++;
    }
  }

  return intents;
}

/**
 * Generate facility upgrade intents for NPC stables.
 * Upgrades the lowest-level facility when budget allows, prioritizing
 * main_track and barn for training and recovery benefits.
 *
 * @param stable - The NPC stable generating facility upgrade intents
 * @param stableAI - Current AI state for the stable
 * @param day - Current game day
 * @param npcFacilities - Map of stable IDs to their facilities
 * @returns Array of facility upgrade intents
 */
function generateNpcFacilityUpgradeIntents(
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  npcFacilities?: Record<string, PlayerFacilities>,
): FacilityUpgradeIntent[] {
  const intents: FacilityUpgradeIntent[] = [];

  const facilitiesBudget = stableAI?.budgetAllocation?.facilities;
  if (facilitiesBudget === undefined || facilitiesBudget <= 0) return intents;

  const stableFacilities = npcFacilities?.[stable.id];
  if (!stableFacilities) return intents;

  const LEVEL_ORDER: FacilityLevel[] = ["basic", "standard", "premium", "elite"];
  const PRIORITY_FACILITIES: FacilityType[] = ["main_track", "barn", "veterinary_clinic"];

  // Find the lowest-level priority facility that can be upgraded within budget
  let bestCandidate: { type: FacilityType; level: FacilityLevel; cost: number } | null = null;

  for (const facilityType of PRIORITY_FACILITIES) {
    const facility = stableFacilities[facilityType];
    if (!facility) continue;
    const upgradeCost = FACILITY_UPGRADE_COSTS[facility.level];
    if (upgradeCost === null) continue; // Already elite
    if (upgradeCost > facilitiesBudget) continue;

    if (
      !bestCandidate ||
      LEVEL_ORDER.indexOf(facility.level) < LEVEL_ORDER.indexOf(bestCandidate.level)
    ) {
      bestCandidate = { type: facilityType, level: facility.level, cost: upgradeCost };
    }
  }

  if (bestCandidate) {
    const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(bestCandidate.level) + 1];
    intents.push({
      id: generateUUID(),
      entityId: stable.id,
      source: "npc",
      sourceId: stable.id,
      day,
      priority: 15,
      type: "facility_upgrade",
      facilityId: bestCandidate.type,
      nextLevel,
      cost: bestCandidate.cost,
    });
  }

  return intents;
}
