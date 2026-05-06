/**
 * Core Slice
 * Core game loop properties and essential state management
 */

import type { CoreState } from "@/game/state/coreState";
import { createDefaultCoreState } from "@/game/state/coreState";
import type { Horse, Race, PlayerProfile } from "@/game/types";
import type { ActionResult } from "@/game/store";
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
import { purchaseResolutionPhase } from "@/core/time/phases/purchaseResolution";
import { breedingResolutionPhase } from "@/core/time/phases/breedingResolution";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { claimingWithdrawalPhase } from "@/core/time/phases/claimingWithdrawal";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { impactApplicationPhase } from "@/core/time/phases/impactApplication";
import { createRng, hashStr } from "@/game/rng";
import { getCurrentYear } from "@/game/raceSchedule";
import { computePlayerRaceDays } from "@/core/time/advance";
import { UPKEEP_PER_HORSE } from "@/game/constants/gameConstants";
import { getEngineWorker } from "@/game/store";

export type CoreSlice = CoreState & {
  enterRace: (raceId: string, horseId: string) => ActionResult;
  withdrawRace: (raceId: string, horseId: string) => ActionResult;
  resolveRaceWithImpacts: (
    raceId: string,
    result: { horseId: string; position: number; time: number }[],
    runners?: any[],
  ) => void;
  submitClaim: (raceId: string, horseId: string) => ActionResult;
  withdrawClaim: (raceId: string, horseId: string) => ActionResult;
  advanceDay: (progressCallback?: (stage: number, total: number, name: string) => void) => Promise<void>;
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
};

export function createCoreSlice(set: any, get: any): CoreSlice {
  return {
    ...createDefaultCoreState(),

    enterRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (horse.energy < 50) return { ok: false, reason: "Horse lacks sufficient energy." };
      if (race.entries.some((e: any) => e.horseId === horseId))
        return { ok: false, reason: "Horse already entered." };

      set({
        races: s.races.map((r: Race) =>
          r.id === raceId
            ? {
                ...r,
                entries: [
                  ...r.entries,
                  {
                    horseId,
                    jockeyId: undefined,
                    scratched: false,
                  },
                ],
              }
            : r,
        ),
        log: [
          {
            day: s.day,
            text: `${horse.name} entered in ${race.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    withdrawRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      const entry = race.entries.find((e: any) => e.horseId === horseId);
      if (!entry) return { ok: false, reason: "Horse not entered in this race." };

      set({
        races: s.races.map((r: Race) =>
          r.id === raceId
            ? {
                ...r,
                entries: r.entries.filter((e: any) => e.horseId !== horseId),
              }
            : r,
        ),
        log: [
          {
            day: s.day,
            text: `Horse withdrawn from ${race.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    resolveRaceWithImpacts: (
      raceId: string,
      result: { horseId: string; position: number; time: number }[],
      runners?: any[],
    ) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return;

      // Update race with results
      set({
        races: s.races.map((r: Race) =>
          r.id === raceId ? { ...r, resolved: true, results: result } : r,
        ),
      });
    },

    submitClaim: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (horse.owned) return { ok: false, reason: "Cannot claim your own horse." };

      set({
        races: s.races.map((r: Race) =>
          r.id === raceId
            ? {
                ...r,
                entries: r.entries.map((e: any) =>
                  e.horseId === horseId ? { ...e, claimed: true } : e,
                ),
              }
            : r,
        ),
        log: [
          {
            day: s.day,
            text: `Claim submitted for ${horse.name} in ${race.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    withdrawClaim: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };

      set({
        races: s.races.map((r: Race) =>
          r.id === raceId
            ? {
                ...r,
                entries: r.entries.map((e: any) =>
                  e.horseId === horseId ? { ...e, claimed: false } : e,
                ),
              }
            : r,
        ),
        log: [
          {
            day: s.day,
            text: `Claim withdrawn for horse in ${race.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
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

      // Call engine worker to execute pipeline
      const engineWorker = getEngineWorker();
      const result = await engineWorker.advanceDay({
        state: { ...s, horses },
        newDay,
        progressCallback,
      });

      const { state: finalState, logs: newLogs } = result;

      set({
        day: newDay,
        cash: finalState.cash,
        horses: finalState.horses,
        market: finalState.market,
        races: finalState.races,
        trainingUsed: {},
        pregnancies: finalState.pregnancies,
        calibratedPars: finalState.calibratedPars,
        lastCalibrationDay: finalState.lastCalibrationDay,
        npcStables: finalState.npcStables,
        scoutReports: finalState.scoutReports,
        auctions: finalState.auctions,
        awards: finalState.awards,
        lastAwardYear: finalState.lastAwardYear,
        pendingAwardCeremonies: finalState.pendingAwardCeremonies,
        currentCeremonyIndex: finalState.currentCeremonyIndex,
        industryMeanEarnings: finalState.industryMeanEarnings,
        industryEarningsUpdatedDay: finalState.industryEarningsUpdatedDay,
        sireLeaderboards: finalState.sireLeaderboards,
        sireTrendHistory: finalState.sireTrendHistory,
        leaderboardsUpdatedDay: finalState.leaderboardsUpdatedDay,
        jockeys: finalState.jockeys,
        campaigns: finalState.campaigns,
        expenses: finalState.expenses,
        transactions: finalState.transactions,
        reputation: finalState.reputation,
        transports: finalState.transports,
        hallOfFame: finalState.hallOfFame,
        npcAIManager: finalState.npcAIManager,
        pendingIntents: [], // Clear pending intents after processing
        log: [
          ...newLogs,
          { day: newDay, text: `Day ${newDay} begins. Upkeep: $${playerUpkeep}.` },
          ...s.log,
        ].slice(0, 50),
      });
    },

    advanceMultipleDays: async (n: number, headless?: boolean) => {
      const s = get();
      // Pre-compute player race days for O(1) lookup
      const playerRaceDays = computePlayerRaceDays(s.races, s.day + 1, s.day + n);

      for (let i = 0; i < n; i++) {
        const currentS = get();
        const nextDay = currentS.day + 1;

        // O(1) lookup instead of O(n) array.find
        if (playerRaceDays.has(nextDay) && !headless) {
          const playerRace = currentS.races.find(
            (r: Race) => !r.resolved && r.day === nextDay && r.entries.some((e: any) => e.owned),
          );
          if (playerRace) {
            set({ pendingPlayerRaceId: playerRace.id });
            return;
          }
        }

        await get().advanceDay();
      }
    },

    advanceWeek: async (headless?: boolean) => {
      await get().advanceMultipleDays(7, headless);
    },

    advanceMonth: async (headless?: boolean) => {
      await get().advanceMultipleDays(30, headless);
    },

    advanceYear: async (headless?: boolean) => {
      await get().advanceMultipleDays(365, headless);
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
      set((state: any) => ({
        log: [entry, ...state.log].slice(0, 50),
      }));
    },
  };
}
