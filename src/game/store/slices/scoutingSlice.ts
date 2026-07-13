/**
 * store/slices/scoutingSlice.ts - Scouting state slice
 *
 * This file provides scouting-related actions for evaluating horses in NPC stables.
 *
 * Dependencies: @/game/types (Horse, ScoutReport, Stable), @/game/scouting (scoutHorse, calculateScoutCost), @/game/uuid (generateUUID), @/lib/formatting (formatCurrency), ../types (StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/scouting.ts (scouting logic)
 */

import type { Horse, ScoutReport, Stable } from "@/game/types";
import { calculateScoutCost } from "@/core/npc/scouting";
import { generateUUID } from "@/core/uuid";
import { formatCurrency } from "@/core/common/formatting";
import type { StoreGet } from "../types";

export type ScoutingSlice = {
  /**
   * Dispatches a scout to examine a horse in an NPC stable.
   * Reports are typically ready the next day.
   */
  scoutHorse: (horseId: string) => {
    success: boolean;
    report?: ScoutReport;
    cost: number;
    message: string;
  };
  /** Sets the collection of active scout reports */
  setScoutReports: (reports: ScoutReport[]) => void;
};

/**
 * Create the scouting state slice with horse evaluation actions.
 *
 * Provides scouting actions for evaluating horses in NPC stables and scout report management.
 * Uses intent-based state updates for scouting actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Scouting slice with actions
 */
export function createScoutingSlice(
  set: any,
  get: StoreGet,
  enqueueIntent: (intent: any) => void,
): ScoutingSlice {
  return {
    scoutHorse: (horseId) => {
      const s = get();
      const horse = s.horses[horseId];
      if (!horse) {
        return { success: false, cost: 0, message: "Horse not found." };
      }
      if (!horse.stableId) {
        return { success: false, cost: 0, message: "Cannot scout your own horses." };
      }
      const stable = s.npcStables.find((st: Stable) => st.id === horse.stableId);
      if (!stable) {
        return { success: false, cost: 0, message: "Stable not found." };
      }

      const cost = calculateScoutCost(horse, stable);
      if (s.cash < cost) {
        return {
          success: false,
          cost: 0,
          message: `Insufficient funds. Scouting costs ${formatCurrency(cost)}.`,
        };
      }

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "scout",
        horseId,
        stableId: horse.stableId,
      });

      return {
        success: true,
        cost,
        message: `Scout dispatched to examine ${horse.name}. Report ready tomorrow.`,
      };
    },

    setScoutReports: (reports) => {
      set({ scoutReports: reports });
    },
  };
}
