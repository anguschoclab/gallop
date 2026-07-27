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
import type { CoreState } from "@/game/store/state/coreState";
import { createDefaultCoreState } from "@/game/store/state/coreState";
import type { Horse, Race, PlayerProfile } from "@/game/types";
import type { ActionResult } from "@/game/store";
import type { AnyIntent } from "@/core/resolver/intents";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { createRng, hashStr } from "@/core/common/rng";
import { getCurrentYear } from "@/core/race/schedule";
import { computePlayerRaceDays } from "@/core/time/advance";
import {
  UPKEEP_PER_HORSE,
  DAYS_PER_YEAR,
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  BUMP_RATING_MARGIN,
} from "@/constants";
import { calculateOverallRating } from "@/core/horse/stats";
import { requireOwned, requireHorse } from "../guards";
import { getEngineWorker } from "@/game/store";
import { persistenceEnabled } from "@/game/store/storage";
import { generateUUID } from "@/core/uuid";
import { resolvePhenotype } from "@/core/horse/horseFactory";
import { clearLineageCache } from "@/core/breeding/lineage";
import { horsePrice } from "@/core/horse/pricing";
import { SOLVENCY_THRESHOLDS, deriveSolvencyState } from "@/core/financial/solvency";
import type { StoreSet, StoreGet, StoreType } from "../types";

