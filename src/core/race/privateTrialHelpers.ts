/**
 * privateTrialHelpers.ts - Pure helpers for the runPrivateTrial store action.
 *
 * Extracted from racingSlice.ts so the slice action becomes a thin coordinator.
 * Each helper is pure (no store access) and under 20 lines.
 *
 * Dependencies: @/game/types (Horse, Race), @/core/horse/ownership (makeUnowned, makePlayerOwned), @/core/horse/horseFactory (generateHorse), @/core/common/rng (createRng, hashStr), @/core/uuid (generateUUID)
 * Related files: src/game/store/slices/racingSlice.ts (coordinator)
 */

import type { Horse, Race } from "@/game/types";
import { makeUnowned, makePlayerOwned } from "@/core/horse/ownership";
import { generateHorse } from "@/core/horse/horseFactory";
import { createRng, hashStr } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import type { Transaction } from "@/core/transactions/transactionTypes";

export const PRIVATE_TRIAL_COST = 250;
export const PRIVATE_TRIAL_HORSE_ENERGY_COST = 20;
export const PRIVATE_TRIAL_OPPONENT_ENERGY_COST = 15;
export const PRIVATE_TRIAL_MIN_HORSE_ENERGY = 20;
export const PRIVATE_TRIAL_MIN_OPPONENT_ENERGY = 15;

/**
 * Validate that a horse can participate in a private trial.
 * @param horse
 * @param cash
 * @returns An error reason string if invalid, or null if valid.
 */
export function validateTrialHorse(horse: Horse | undefined, cash: number): string | null {
  if (!horse) return "Horse not found.";
  if (!horse.ownership || horse.ownership.type !== "player") return "You do not own this horse.";
  if (cash < PRIVATE_TRIAL_COST)
    return `Insufficient cash. Private trial costs $${PRIVATE_TRIAL_COST}.`;
  if (horse.energy < PRIVATE_TRIAL_MIN_HORSE_ENERGY) {
    return "Horse is too fatigued to run a trial (needs at least 20 energy).";
  }
  return null;
}

/**
 * Build a synthetic pacemaker opponent matched to the horse's potential tier.
 * @param horse
 * @param currentDay
 */
export function buildPacemaker(horse: Horse, currentDay: number): Horse {
  const rng = createRng(hashStr(`pacemaker_${horse.id}_${currentDay}`));
  const opponent = generateHorse(
    {
      tier: horse.potential > 80 ? "elite" : horse.potential > 65 ? "mid" : "budget",
      ownership: makeUnowned(),
    },
    rng,
  );
  opponent.name = "Pacemaker";
  opponent.id = "pacemaker_" + generateUUID();
  return opponent;
}

/**
 * Validate that a stablemate can serve as a trial opponent.
 * @param stablemate
 * @returns The stablemate if valid, or an error reason string.
 */
export function validateStablemate(
  stablemate: Horse | undefined,
): { ok: true; horse: Horse } | { ok: false; reason: string } {
  if (!stablemate) return { ok: false, reason: "Stablemate not found." };
  if (stablemate.energy < PRIVATE_TRIAL_MIN_OPPONENT_ENERGY) {
    return {
      ok: false,
      reason: "Stablemate is too fatigued to run a trial (needs at least 15 energy).",
    };
  }
  return { ok: true, horse: stablemate };
}

/**
 * Construct the trial race object for simulation.
 * @param horse
 * @param opponent
 * @param distance
 * @param surface
 * @param currentDay
 */
export function buildTrialRace(
  horse: Horse,
  opponent: Horse,
  distance: number,
  surface: "Turf" | "Dirt" | "Synthetic",
  currentDay: number,
): Race {
  return {
    id: "trial_" + generateUUID(),
    name: "Private Trial",
    day: currentDay,
    distance,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 0,
    fieldSize: 2,
    entries: [
      { horseId: horse.id, ownership: makePlayerOwned(), weight: 126 },
      { horseId: opponent.id, ownership: opponent.ownership, weight: 126 },
    ],
    resolved: false,
    trackId: "trial_track",
    surface,
  } as Race;
}

/**
 * Apply energy cost and log/transaction entries for a private trial.
 * Returns the partial state update to merge into the store.
 * @param horses
 * @param horseId
 * @param stablemate
 * @param cash
 * @param day
 * @param log
 * @param transactions
 * @param horseName
 * @param distance
 * @param surface
 * @param opponentName
 */
export function applyTrialCosts(
  horses: Record<string, Horse>,
  horseId: string,
  stablemate: Horse | undefined,
  cash: number,
  day: number,
  log: { day: number; text: string }[],
  transactions: Transaction[],
  horseName: string,
  distance: number,
  surface: string,
  opponentName: string,
): {
  cash: number;
  horses: Record<string, Horse>;
  log: { day: number; text: string }[];
  transactions: Transaction[];
} {
  const newHorses = { ...horses };
  if (newHorses[horseId]) {
    newHorses[horseId] = {
      ...newHorses[horseId],
      energy: Math.max(0, newHorses[horseId].energy - PRIVATE_TRIAL_HORSE_ENERGY_COST),
    };
  }
  if (stablemate && newHorses[stablemate.id]) {
    newHorses[stablemate.id] = {
      ...newHorses[stablemate.id],
      energy: Math.max(0, newHorses[stablemate.id].energy - PRIVATE_TRIAL_OPPONENT_ENERGY_COST),
    };
  }

  const logEntry = {
    day,
    text: `Ran a private trial with ${horseName} over ${distance}m (${surface}) vs ${opponentName}.`,
  };

  const transaction: Transaction = {
    id: generateUUID(),
    day,
    type: "expense",
    subcategory: "other_expense",
    amount: -PRIVATE_TRIAL_COST,
    description: `Private trial: ${horseName}`,
    balanceAfter: cash - PRIVATE_TRIAL_COST,
    recurring: false,
  };

  return {
    cash: cash - PRIVATE_TRIAL_COST,
    horses: newHorses,
    log: [logEntry, ...log].slice(0, 50),
    transactions: [transaction, ...transactions],
  };
}
