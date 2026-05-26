/**
 * store/slices/coreSlice.ts - Core game state slice
 *
 * This file provides the core game loop properties and essential state management,
 * including race entry/withdrawal, race tactics, race resolution, claiming,
 * and day advancement functions.
 *
 * Dependencies: immer (applyPatches), @/game/state/coreState (CoreState, createDefaultCoreState), @/game/types (Horse, Race, PlayerProfile), @/game/store (ActionResult), @/core/time/pipeline (executePipeline, PipelineContext), @/core/time/phases (GAME_PIPELINE_PHASES), @/game/rng (createRng, hashStr), @/game/raceSchedule (getCurrentYear), @/core/time/advance (computePlayerRaceDays), @/game/constants (UPKEEP_PER_HORSE, DAYS_PER_YEAR, DAYS_PER_MONTH, DAYS_PER_WEEK), ../guards (requireOwned, requireHorse), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/core/time/pipeline.ts (day advancement logic)
 */

/**
 * Core Slice
 * Core game loop properties and essential state management
 */

import { applyPatches } from "immer";
import type { CoreState } from "@/game/state/coreState";
import { createDefaultCoreState } from "@/game/state/coreState";
import type { Horse, Race, PlayerProfile } from "@/game/types";
import type { ActionResult } from "@/game/store";
import type { AnyIntent } from "@/core/resolver/intents";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { createRng, hashStr } from "@/game/rng";
import { getCurrentYear } from "@/game/raceSchedule";
import { computePlayerRaceDays } from "@/core/time/advance";
import {
  UPKEEP_PER_HORSE,
  DAYS_PER_YEAR,
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
} from "@/game/constants";
import { requireOwned, requireHorse } from "../guards";
import { getEngineWorker } from "@/game/store";
import { generateUUID } from "@/core/uuid";
import { resolvePhenotype } from "@/core/horse/horseFactory";
import type { StoreSet, StoreGet } from "../types";

export type CoreSlice = CoreState & {
  enqueueIntent: (intent: AnyIntent) => void;
  enterRace: (raceId: string, horseId: string) => ActionResult;
  withdrawRace: (raceId: string, horseId: string) => ActionResult;
  setRaceTactics: (
    raceId: string,
    horseId: string,
    tactics: import("@/core/resolver/intents").TacticsIntent["tactics"],
  ) => void;
  resolveRaceWithImpacts: (
    raceId: string,
    result: { horseId: string; position: number; time: number }[],
    runners?: Array<{ horseId: string; owned?: boolean }>,
  ) => void;
  submitClaim: (raceId: string, horseId: string) => ActionResult;
  withdrawClaim: (raceId: string, horseId: string) => ActionResult;
  advanceDay: (
    progressCallback?: (stage: number, total: number, name: string) => void,
  ) => Promise<void>;
  advanceMultipleDays: (n: number, headless?: boolean) => Promise<void>;
  advanceWeek: (headless?: boolean) => Promise<void>;
  advanceMonth: (headless?: boolean) => Promise<void>;
  advanceYear: (headless?: boolean) => Promise<void>;
  setDay: (day: number) => void;
  setCash: (cash: number) => void;
  setHorses: (horses: Horse[]) => void;
  setRaces: (races: Race[]) => void;
  setLog: (log: { day: number; text: string }[]) => void;
  setPlayerProfile: (profile: PlayerProfile) => void;
  addLogEntry: (entry: { day: number; text: string }) => void;
  resolveHorsePhenotype: (horseId: string) => void;
};

/**
 * Create the core game state slice with all game loop actions.
 *
 * Provides race entry/withdrawal, race tactics, race resolution, claiming,
 * day advancement, and state setters. Uses intent-based state updates.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Core slice with state and actions
 */
