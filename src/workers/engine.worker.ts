/**
 * Engine Worker
 * Executes the game pipeline in a Web Worker to offload CPU-intensive operations
 * from the main thread, keeping the UI responsive during day advancement.
 */

import { expose, proxy } from "comlink";
import type { GameState } from "@/game/types";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { intentCollectionPhase } from "@/core/time/phases/intentCollection";
import { intentValidationPhase } from "@/core/time/phases/intentValidation";
import { upkeepPhase } from "@/core/time/phases/upkeep";
import { agingPhase } from "@/core/time/phases/aging";
import { breedingSeasonPhase } from "@/core/time/phases/breedingSeason";
import { industryMetricsPhase } from "@/core/time/phases/industryMetricsPhase";
import { npcBreedingPhase } from "@/core/time/phases/npcBreedingPhase";
import { energyPhase } from "@/core/time/phases/energy";
import { marketPhase } from "@/core/time/phases/market";
import { racesPhase } from "@/core/time/phases/races";
import { beyerRecalibrationPhase } from "@/core/time/phases/beyerRecalibration";
import { jockeyPhase } from "@/core/time/phases/jockeyPhase";
import { pregnancyPhase } from "@/core/time/phases/pregnancy";
import { npcCyclePhase } from "@/core/time/phases/npcCycle";
import { stallionRetirementPhase } from "@/core/time/phases/stallionRetirement";
import { pastureRetirementPhase } from "@/core/time/phases/pastureRetirement";
import { hallOfFamePhase } from "@/core/time/phases/hallOfFame";
import { horseDeathPhase } from "@/core/time/phases/horseDeath";
import { auctionsPhase } from "@/core/time/phases/auctions";
import { leaderboardPhase } from "@/core/time/phases/leaderboardPhase";
import { awardsPhase } from "@/core/time/phases/awards";
import { schedulerPhase } from "@/core/time/phases/schedulerPhase";
import { stateUpdatePhase } from "@/core/time/phases/stateUpdate";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { consignmentResolutionPhase } from "@/core/time/phases/consignmentResolution";
import { purchaseResolutionPhase } from "@/core/time/phases/purchaseResolution";
import { breedingResolutionPhase } from "@/core/time/phases/breedingResolution";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { claimingWithdrawalPhase } from "@/core/time/phases/claimingWithdrawal";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { impactApplicationPhase } from "@/core/time/phases/impactApplication";
import { privateSaleExpiryPhase } from "@/core/time/phases/privateSaleExpiry";
import { npcClaimingPhase } from "@/core/time/phases/npcClaiming";
import { claimResolutionPhase } from "@/core/time/phases/claimResolution";
import { createRng, hashStr } from "@/game/rng";
import { getCurrentYear } from "@/game/raceSchedule";

export type AdvanceDayInput = {
  state: GameState;
  newDay: number;
  progressCallback?: (stage: number, totalStages: number, stageName: string) => void;
};

export type AdvanceDayOutput = {
  state: GameState;
  logs: { day: number; text: string }[];
};

/**
 * Execute a single day advancement in the worker
 * This offloads all CPU-intensive pipeline phases to the worker thread
 */
