/**
 * Core Slice
 * Core game loop properties and essential state management
 */

import type { CoreState } from "@/game/state/coreState";
import { createDefaultCoreState } from "@/game/state/coreState";
import type { Horse, Race, PlayerProfile } from "@/game/types";
import type { ActionResult } from "@/game/store";

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
  advanceDay: () => void;
  advanceMultipleDays: (n: number, headless?: boolean) => void;
  advanceWeek: (headless?: boolean) => void;
  advanceMonth: (headless?: boolean) => void;
  advanceYear: (headless?: boolean) => void;
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

    advanceDay: () => {
      // Full implementation would call the day advancement pipeline
      set((state: any) => ({
        day: state.day + 1,
      }));
    },

    advanceMultipleDays: (n: number, headless?: boolean) => {
      // Full implementation would call day advancement n times
      set((state: any) => ({
        day: state.day + n,
      }));
    },

    advanceWeek: (headless?: boolean) => {
      set((state: any) => ({
        day: state.day + 7,
      }));
    },

    advanceMonth: (headless?: boolean) => {
      set((state: any) => ({
        day: state.day + 30,
      }));
    },

    advanceYear: (headless?: boolean) => {
      set((state: any) => ({
        day: state.day + 365,
      }));
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
