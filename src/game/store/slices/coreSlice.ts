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

import type { CoreState } from "@/game/store/state/coreState";
import { createDefaultCoreState } from "@/game/store/state/coreState";
import { makeUnowned } from "@/core/horse/ownership";
import type { Horse, Race, PlayerProfile } from "@/game/types";
import type { ActionResult } from "@/game/store";
import type { AnyIntent } from "@/core/resolver/intents";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { resolvePhenotype } from "@/core/horse/horseFactory";
import { horsePrice } from "@/core/horse/pricing";
import { SOLVENCY_THRESHOLDS, deriveSolvencyState } from "@/core/financial/solvency";
import type { StoreSet, StoreGet } from "../types";
import { createRaceEntryActions } from "./raceEntryActions";
import { createAdvanceDayActions } from "./advanceDayActions";
import { isPlayerOwned } from "@/core/horse/ownership";
import { asHorseId } from "@/core/types/branded";

export type CoreSlice = CoreState & {
  enqueueIntent: (intent: AnyIntent) => void;
  enterRace: (raceId: string, horseId: string) => ActionResult;
  withdrawRace: (raceId: string, horseId: string) => ActionResult;
  setRaceTactics: (raceId: string, horseId: string, jockeyInstructions: JockeyInstructions) => void;
  resolveRaceWithImpacts: (
    raceId: string,
    result: { horseId: string; position: number; time: number }[],
    runners?: Array<{ horseId: string; owned?: boolean }>,
    factorLedgers?: Record<string, import("@/core/race/factorLedger").RunnerFactorLedger>,
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
  advanceMultipleDays: (
    n: number,
    headless?: boolean,
    progressCallback?: (day: number, totalDays: number) => void,
  ) => Promise<void>;
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
  return {
    ...createDefaultCoreState(),

    enqueueIntent: (intent) => {
      set((state) => ({
        pendingIntents: [...(state.pendingIntents || []), intent],
      }));
    },

    ...createRaceEntryActions(set, get, enqueueIntent),

    ...createAdvanceDayActions(set, get),

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
      const horse = s.horses[asHorseId(horseId)];
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
      const horse = s.horses[asHorseId(horseId)];
      if (!horse) {
        return { ok: false, reason: "Horse not found" };
      }
      if (!isPlayerOwned(horse)) {
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
        horses: { ...s.horses, [horseId]: { ...horse, ownership: makeUnowned() } },
        solvencyAuditLog: newAudit,
        consecutiveDaysInDebt: newCash >= 0 ? 0 : s.consecutiveDaysInDebt,
        solvencyTier: tier,
      });
      return { ok: true };
    },
  };
}
