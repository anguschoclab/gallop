/**
 * Racing Slice
 * Racing-related state and actions for training and performance analytics
 */

import type { Horse } from "@/game/types";
import type { RacingState } from "@/game/state/racingState";
import { createDefaultRacingState } from "@/game/state/racingState";
import type { TrainingIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/game/uuid";
import { TRAINING_COST } from "@/game/constants/gameConstants";

const TRAINING_SLOTS_PER_DAY = 2;

export type RacingSlice = RacingState & {
  trainHorse: (horseId: string, kind: TrainingIntent["trainingType"]) => void;
  setTrainingUsed: (horseId: string, count: number) => void;
  resetTrainingUsed: () => void;
  setPaceSamples: (samples: Record<number, number[]>) => void;
  setCalibratedPars: (pars: Record<number, number>) => void;
  setLastCalibrationDay: (day: number) => void;
};

export function createRacingSlice(
  set: any,
  get: any,
  enqueueIntent: (intent: TrainingIntent) => void,
): RacingSlice {
  return {
    ...createDefaultRacingState(),

    trainHorse: (horseId, kind) => {
      const s = get();
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return;
      if (!horse.owned) return;
      if (s.pregnancies.some((p: any) => !p.resolved && p.damId === horseId)) return;
      
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
      
      if (kind === "rest") {
        // Rest is immediate, not queued
        const updatedHorses = s.horses.map((h: Horse) =>
          h.id === horseId ? { ...h, energy: Math.min(100, h.energy + 30) } : h,
        );
        set({
          horses: updatedHorses,
          trainingUsed: { ...s.trainingUsed, [horseId]: usedToday + 1 },
        });
      } else {
        if (s.cash < TRAINING_COST) return;
        if (horse.energy < 15) return;

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
          cash: s.cash - TRAINING_COST,
          trainingUsed: { ...s.trainingUsed, [horseId]: usedToday + 1 },
        });
      }
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