export type CoreSlice = CoreState & {
  enqueueIntent: (intent: AnyIntent) => void;
  enterRace: (raceId: string, horseId: string) => ActionResult;
  withdrawRace: (raceId: string, horseId: string) => ActionResult;
  setRaceTactics: (raceId: string, horseId: string, jockeyInstructions: JockeyInstructions) => void;
  resolveRaceWithImpacts: (
    raceId: string,
    result: { horseId: string; position: number; time: number }[],
    runners?: Array<{ horseId: string; owned?: boolean }>,
  ) => void;
  submitClaim: (raceId: string, horseId: string) => ActionResult;
  withdrawClaim: (raceId: string, horseId: string) => ActionResult;
  purchaseInsurance: (
    horseId: string,
    policyType: "injury_only" | "mortality_only" | "comprehensive",
  ) => ActionResult;
  cancelInsurance: (horseId: string) => ActionResult;
  advanceDay: (
    progressCallback?: (stage: number, total: number, name: string) => void,
  ) => Promise<void>;
  advanceMultipleDays: (n: number, headless?: boolean) => Promise<void>;
  advanceWeek: (headless?: boolean) => Promise<void>;
  advanceMonth: (headless?: boolean) => Promise<void>;
  advanceYear: (headless?: boolean) => Promise<void>;
  setDay: (day: number) => void;
  setCash: (cash: number) => void;
  setHorses: (horses: Record<string, Horse>) => void;
  setRaces: (races: Record<string, Race>) => void;
  setLog: (log: { day: number; text: string }[]) => void;
  setPlayerProfile: (profile: PlayerProfile) => void;
  addLogEntry: (entry: { day: number; text: string }) => void;
  resolveHorsePhenotype: (horseId: string) => void;
  payDownDebt: (amount: number) => ActionResult;
  quickSellHorse: (horseId: string) => ActionResult;
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
    finalState: Partial<StoreType>,
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
    const update: Record<string, unknown> = { ...finalState, ...overrides };

    // Explicitly remove keys that shouldn't be in the store (e.g. worker-only metadata)
    delete update.lastFrameTime;
    delete update.isAdvancing;

    clearLineageCache();
    set(update as Partial<StoreType>);
  };

  return {
    ...createDefaultCoreState(),

    enqueueIntent: (intent) => {
      set((state) => ({
        pendingIntents: [...(state.pendingIntents || []), intent],
      }));
    },

    enterRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = requireHorse(s.horses, horseId);
      const ownershipGuard = requireOwned(horse);
      if (ownershipGuard) return ownershipGuard;

      if (horse!.energy < 50) return { ok: false, reason: "Horse lacks sufficient energy." };
      if (race.entries.some((e: { horseId: string }) => e.horseId === horseId))
        return { ok: false, reason: "Horse already entered." };

      // Block entry into invite-only races for uninvited horses
      if (race.graded?.requiresInvitation) {
        const invitedIds = race.invitedHorseIds ?? race.graded.invitedHorseIds ?? [];
        const isInvited = invitedIds.includes(horseId);
        const isWinAndYouIn =
          race.graded.key &&
          horse!.winAndYouInQualified?.some(
            (q) => q.raceKey === race.graded!.key && q.year === Math.floor((s.day - 1) / 365) + 1,
          );
        if (!isInvited && !isWinAndYouIn) {
          return { ok: false, reason: "Invitation required for this race." };
        }
      }

      // Stakes nomination guard — G1/G2/G3 races require pre-nomination.
      const raceGrade = race.graded_override?.grade ?? race.graded?.grade ?? null;
      let matchedNominationId: string | undefined;
      if (raceGrade) {
        const noms = s.playerNominations;
        const active = noms.find(
          (n) => n.horseId === horseId && n.raceId === raceId && n.status === "active",
        );
        if (!active) {
          return {
            ok: false,
            reason: `${horse!.name} must be nominated before entering a ${raceGrade} race.`,
          };
        }
        matchedNominationId = active.id;
      }

      let bumpEntryHorseId: string | undefined;
      if (race.entries.length >= race.fieldSize) {
        const playerRating = calculateOverallRating(horse!);
        let weakestHorseId: string | undefined;
        let weakestRating = Infinity;
        for (const entry of race.entries) {
          if (entry.owned) continue; // never bump player's own entries
          const entryHorse = s.horses[entry.horseId];
          if (!entryHorse) continue;
          const r = calculateOverallRating(entryHorse);
          if (r < weakestRating) {
            weakestRating = r;
            weakestHorseId = entry.horseId;
          }
        }
        if (!weakestHorseId || playerRating <= weakestRating + BUMP_RATING_MARGIN) {
          return {
            ok: false,
            reason: "Race is full — your horse isn't rated high enough to bump an entry.",
          };
        }
        bumpEntryHorseId = weakestHorseId;
      }

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "race_entry",
        raceId,
        horseId,
        bumpEntryHorseId,
      });

      // Mark the matching nomination as entered.
      if (matchedNominationId) {
        set((state) => ({
          playerNominations: state.playerNominations.map((n) =>
            n.id === matchedNominationId ? { ...n, status: "entered" } : n,
          ),
        }));
      }

      return { ok: true };
    },

    setRaceTactics: (raceId: string, horseId: string, jockeyInstructions: JockeyInstructions) => {
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
        jockeyInstructions,
      });
    },

    withdrawRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      const entry = race.entries.find((e: { horseId: string }) => e.horseId === horseId);
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

    purchaseInsurance: (
      horseId: string,
      policyType: "injury_only" | "mortality_only" | "comprehensive",
    ) => {
      const s = get();
      const horse = s.horses?.[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "Horse not owned." };
      if (horse.insurancePolicy) return { ok: false, reason: "Horse already has insurance." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "insurance_purchase",
        horseId,
        policyType,
      });

      return { ok: true };
    },

    cancelInsurance: (horseId: string) => {
      const s = get();
      const horse = s.horses?.[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.insurancePolicy) return { ok: false, reason: "Horse has no insurance to cancel." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "insurance_cancel",
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
      const race = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = s.horses[horseId];
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
      const race = s.races[raceId];
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
        horses = Object.fromEntries(
          Object.values(s.horses).map((h: Horse) => {
            if (h.winAndYouInQualified) {
              return [
                h.id,
                {
                  ...h,
                  winAndYouInQualified: h.winAndYouInQualified.filter((q) => q.year >= currentYear),
                },
              ];
            }
            return [h.id, h];
          }),
        );
      }

      const playerHorseCount = Object.values(horses).filter((h: Horse) => !h.stableId).length;
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
        const syncState = {
          ...s,
          horses,
          npcAIManager: s.npcAIManager
            ? {
                ...s.npcAIManager,
                stableStates: { ...s.npcAIManager.stableStates },
              }
            : undefined,
        };
        const pipelineContext: PipelineContext = {
          previousDay: s.day,
          newDay,
          state: syncState,
          logs: [],
          dailyRng: createRng(hashStr("daily_" + newDay)),
          // Intent/impact resolver fields
          intents: s.pendingIntents || [],
          impacts: [],
          impactLog: [],
          // Build shared lookup maps once at pipeline entry
          horseMap: new Map(Object.values(syncState.horses).map((h: Horse) => [h.id, h])),
          raceMap: new Map(Object.values(syncState.races).map((r: Race) => [r.id, r])),
          stableMap: new Map((syncState.npcStables ?? []).map((s: any) => [s.id, s])),
          jockeyMap: new Map((syncState.jockeys ?? []).map((j: any) => [j.id, j])),
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
      const playerRaceDays = computePlayerRaceDays(Object.values(s.races), s.day + 1, s.day + n);

      // Debounce persistence: disable saves during batch, restore after
      const wasPersistenceEnabled = persistenceEnabled.value;
      persistenceEnabled.value = false;

      try {
        // Try worker batch first (single round-trip for all N days)
        try {
          const engineWorker = getEngineWorker();
          const result = await engineWorker.advanceDaysBatch({
            state: { ...s },
            count: n,
            headless,
            playerRaceDays,
          });

          const {
            patches,
            logs: allLogs,
            daysAdvanced,
            encounteredPlayerRace,
            playerRaceId,
          } = result;

          // Apply patches to get the final state
          const finalState = applyPatches(s, patches);
          const finalDay = s.day + daysAdvanced;

          // Calculate upkeep for the final day
          const playerHorseCount = Object.values(finalState.horses ?? {}).filter(
            (h: Horse) => !h.stableId,
          ).length;
          const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

          // Apply the result
          applyDayResult(finalState, allLogs, playerUpkeep, finalDay);

          if (encounteredPlayerRace && playerRaceId) {
            set({ pendingPlayerRaceId: playerRaceId });
          }
          return;
        } catch (error) {
          // Worker not available — fall through to synchronous per-day loop
          if (!(error instanceof Error && error.message.includes("Worker not available"))) {
            console.warn(
              "Worker batch not available, using synchronous per-day pipeline execution",
            );
          }
        }

        // Fallback: synchronous per-day loop with yield every 5 days
        const batchSize = 5;

        for (let i = 0; i < n; i++) {
          const currentS = get();
          const nextDay = currentS.day + 1;

          // O(1) lookup instead of O(n) array.find
          if (playerRaceDays.has(nextDay) && !headless) {
            const playerRace = Object.values(currentS.races).find(
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
      } finally {
        // Restore persistence — the persist middleware will save the final state
        // via the set() call in applyDayResult from the last advanceDay.
        persistenceEnabled.value = wasPersistenceEnabled;
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
      set({ horses });
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
      const horse = s.horses[horseId];
      if (!horse) return;
      if (horse.phenotypeResolved !== false) return;
      const resolved = resolvePhenotype(horse);
      set({ horses: { ...s.horses, [horseId]: resolved } });
    },

    payDownDebt: (amount) => {
      const s = get();
      if (s.cash >= 0) {
        return { ok: false, reason: "Not in debt" };
      }
      if (amount <= 0) {
        return { ok: false, reason: "Amount must be positive" };
      }
      const debt = Math.abs(s.cash);
      if (amount > debt) {
        return { ok: false, reason: "Amount exceeds current debt" };
      }
      const cashBefore = s.cash;
      const newCash = s.cash + amount;
      const tier = deriveSolvencyState({
        cash: newCash,
        consecutiveDaysInDebt: s.consecutiveDaysInDebt ?? 0,
      }).tier;
      const auditEntry = {
        day: s.day,
        tier: tier as "healthy" | "warning" | "forced_sale" | "insolvent",
        cashBefore,
        cashAfter: newCash,
        delta: amount,
        kind: "repayment" as const,
        detail: `External cash injection of $${amount.toLocaleString()}`,
      };
      const newAudit = [...(s.solvencyAuditLog ?? []), auditEntry].slice(-200);
      set({
        cash: newCash,
        solvencyAuditLog: newAudit,
        consecutiveDaysInDebt: newCash >= 0 ? 0 : s.consecutiveDaysInDebt,
        solvencyTier: tier,
      });
      return { ok: true };
    },

    quickSellHorse: (horseId) => {
      const s = get();
      const horse = s.horses[horseId];
      if (!horse) {
        return { ok: false, reason: "Horse not found" };
      }
      if (horse.owned === false || horse.stableId) {
        return { ok: false, reason: "Horse is not owned by player" };
      }
      if (horse.age <= 0) {
        return { ok: false, reason: "Cannot sell a foal" };
      }
      const assessed = horsePrice(horse);
      const salePrice = Math.round(assessed * SOLVENCY_THRESHOLDS.distressSaleRate);
      const cashBefore = s.cash;
      const newCash = s.cash + salePrice;
      const tier = deriveSolvencyState({
        cash: newCash,
        consecutiveDaysInDebt: s.consecutiveDaysInDebt ?? 0,
      }).tier;
      const auditEntry = {
        day: s.day,
        tier: tier as "healthy" | "warning" | "forced_sale" | "insolvent",
        cashBefore,
        cashAfter: newCash,
        delta: salePrice,
        kind: "voluntary_sale" as const,
        detail: `Voluntary distress sale of ${horse.name} (assessed $${assessed.toLocaleString()}, sold for $${salePrice.toLocaleString()})`,
      };
      const newAudit = [...(s.solvencyAuditLog ?? []), auditEntry].slice(-200);
      set({
        cash: newCash,
        horses: { ...s.horses, [horseId]: { ...horse, owned: false } },
        solvencyAuditLog: newAudit,
        consecutiveDaysInDebt: newCash >= 0 ? 0 : s.consecutiveDaysInDebt,
        solvencyTier: tier,
      });
      return { ok: true };
    },
  };
}
