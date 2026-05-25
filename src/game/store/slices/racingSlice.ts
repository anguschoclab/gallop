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

import type { Horse, Race } from "@/game/types";
import type { RacingState } from "@/game/state/racingState";
import { createDefaultRacingState } from "@/game/state/racingState";
import type { TrainingIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/core/uuid";
import { TRAINING_COST } from "@/game/constants/gameConstants";
import type { StoreSet, StoreGet } from "../types";
import type { AnyIntent } from "@/core/resolver/intents";
import { simulateRace } from "@/services/raceSimulationExecutor";
import { generateHorse } from "@/game/horseGen";
import { createRng, hashStr } from "@/game/rng";

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
  ) => { ok: boolean; result?: any; reason?: string };
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

    runPrivateTrial: (horseId, opponentId, distance, surface) => {
      const s = get() as any;
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You do not own this horse." };

      const trialCost = 250;
      if (s.cash < trialCost) {
        return { ok: false, reason: `Insufficient cash. Private trial costs $${trialCost}.` };
      }

      if (horse.energy < 20) {
        return {
          ok: false,
          reason: "Horse is too fatigued to run a trial (needs at least 20 energy).",
        };
      }

      let opponent: Horse;
      let stablemate: Horse | undefined = undefined;
      if (opponentId === "pacemaker") {
        const rng = createRng(hashStr(`pacemaker_${horseId}_${s.day}`));
        opponent = generateHorse(
          {
            tier: horse.potential > 80 ? "elite" : horse.potential > 65 ? "mid" : "budget",
            owned: false,
          },
          rng,
        );
        opponent.name = "Pacemaker";
        opponent.id = "pacemaker_" + generateUUID();
      } else {
        stablemate = s.horses.find((h: Horse) => h.id === opponentId);
        if (!stablemate) return { ok: false, reason: "Stablemate not found." };
        if (stablemate.energy < 15) {
          return {
            ok: false,
            reason: "Stablemate is too fatigued to run a trial (needs at least 15 energy).",
          };
        }
        opponent = stablemate;
      }

      // Charge cash & energy
      set((state: any) => {
        const newHorses = state.horses.map((h: Horse) => {
          if (h.id === horseId) {
            return { ...h, energy: Math.max(0, h.energy - 20) };
          }
          if (stablemate && h.id === stablemate.id) {
            return { ...h, energy: Math.max(0, h.energy - 15) };
          }
          return h;
        });

        // Add a log entry for the trial
        const logEntry = {
          day: state.day,
          text: `Ran a private trial with ${horse.name} over ${distance}m (${surface}) vs ${opponent.name}.`,
        };

        // Add a transaction for the trial expense
        const transaction = {
          id: generateUUID(),
          day: state.day,
          type: "other",
          amount: -trialCost,
          description: `Private trial: ${horse.name}`,
          balanceAfter: state.cash - trialCost,
        };

        return {
          cash: state.cash - trialCost,
          horses: newHorses,
          log: [logEntry, ...(state.log || [])].slice(0, 50),
          transactions: [transaction, ...(state.transactions || [])],
        };
      });

      // Construct trial race
      const trialRace: Race = {
        id: "trial_" + generateUUID(),
        name: "Private Trial",
        day: s.day,
        distance,
        raceClass: "Allowance",
        entryFee: 0,
        purse: 0,
        fieldSize: 2,
        entries: [
          { horseId: horse.id, owned: true, weight: 126 } as any,
          { horseId: opponent.id, owned: opponent.owned, weight: 126 } as any,
        ],
        resolved: false,
        trackId: "trial_track",
        surface,
      };

      const result = simulateRace(
        trialRace,
        [horse, opponent],
        s.jockeys || [],
        s.hiredStaff || [],
        s.npcStables || [],
        undefined,
        s.day,
        true, // Record snapshots so we can view the visualizer or chart!
      );

      return { ok: true, result };
    },
  };
}
