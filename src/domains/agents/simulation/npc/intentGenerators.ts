/**
 * npc/intentGenerators.ts - NPC intent generator orchestrator
 *
 * Orchestrates intent generation for NPC stables by composing extracted
 * intent modules: trainingIntents, raceEntryIntents, claimingIntents,
 * breedingIntents, diplomaticIntents, facilityIntents.
 *
 * Dependencies: @/core/resolver/intents, @/game/types, @/domains/agents/simulation/npcCycleAI, @/domains/agents/simulation/strategicCoordinator, @/core/narrative/directiveNewsGenerator
 * Related files: npcCycle.ts (uses intents), intents/*.ts (extracted generators)
 */

import type { AnyIntent } from "@/platform/resolver/intents";
import type { GameState, Horse, Race } from "@/platform/game/types";
import {
  getOrCreateStableAIState,
  updateStableAIState,
} from "@/domains/agents/simulation/npcCycleAI";
import {
  assessWorldState,
  generateStrategicDirectives,
  allocateBudget,
  coordinateSubsystems,
  type WorldAssessment,
} from "@/domains/agents/simulation/strategicCoordinator";
import { generateDirectiveChangeNews } from "@/domains/narrative/simulation/directiveNewsGenerator";
import { generateNpcActions } from "@/domains/agents/simulation/npcActionRegistry";
import {
  buildNpcObservation,
  buildPublicWorldView,
  prepareObservationWorkspace,
} from "@/domains/agents/simulation/agentObservation";
import { deriveBeliefs } from "@/domains/agents/simulation/agentBeliefs";
import { repairAgentGoals } from "@/domains/agents/simulation/agentGoals";
import {
  buildRaceCompetitorIndex,
  type RaceCompetitorIndex,
} from "@/domains/agents/simulation/raceEntryAIScoring";

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
 * @param prebuiltHorseMap - Optional pre-built horse map to avoid rebuilding
 * @param prebuiltRaceMap - Optional pre-built race map to avoid rebuilding
 * @returns Array of intent objects for all NPC actions
 */
export interface NpcGenerationDiagnostic {
  stableId: string;
  day: number;
  phase: "intent_collection";
  message: string;
}

export interface NpcIntentGenerationResult {
  intents: AnyIntent[];
  diagnostics: NpcGenerationDiagnostic[];
  npcAIManager?: GameState["npcAIManager"];
}

export function generateNpcIntentsDetailed(
  state: GameState,
  day: number,
  cachedWorldAssessment?: WorldAssessment,
  prebuiltHorseMap?: Map<string, Horse>,
  prebuiltRaceMap?: Map<string, Race>,
): NpcIntentGenerationResult {
  const intents: AnyIntent[] = [];
  const diagnostics: NpcGenerationDiagnostic[] = [];
  const aiManager = state.npcAIManager
    ? {
        ...state.npcAIManager,
        stableStates: { ...state.npcAIManager.stableStates },
        regionalKings: { ...state.npcAIManager.regionalKings },
        pendingNewsItems: state.npcAIManager.pendingNewsItems
          ? [...state.npcAIManager.pendingNewsItems]
          : undefined,
      }
    : undefined;

  // Index horses by stable for fast lookup — use pre-built map if available
  const horseMap = prebuiltHorseMap ?? new Map(Object.entries(state.horses));

  // Hidden-information boundary: world assessment and every action generator
  // observe a sanitized public world view — never the authoritative state.
  const observationWorkspace = prepareObservationWorkspace(state, horseMap.values());
  const worldView = buildPublicWorldView(state, observationWorkspace);

  // Cross-System Coordination: use cached world assessment if available, otherwise compute
  const worldAssessment: WorldAssessment | undefined =
    cachedWorldAssessment ?? (aiManager ? assessWorldState(worldView, aiManager) : undefined);
  const horsesByStable = new Map<string, Horse[]>();
  for (const horse of horseMap.values()) {
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

  // Cache upcoming races and index them by region — use pre-built map if available
  const allRaces = prebuiltRaceMap
    ? Array.from(prebuiltRaceMap.values())
    : Object.values(state.races);
  const upcomingRaces = allRaces.filter(
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

  // Pre-index competitor quality once per race: the entry-scoring path would
  // otherwise re-rate every field once per (stable, horse) evaluation.
  // Competitor evaluation rates the field on observable form — never on
  // rivals' hidden condition or unrealized potential.
  const raceCompetitorIndex = new Map<string, RaceCompetitorIndex>();
  for (const race of upcomingRaces) {
    if (race.entries.length > 0) {
      raceCompetitorIndex.set(
        race.id,
        buildRaceCompetitorIndex(race, observationWorkspace.publicHorseViews),
      );
    }
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
          aiManager.pendingNewsItems = [...aiManager.pendingNewsItems, directiveNews];
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

      // Per-stable observation: public world + own internals. Generators
      // receive this — never the authoritative state.
      const observation = buildNpcObservation(state, stable.id, observationWorkspace);
      const observedHorseMap = new Map(observationWorkspace.publicHorseViews);
      for (const horse of ownedHorses) {
        observedHorseMap.set(horse.id, horse);
      }

      // Beliefs refresh from the day's observation; goals validate against it
      // and repair in place (surviving goals keep identity and age).
      if (stableAI) {
        const beliefs = deriveBeliefs(
          observation,
          stable,
          worldAssessment,
          day,
          distressLevel,
          stableAI.beliefs,
        );
        const goals = repairAgentGoals(stableAI.goals, {
          observation,
          stable,
          beliefs,
          distressLevel,
          ownedHorseCount: ownedHorses.length,
          eligibleHorseCount: ownedHorses.filter((horse) => horse.age >= 2).length,
          day,
        });
        stableAI = { ...stableAI, beliefs, goals };
      }

      const actionResult = generateNpcActions({
        state: observation,
        stable,
        stableAI,
        day,
        ownedHorses,
        relevantRaces,
        activePregnanciesByDam,
        raceEntrySets,
        raceCompetitorIndex,
        horseMap: observedHorseMap,
        weights,
        distressLevel,
        difficultyModulator: aiManager?.difficultyModulator,
        aiManager: observation.npcAIManager,
        npcFacilities: observation.npcFacilities,
      });
      intents.push(...actionResult.intents);
      if (stableAI) {
        stableAI = {
          ...stableAI,
          decisionTraces: actionResult.traces,
          actionPlans: actionResult.plans,
        };
      }

      // Update stable AI state in the manager (immutable update)
      if (aiManager && stableAI) {
        const updatedState = updateStableAIState(stableAI, day);
        aiManager.stableStates = {
          ...aiManager.stableStates,
          [stable.id]: updatedState,
        };
      }
    } catch (err) {
      diagnostics.push({
        stableId: stable.id,
        day,
        phase: "intent_collection",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { intents, diagnostics, npcAIManager: aiManager };
}

export function generateNpcIntents(
  state: GameState,
  day: number,
  cachedWorldAssessment?: WorldAssessment,
  prebuiltHorseMap?: Map<string, Horse>,
  prebuiltRaceMap?: Map<string, Race>,
): AnyIntent[] {
  return generateNpcIntentsDetailed(
    state,
    day,
    cachedWorldAssessment,
    prebuiltHorseMap,
    prebuiltRaceMap,
  ).intents;
}
