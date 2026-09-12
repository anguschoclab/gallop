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
import { getAvailableTrainingTypes } from "@/core/facilities";
import type { StoreSet, StoreGet } from "../types";
import type { AnyIntent } from "@/core/resolver/intents";
import { simulateRace, type RaceSimulationResult } from "@/services/race/raceFacade";
import { isPlayerOwned } from "@/core/horse/ownership";
import type { NominationRecord, NominationStatus } from "@/core/racing/nominationFees";
import {
  validateTrialHorse,
  buildPacemaker,
  validateStablemate,
  buildTrialRace,
  applyTrialCosts,
} from "@/core/race/privateTrialHelpers";
import { prependLogEntry, prependLogEntries } from "@/core/common/logHelpers";
import {
  validateMilestoneResolution,
  applyMilestoneChoice,
  buildMilestoneLogText,
} from "@/core/race/foalMilestoneActions";
import { validateTraining, TRAINING_SLOTS_PER_DAY } from "@/core/race/trainingActions";
import {
  validateNomination,
  buildNominationRecord,
  buildNominationLogText,
  buildLateNominationLogText,
} from "@/core/racing/nominationActions";

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
      const isPregnant = s.pregnancies.some((p) => !p.resolved && p.damId === horseId);
      const availableTrainingTypes = s.facilities ? getAvailableTrainingTypes(s.facilities) : [];

      const validation = validateTraining({
        horse,
        horseId,
        isPregnant,
        trainingUsedToday: s.trainingUsed[horseId] || 0,
        cash: s.cash,
        availableTrainingTypes,
        requestedTrainingType: kind,
      });

      if (!validation.ok) {
        if (validation.reason) {
          set({
            log: prependLogEntry(s.log, s.day, validation.reason),
          });
        }
        return;
      }

      const usedToday = s.trainingUsed[horseId] || 0;

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
      const validationError = validateMilestoneResolution(horse, milestoneKey, choiceKey);
      if (validationError) return { ok: false, reason: validationError };

      const milestone = horse!.developmentArc!.milestones.find((m) => m.key === milestoneKey)!;
      const choice = milestone.choices.find((c) => c.key === choiceKey)!;

      set((state) => {
        const h = state.horses[horseId];
        if (!h || !h.developmentArc) return {};
        const { nextStats, nextArc } = applyMilestoneChoice(h, milestoneKey, choice, state.day);
        const logEntry = {
          day: state.day,
          text: buildMilestoneLogText(h.name, milestone.label, choice.label),
        };
        return {
          horses: {
            ...state.horses,
            [horseId]: { ...h, stats: nextStats, developmentArc: nextArc },
          },
          log: prependLogEntries(state.log || [], [logEntry]),
        };
      });

      return { ok: true };
    },

    nominateHorse: (horseId: string, raceId: string) => {
      const s = get();
      const race: Race | undefined = s.races[raceId];
      const horse: Horse | undefined = s.horses[horseId];

      const validation = validateNomination({
        race,
        horse,
        existingNominations: s.playerNominations,
        currentDay: s.day,
        cash: s.cash ?? 0,
      });

      if (!validation.ok) {
        if (validation.reason?.includes("Late") && validation.grade) {
          set({
            log: prependLogEntry(s.log, s.day, buildLateNominationLogText(validation.grade)),
          });
        }
        return { ok: false, reason: validation.reason };
      }

      const nomination = buildNominationRecord(
        horseId,
        race!,
        validation.grade!,
        validation.tier!,
        validation.fee!,
        s.day,
      );

      set({
        cash: s.cash - validation.fee!,
        playerNominations: [...s.playerNominations, nomination],
        log: prependLogEntry(
          s.log,
          s.day,
          buildNominationLogText(horse!.name, race!.name, validation.tier!, validation.fee!),
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
