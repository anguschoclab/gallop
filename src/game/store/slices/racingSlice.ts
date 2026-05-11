/**
 * store/slices/racingSlice.ts - Racing state slice
 *
 * This file provides racing-related state and actions for training and performance
 * analytics, including horse training, pace samples, calibrated pars, and training
 * usage tracking.
 *
 * Dependencies: @/game/types (Horse), @/game/state/racingState (RacingState, createDefaultRacingState), @/core/resolver/intents (TrainingIntent, AnyIntent), @/game/uuid (generateUUID), @/game/constants/gameConstants (TRAINING_COST), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/beyer.ts (Beyer calculation)
 */

/**
 * Racing Slice
 * Racing-related state and actions for training and performance analytics
 */

import type { Horse } from "@/game/types";
import type { RacingState } from "@/game/state/racingState";
import { createDefaultRacingState } from "@/game/state/racingState";
import type { TrainingIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/core/uuid";
import { TRAINING_COST } from "@/game/constants/gameConstants";
import type { StoreSet, StoreGet } from "../types";
import type { AnyIntent } from "@/core/resolver/intents";

const TRAINING_SLOTS_PER_DAY = 2;

export type RacingSlice = RacingState & {
  trainHorse: (horseId: string, kind: TrainingIntent["trainingType"]) => void;
  setTrainingUsed: (horseId: string, count: number) => void;
  resetTrainingUsed: () => void;
  setPaceSamples: (samples: Record<number, number[]>) => void;
  setCalibratedPars: (pars: Record<number, number>) => void;
  setLastCalibrationDay: (day: number) => void;
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
  set: any,
  get: StoreGet,
  enqueueIntent: (intent: any) => void,
): RacingSlice {
  return {
    ...createDefaultRacingState(),

    trainHorse: (horseId, kind) => {
      const s = get();
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return;
      if (!horse.owned) return;
      if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return;

      // Check if horse has covering sickness or is recovering - prevent training
      if (horse.healthStatus === "covering_sickness" || horse.healthStatus === "recovering") {
        set({
          log: [
            {
              day: s.day,
              text: `Training blocked: ${horse.name} is ${horse.healthStatus === "covering_sickness" ? "sick with covering sickness (dourine)" : "recovering from illness"}. Horse cannot be trained while recovering.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
        return;
      }

      const usedToday = s.trainingUsed[horseId] || 0;
      if (usedToday >= TRAINING_SLOTS_PER_DAY) return;
      if (horse.energy < 10) return;

      const isRest = kind === "rest";
      if (!isRest && s.cash < TRAINING_COST) return;
      if (!isRest && horse.energy < 15) return;

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
      set((state: any) => ({
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
  };
}
