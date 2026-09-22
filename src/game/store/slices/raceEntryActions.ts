import type { Horse, Race } from "@/game/types";
import type { AnyIntent } from "@/core/resolver/intents";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { findBumpableEntryIndex } from "@/core/race/entry/bumpResolver";
import { generateUUID } from "@/core/uuid";
import { requireOwned, requireHorse } from "../guards";
import type { StoreSet, StoreGet } from "../types";
import type { CoreSlice } from "./coreSlice";
import { isPlayerOwned } from "@/core/horse/ownership";
import { simulateRace } from "@/services/race/raceFacade";
import { generateRaceImpacts } from "@/core/race/raceImpactGenerator";
import { applyImpacts } from "@/core/resolver/resolver";
import { rngForRace } from "@/core/race/rngForRace";
import { isLivePlayerImpact } from "@/core/race/liveRaceImpacts";

export function createRaceEntryActions(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): Pick<
  CoreSlice,
  | "enterRace"
  | "withdrawRace"
  | "setRaceTactics"
  | "resolveRaceWithImpacts"
  | "submitClaim"
  | "withdrawClaim"
  | "purchaseInsurance"
  | "cancelInsurance"
> {
  return {
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
        const weakestIdx = findBumpableEntryIndex(race.entries, horse!, (id) => s.horses[id]);
        if (weakestIdx === -1) {
          return {
            ok: false,
            reason: "Race is full — your horse isn't rated high enough to bump an entry.",
          };
        }
        bumpEntryHorseId = race.entries[weakestIdx].horseId;
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
      if (!isPlayerOwned(horse)) return { ok: false, reason: "Horse not owned." };
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
      _runners?: Array<{ horseId: string; owned?: boolean }>,
      factorLedgers?: Record<string, import("@/core/race/factorLedger").RunnerFactorLedger>,
      snapshots?: import("@/core/race/engine/raceSnapshotTypes").RaceSnapshot[],
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
        factorLedgers,
        snapshots,
      });

      // Apply player-facing impacts immediately so cash, prestige and
      // syndicate stakes update the moment a watched race finishes; the
      // day-advance pipeline skips re-applying them (livePlayerImpactsApplied).
      try {
        const state = get();
        const race = state.races[raceId];
        if (race && !race.resolved && !race.livePlayerImpactsApplied && result.length > 0) {
          const npcAIManager = state.npcAIManager
            ? {
                ...state.npcAIManager,
                stableStates: Object.fromEntries(
                  Object.entries(state.npcAIManager.stableStates).map(([id, st]) => [
                    id,
                    { ...st },
                  ]),
                ),
              }
            : undefined;
          const { runners: impactRunners } = simulateRace(
            race,
            Object.values(state.horses),
            state.jockeys ?? [],
            state.hiredStaff ?? [],
            state.npcStables ?? [],
            npcAIManager,
            state.day,
          );
          const raceImpacts = generateRaceImpacts({
            race,
            result,
            runners: impactRunners,
            horses: Object.values(state.horses),
            jockeys: state.jockeys ?? [],
            newDay: state.day,
            hiredStaff: state.hiredStaff ?? [],
            rng: rngForRace(race),
            snapshots: [],
            calibratedPars: state.calibratedPars || {},
            raceWeatherState: undefined,
            syndicates: state.syndicates,
            narrativeArcs: state.narrativeArcs,
          });
          const liveImpacts = raceImpacts.filter(isLivePlayerImpact);
          console.error("liveImpacts", JSON.stringify(liveImpacts.map((i) => [i.type, (i as any).source, (i as any).amount, (i as any).delta])));
          const applied = applyImpacts({
            state,
            intents: [],
            impacts: liveImpacts,
            impactLog: [],
            day: state.day,
          });
          const newState = applied.state;
          set({
            ...newState,
            races: {
              ...newState.races,
              [raceId]: {
                ...newState.races[raceId],
                livePlayerImpactsApplied: true,
              },
            },
          });
        }
      } catch (e) { console.error("liveRaceImpacts error", e); /* fall back to day advance */ }
    },

    submitClaim: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = s.horses[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (isPlayerOwned(horse)) return { ok: false, reason: "Cannot claim your own horse." };

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
  };
}