async function advanceDay(input: AdvanceDayInput): Promise<AdvanceDayOutput> {
  const { state, newDay, progressCallback } = input;
  const previousDay = state.day;
  const currentYear = getCurrentYear(newDay);
  const previousYear = getCurrentYear(previousDay);

  // Clean up expired Win and You're In qualifications at year boundary
  let horses = state.horses;
  if (currentYear > previousYear) {
    horses = horses.map((h) => {
      if (h.winAndYouInQualified) {
        h.winAndYouInQualified = h.winAndYouInQualified.filter((q) => q.year >= currentYear);
      }
      return h;
    });
  }

  // Setup pipeline context
  const pipelineContext: PipelineContext = {
    previousDay,
    newDay,
    state: { ...state, horses },
    logs: [],
    dailyRng: createRng(hashStr("daily_" + newDay)),
    intents: state.pendingIntents || [],
    impacts: [],
    impactLog: [],
  };

  // Define phases array with all game phases
  const phases = [
    // Intent/impact resolver phases
    intentCollectionPhase,
    intentValidationPhase,
    // D2 — Private sale offer expiry (very early, order 3)
    privateSaleExpiryPhase,
    // Existing phases
    upkeepPhase,
    agingPhase,
    breedingSeasonPhase,
    industryMetricsPhase,
    npcBreedingPhase,
    energyPhase,
    marketPhase,
    racesPhase,
    beyerRecalibrationPhase,
    jockeyPhase,
    pregnancyPhase,
    npcCyclePhase,
    stallionRetirementPhase,
    pastureRetirementPhase,
    hallOfFamePhase,
    horseDeathPhase,
    auctionsPhase,
    leaderboardPhase,
    awardsPhase,
    schedulerPhase,
    stateUpdatePhase,
    // Resolution phases (convert intents to impacts)
    raceEntryResolutionPhase,
    consignmentResolutionPhase,
    purchaseResolutionPhase,
    breedingResolutionPhase,
    trainingResolutionPhase,
    claimingWithdrawalPhase,
    // D3 — NPC claim filing (order 62, before raceResolution)
    npcClaimingPhase,
    raceResolutionPhase,
    // D3 — Claim resolution (order 75, after raceResolution)
    claimResolutionPhase,
    // Impact application phase (final)
    impactApplicationPhase,
  ];

  // Execute pipeline with progress callbacks
  let currentContext = pipelineContext;
  const totalStages = 5;

  // Stage 1: Intent processing + early expiry (phases 1-10)
  if (progressCallback) {
    progressCallback(1, totalStages, "Intent processing");
  }
  currentContext = executePipeline(
    phases.filter((p) => p.order >= 1 && p.order <= 10),
    currentContext,
  );

  // Stage 2: Resolution intents (phases 15-45)
  if (progressCallback) {
    progressCallback(2, totalStages, "Resolution intents");
  }
  currentContext = executePipeline(
    phases.filter((p) => p.order >= 15 && p.order <= 45),
    currentContext,
  );

  // Stage 3: Core simulation (phases 50-95)
  if (progressCallback) {
    progressCallback(3, totalStages, "Core simulation");
  }
  currentContext = executePipeline(
    phases.filter((p) => p.order >= 50 && p.order <= 95),
    currentContext,
  );

  // Stage 4: Lifecycle (phases 100-160)
  if (progressCallback) {
    progressCallback(4, totalStages, "Lifecycle");
  }
  currentContext = executePipeline(
    phases.filter((p) => p.order >= 100 && p.order <= 160),
    currentContext,
  );

  // Stage 5: Final resolution (phases 67-200)
  if (progressCallback) {
    progressCallback(5, totalStages, "Final resolution");
  }
  currentContext = executePipeline(
    phases.filter((p) => p.order >= 67 && p.order <= 200),
    currentContext,
  );

  // Extract final state from pipeline context
  const { state: finalState, logs: newLogs } = currentContext;

  return {
    state: finalState,
    logs: newLogs,
  };
}

/**
 * Engine worker API exposed via Comlink
 */
export type EngineWorkerApi = {
  advanceDay(input: AdvanceDayInput): Promise<AdvanceDayOutput>;
};

// Expose the worker API with Comlink
expose({
  advanceDay: (input: AdvanceDayInput) => {
    // Wrap progress callback in Comlink proxy for worker-main communication
    const proxiedCallback = input.progressCallback
      ? proxy((stage: number, total: number, name: string) => {
          if (input.progressCallback) {
            input.progressCallback(stage, total, name);
          }
        })
      : undefined;

    return advanceDay({ ...input, progressCallback: proxiedCallback });
  },
} as EngineWorkerApi);