export function createCoreSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): CoreSlice {
  /**
   * Helper to apply day advancement results to the store state.
   * This consolidates the state updates from both worker and synchronous paths.
   *
   * @param finalState - The final game state after pipeline processing
   * @param newLogs - New logs generated during the day advancement
   * @param playerUpkeep - The calculated upkeep cost for the player
   * @param newDay - The new day number
   */
  const applyDayResult = (
    finalState: any,
    newLogs: { day: number; text: string }[],
    playerUpkeep: number,
    newDay: number,
  ) => {
    const s = get();

    // Keys that are managed via special logic instead of a direct copy from worker state
    const overrides = {
      day: newDay,
      pendingIntents: [],
      trainingUsed: {},
      log: [
        ...newLogs,
        { day: newDay, text: `Day ${newDay} begins. Upkeep: $${playerUpkeep}.` },
        ...s.log,
      ].slice(0, 1000), // Persist more history, but cap it
    };

    // Build the update by merging finalState and overrides
    const update: any = { ...finalState, ...overrides };

    // Sync horseMap if horses changed
    if (finalState.horses) {
      update.horseMap = new Map(finalState.horses.map((h: Horse) => [h.id, h]));
    }

    // Explicitly remove keys that shouldn't be in the store (e.g. worker-only metadata)
    delete update.lastFrameTime;
    delete update.isAdvancing;

    set(update);
  };

  return {
    ...createDefaultCoreState(),

    enqueueIntent: (intent) => {
      set((state: any) => ({
        pendingIntents: [...(state.pendingIntents || []), intent],
      }));
    },

    enterRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = requireHorse(s.horses, horseId);
      const ownershipGuard = requireOwned(horse);
      if (ownershipGuard) return ownershipGuard;

      if (horse!.energy < 50) return { ok: false, reason: "Horse lacks sufficient energy." };
      if (race.entries.some((e) => e.horseId === horseId))
        return { ok: false, reason: "Horse already entered." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "race_entry",
        raceId,
        horseId,
      });

      return { ok: true };
    },

    setRaceTactics: (raceId: string, horseId: string, tactics: any) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "tactics",
        raceId,
        horseId,
        tactics,
      });
    },

    withdrawRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      const entry = race.entries.find((e) => e.horseId === horseId);
      if (!entry) return { ok: false, reason: "Horse not entered in this race." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "race_withdrawal",
        raceId,
        horseId,
      });

      return { ok: true };
    },

    resolveRaceWithImpacts: (
      raceId: string,
      result: { horseId: string; position: number; time: number }[],
    ) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: raceId,
        source: "system",
        day: s.day,
        priority: 10,
        type: "race_resolution",
        raceId,
        results: result,
      });
    },

    submitClaim: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (horse.owned) return { ok: false, reason: "Cannot claim your own horse." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "claiming",
        raceId,
        horseId,
        claimingPrice: race.claimingPrice || 0,
      });

      return { ok: true };
    },

    withdrawClaim: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "withdraw_from_claiming",
        raceId,
        horseId,
      });

      return { ok: true };
    },

    advanceDay: async (progressCallback?: (stage: number, total: number, name: string) => void) => {
      const s = get();
      const newDay = s.day + 1;
      const currentYear = getCurrentYear(newDay);
      const previousYear = getCurrentYear(s.day);

      // Clean up expired Win and You're In qualifications at year boundary
      let horses = s.horses;
      if (currentYear > previousYear) {
        horses = horses.map((h: Horse) => {
          if (h.winAndYouInQualified) {
            h.winAndYouInQualified = h.winAndYouInQualified.filter((q) => q.year >= currentYear);
          }
          return h;
        });
      }

      const playerHorseCount = horses.filter((h: Horse) => !h.stableId).length;
      const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

      // Try to use engine worker if available (browser context)
      try {
        const engineWorker = getEngineWorker();
        const result = await engineWorker.advanceDay({
          state: { ...s, horses },
          newDay,
          progressCallback,
        });

        const { patches, logs: newLogs } = result;

        // Apply patches to get the final state
        const finalState = applyPatches(s, patches);

        applyDayResult(finalState, newLogs, playerUpkeep, newDay);
      } catch (error) {
        // Fallback: Worker not available (SSR context), use synchronous pipeline
        if (!(error instanceof Error && error.message.includes("Worker not available"))) {
          // Only log if it's NOT just a missing worker
          console.warn(
            "Worker not available or failed to clone state, using synchronous pipeline execution",
          );
        }

        // Execute pipeline for all phases
        const pipelineContext: PipelineContext = {
          previousDay: s.day,
          newDay,
          state: {
            ...s,
            horses,
            npcAIManager: s.npcAIManager
              ? {
                  ...s.npcAIManager,
                  stableStates: { ...s.npcAIManager.stableStates },
                }
              : undefined,
          },
          logs: [],
          dailyRng: createRng(hashStr("daily_" + newDay)),
          // Intent/impact resolver fields
          intents: s.pendingIntents || [],
          impacts: [],
          impactLog: [],
        };

        const updatedContext = executePipeline(GAME_PIPELINE_PHASES, pipelineContext);

        // Extract final state from pipeline context
        const { state: finalState, logs: newLogs } = updatedContext;

        applyDayResult(finalState, newLogs, playerUpkeep, newDay);
      }
    },

    advanceMultipleDays: async (n: number, headless?: boolean) => {
      const s = get();
      // Pre-compute player race days for O(1) lookup
      const playerRaceDays = computePlayerRaceDays(s.races, s.day + 1, s.day + n);

      // Batch size - yield control every 5 days to balance performance and responsiveness
      const batchSize = 5;

      for (let i = 0; i < n; i++) {
        const currentS = get();
        const nextDay = currentS.day + 1;

        // O(1) lookup instead of O(n) array.find
        if (playerRaceDays.has(nextDay) && !headless) {
          const playerRace = currentS.races.find(
            (r: Race) => !r.resolved && r.day === nextDay && r.entries.some((e) => e.owned),
          );
          if (playerRace) {
            set({ pendingPlayerRaceId: playerRace.id });
            return;
          }
        }

        await get().advanceDay();

        // Yield control to browser every batchSize days to prevent UI freeze
        if (i % batchSize === 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    },

    advanceWeek: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_WEEK, headless);
    },

    advanceMonth: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_MONTH, headless);
    },

    advanceYear: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_YEAR, headless);
    },

    setDay: (day) => {
      set({ day });
    },

    setCash: (cash) => {
      set({ cash });
    },

    setHorses: (horses) => {
      set({
        horses,
        horseMap: new Map(horses.map((h) => [h.id, h])),
      });
    },

    setRaces: (races) => {
      set({ races });
    },

    setLog: (log) => {
      set({ log });
    },

    setPlayerProfile: (profile) => {
      set({ playerProfile: profile });
    },

    addLogEntry: (entry) => {
      set((state) => ({
        log: [entry, ...state.log].slice(0, 500),
      }));
    },

    resolveHorsePhenotype: (horseId) => {
      const s = get();
      const idx = s.horses.findIndex((h: Horse) => h.id === horseId);
      if (idx === -1) return;
      const horse = s.horses[idx];
      if (horse.phenotypeResolved !== false) return;
      const resolved = resolvePhenotype(horse);
      const horses = [...s.horses];
      horses[idx] = resolved;
      set({ horses });
    },
  };
}
