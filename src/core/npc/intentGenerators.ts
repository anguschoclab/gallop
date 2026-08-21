/**
 * npc/intentGenerators.ts - NPC intent generator orchestrator
 *
 * Orchestrates intent generation for NPC stables by composing extracted
 * intent modules: trainingIntents, raceEntryIntents, claimingIntents,
 * breedingIntents, diplomaticIntents, facilityIntents.
 *
 * Dependencies: @/core/resolver/intents, @/game/types, @/core/ai/npcCycleAI, @/core/ai/strategicCoordinator, @/services/narrative/directiveNewsGenerator
 * Related files: npcCycle.ts (uses intents), intents/*.ts (extracted generators)
 */

import type { AnyIntent } from "@/core/resolver/intents";
import type { GameState, Horse, Race, Stable } from "@/game/types";
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
} from "@/core/ai/strategicCoordinator";
import { generateDirectiveChangeNews } from "@/services/narrative/directiveNewsGenerator";
import { generateNpcTrainingIntents } from "./intents/trainingIntents";
import { generateNpcRaceEntryIntents } from "./intents/raceEntryIntents";
import {
  generateNpcClaimingIntents,
  generateNpcWithdrawalIntents,
} from "./intents/claimingIntents";
import {
  generateNpcGeldingIntents,
  generateNpcSyndicateIntents,
  generateNpcStudFeeIntents,
} from "./intents/breedingIntents";
import { generateNpcDiplomaticIntents } from "./intents/diplomaticIntents";
import {
  generateNpcAuctionIntents,
  generateNpcTransportIntents,
  generateNpcFacilityUpgradeIntents,
  generateNpcOutpostIntents,
} from "./intents/facilityIntents";

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
    if (horse.ownership?.type === "npc") {
      const sid = horse.ownership.stableId;
      if (!horsesByStable.has(sid)) horsesByStable.set(sid, []);
      horsesByStable.get(sid)!.push(horse);
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
          aiManager?.difficultyModulator,
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
          aiManager?.difficultyModulator,
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

      // Outpost creation intents: NPCs with sufficient cash build outposts for regional expansion
      intents.push(...generateNpcOutpostIntents(stable, stableAI, day));

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
