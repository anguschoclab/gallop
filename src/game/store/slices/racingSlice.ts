/**
 * store/slices/racingSlice.ts - Racing state slice
 *
 * This file provides racing-related state and actions for training and performance
 * analytics, including horse training, pace samples, calibrated pars, and training
 * usage tracking.
 *
 * Dependencies: @/game/types (Horse), @/game/state/racingState (RacingState, createDefaultRacingState), @/core/resolver/intents (TrainingIntent, AnyIntent), @/game/uuid (generateUUID), @/game/constants (TRAINING_COST), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/beyer.ts (Beyer calculation)
 */

/**
 * Racing Slice
 * Racing-related state and actions for training and performance analytics
 */

import type { Horse, Race } from "@/game/types";
import type { RacingState } from "@/game/store/state/racingState";
import { createDefaultRacingState } from "@/game/store/state/racingState";
import type { TrainingIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/core/uuid";
import { TRAINING_COST } from "@/constants";
import { getAvailableTrainingTypes } from "@/core/facilities";
import type { StoreSet, StoreGet } from "../types";
import type { AnyIntent } from "@/core/resolver/intents";
import type { Transaction } from "@/core/transactions/transactionTypes";
import { simulateRace, type RaceSimulationResult } from "@/services/race/raceSimulationExecutor";
import { isPlayerOwned } from "@/core/horse/ownership";
import {
  calculateNominationFee,
  getNominationTier,
  getRaceGrade,
  type NominationRecord,
  type NominationStatus,
} from "@/core/racing/nominationFees";
import {
  validateTrialHorse,
  buildPacemaker,
  validateStablemate,
  buildTrialRace,
  applyTrialCosts,
} from "@/core/race/privateTrialHelpers";
import { prependLogEntry, prependLogEntries } from "@/core/common/logHelpers";

const TRAINING_SLOTS_PER_DAY = 2;

export type RacingSlice = RacingState & {
  trainHorse: (horseId: string, kind: TrainingIntent["trainingType"]) => void;
  setTrainingUsed: (horseId: string, count: number) => void;
  resetTrainingUsed: () => void;
  setPaceSamples: (samples: Record<number, number[]>) => void;
  setCalibratedPars: (pars: Record<number, number>) => void;
  setLastCalibrationDay: (day: number) => void;
  runPrivateTrial: (
    horseId: string,
    opponentId: string,
    distance: number,
    surface: "Turf" | "Dirt" | "Synthetic",
  ) => { ok: boolean; result?: RaceSimulationResult; reason?: string };
  resolveFoalMilestone: (
    horseId: string,
    milestoneKey: string,
    choiceKey: string,
  ) => { ok: boolean; reason?: string };
  nominateHorse: (horseId: string, raceId: string) => { ok: boolean; reason?: string };
  withdrawNomination: (nominationId: string) => void;
};

/**
 * Create the racing state slice with training and performance analytics actions.
 *
 * Provides horse training, pace samples, calibrated pars, and training usage tracking.
 * Uses intent-based state updates for training actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Racing slice with state and actions
 */
export function createRacingSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): RacingSlice {
  return {
    ...createDefaultRacingState(),

    trainHorse: (horseId, kind) => {
      const s = get();
      const horse = s.horses[horseId];
      if (!horse) return;
      if (!isPlayerOwned(horse)) return;
      if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return;

      // Check if horse has covering sickness or is recovering - prevent training
      if (horse.healthStatus === "covering_sickness" || horse.healthStatus === "recovering") {
        set({
          log: prependLogEntry(
            s.log,
            s.day,
            `Training blocked: ${horse.name} is ${horse.healthStatus === "covering_sickness" ? "sick with covering sickness (dourine)" : "recovering from illness"}. Horse cannot be trained while recovering.`,
          ),
        });
        return;
      }

      const usedToday = s.trainingUsed[horseId] || 0;
      if (usedToday >= TRAINING_SLOTS_PER_DAY) return;
      if (horse.energy < 10) return;

      const isRest = kind === "rest";
      if (!isRest && s.cash < TRAINING_COST) return;
      if (!isRest && horse.energy < 15) return;

      // Facility gate: reject if training type not unlocked
      if (s.facilities) {
        const available = getAvailableTrainingTypes(s.facilities);
        if (!available.includes(kind)) {
          set({
            log: prependLogEntry(
              s.log,
              s.day,
              `Training blocked: ${kind} is not available at your current facility level. Upgrade your barn or build the required facility.`,
            ),
          });
          return;
        }
      }

      // Enqueue TrainingIntent for next day advance
      const intent: TrainingIntent = {
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "training",
        horseId,
        trainingType: kind,
      };

      enqueueIntent(intent);

      set({
        trainingUsed: { ...s.trainingUsed, [horseId]: usedToday + 1 },
      });
    },

    setTrainingUsed: (horseId, count) => {
      set((state) => ({
        trainingUsed: { ...state.trainingUsed, [horseId]: count },
      }));
    },

    resetTrainingUsed: () => {
      set({ trainingUsed: {} });
    },

    setPaceSamples: (samples) => {
      set({ paceSamples: samples });
    },

    setCalibratedPars: (pars) => {
      set({ calibratedPars: pars });
    },

    setLastCalibrationDay: (day) => {
      set({ lastCalibrationDay: day });
    },

    runPrivateTrial: (horseId, opponentId, distance, surface) => {
      const s = get();
      const horse = s.horses[horseId];
      const validationError = validateTrialHorse(horse, s.cash);
      if (validationError) return { ok: false, reason: validationError };

      let opponent: Horse;
      let stablemate: Horse | undefined = undefined;
      if (opponentId === "pacemaker") {
        opponent = buildPacemaker(horse!, s.day);
      } else {
        stablemate = s.horses[opponentId];
        const stablemateResult = validateStablemate(stablemate);
        if (!stablemateResult.ok) return { ok: false, reason: stablemateResult.reason };
        opponent = stablemateResult.horse;
      }

      // Charge cash & energy, append log + transaction
      set((state) => ({
        ...applyTrialCosts(
          state.horses,
          horseId,
          stablemate,
          state.cash,
          state.day,
          state.log || [],
          state.transactions || [],
          horse!.name,
          distance,
          surface,
          opponent.name,
        ),
      }));

      // Construct and run the trial race
      const trialRace = buildTrialRace(horse!, opponent, distance, surface, s.day);
      const result = simulateRace(
        trialRace,
        [horse!, opponent],
        s.jockeys || [],
        s.hiredStaff || [],
        s.npcStables || [],
        undefined,
        s.day,
        true, // Record snapshots so we can view the visualizer or chart!
      );

      return { ok: true, result };
    },

    resolveFoalMilestone: (horseId, milestoneKey, choiceKey) => {
      const s = get();
      const horse = s.horses[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!isPlayerOwned(horse)) return { ok: false, reason: "You do not own this horse." };
      const arc = horse.developmentArc;
      if (!arc) return { ok: false, reason: "This horse has no development arc." };
      const milestone = arc.milestones.find((m) => m.key === milestoneKey);
      if (!milestone) return { ok: false, reason: "Milestone not found." };
      if (milestone.status !== "pending") {
        return { ok: false, reason: "Milestone already resolved." };
      }
      const choice = milestone.choices.find((c) => c.key === choiceKey);
      if (!choice) return { ok: false, reason: "Choice not found." };

      set((state) => {
        const newHorses = { ...state.horses };
        const h = newHorses[horseId];
        if (h) {
          const currentArc = h.developmentArc;
          if (currentArc) {
            const targetMilestone = currentArc.milestones.find((m) => m.key === milestoneKey);
            if (targetMilestone && targetMilestone.status === "pending") {
              const nextStats = { ...h.stats };
              for (const [stat, delta] of Object.entries(choice.delta) as [
                keyof typeof nextStats,
                number,
              ][]) {
                if (typeof delta !== "number") continue;
                const current = nextStats[stat] ?? 0;
                nextStats[stat] = Math.round(Math.max(0, Math.min(100, current + delta)));
              }

              const nextMilestones = currentArc.milestones.map((m) =>
                m.key === milestoneKey
                  ? {
                      ...m,
                      status: "resolved" as const,
                      resolvedChoiceKey: choiceKey,
                      resolvedOnDay: state.day,
                    }
                  : m,
              );

              newHorses[horseId] = {
                ...h,
                stats: nextStats,
                developmentArc: { milestones: nextMilestones },
              };
            }
          }
        }

        const logEntry = {
          day: state.day,
          text: `${horse.name}: ${milestone.label} — chose "${choice.label}".`,
        };

        return {
          horses: newHorses,
          log: prependLogEntries(state.log || [], [logEntry]),
        };
      });

      return { ok: true };
    },

    nominateHorse: (horseId: string, raceId: string) => {
      const s = get();
      const race: Race | undefined = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      const grade = getRaceGrade(race);
      if (!grade) return { ok: false, reason: "Race is not a graded stakes race." };
      const horse: Horse | undefined = s.horses[horseId];
      if (!horse || !isPlayerOwned(horse))
        return { ok: false, reason: "You do not own this horse." };

      const existing: NominationRecord[] = s.playerNominations;
      if (
        existing.some((n) => n.horseId === horseId && n.raceId === raceId && n.status === "active")
      ) {
        return { ok: false, reason: "Horse already nominated for this race." };
      }

      const daysUntilRace = race.day - s.day;
      if (daysUntilRace < 0) return { ok: false, reason: "Nominations closed — race has passed." };
      const tier = getNominationTier(daysUntilRace);
      const fee = calculateNominationFee(grade, tier);
      if (fee === null) {
        set({
          log: prependLogEntry(
            s.log,
            s.day,
            `Late nominations for ${grade} races are not accepted.`,
          ),
        });
        return { ok: false, reason: `Late ${grade} nominations are closed.` };
      }
      if ((s.cash ?? 0) < fee) {
        return { ok: false, reason: `Insufficient cash. Fee is $${fee.toLocaleString()}.` };
      }

      const nomination: NominationRecord = {
        id: `nom-${horseId}-${raceId}-${s.day}-${generateUUID().slice(0, 6)}`,
        horseId,
        raceId,
        raceName: race.name,
        raceDay: race.day,
        grade,
        tier,
        feePaid: fee,
        nominatedDay: s.day,
        status: "active",
      };

      set({
        cash: s.cash - fee,
        playerNominations: [...existing, nomination],
        log: prependLogEntry(
          s.log,
          s.day,
          `Nominated ${horse.name} for ${race.name} — ${tier} tier, fee $${fee.toLocaleString()}.`,
        ),
      });
      return { ok: true };
    },

    withdrawNomination: (nominationId: string) => {
      set((state) => ({
        playerNominations: state.playerNominations.map((n) =>
          n.id === nominationId ? { ...n, status: "scratched" as NominationStatus } : n,
        ),
        log: prependLogEntry(state.log, state.day, `Nomination withdrawn (fee non-refundable).`),
      }));
    },
  };
}
