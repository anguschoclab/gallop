/**
 * nominationActions.ts — Pure helpers for horse nomination validation and record building.
 * Extracted from racingSlice.ts per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Horse, Race), @/core/racing/nominationFees,
 *              @/core/horse/ownership, @/core/uuid
 */

import type { Horse, Race } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { generateUUID, UUID_PREFIX_LENGTH } from "@/core/uuid";
import {
  calculateNominationFee,
  getNominationTier,
  getRaceGrade,
  type NominationRecord,
  type NominationTier,
} from "@/core/racing/nominationFees";

type RaceGrade = "G1" | "G2" | "G3";

export interface NominationValidationInput {
  race: Race | undefined;
  horse: Horse | undefined;
  existingNominations: NominationRecord[];
  currentDay: number;
  cash: number;
}

export interface NominationValidationResult {
  ok: boolean;
  reason?: string;
  grade?: RaceGrade;
  tier?: NominationTier;
  fee?: number;
}

/**
 * Validate a nomination attempt and compute the fee.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Validation inputs (race, horse, existing nominations, day, cash)
 * @returns Validation result with grade/tier/fee if valid, or reason if invalid
 */
export function validateNomination(input: NominationValidationInput): NominationValidationResult {
  const { race, horse, existingNominations, currentDay, cash } = input;

  if (!race) return { ok: false, reason: "Race not found." };
  const grade = getRaceGrade(race);
  if (!grade) return { ok: false, reason: "Race is not a graded stakes race." };
  if (!horse || !isPlayerOwned(horse)) return { ok: false, reason: "You do not own this horse." };

  if (
    existingNominations.some(
      (n) => n.horseId === horse.id && n.raceId === race.id && n.status === "active",
    )
  ) {
    return { ok: false, reason: "Horse already nominated for this race." };
  }

  const daysUntilRace = race.day - currentDay;
  if (daysUntilRace < 0) return { ok: false, reason: "Nominations closed — race has passed." };

  const tier = getNominationTier(daysUntilRace);
  const fee = calculateNominationFee(grade, tier);
  if (fee === null) {
    return { ok: false, reason: `Late ${grade} nominations are closed.` };
  }
  if ((cash ?? 0) < fee) {
    return { ok: false, reason: `Insufficient cash. Fee is $${fee.toLocaleString()}.` };
  }

  return { ok: true, grade, tier, fee };
}

/**
 * Build a NominationRecord for a validated nomination.
 * Pure: returns a new record object, does not mutate state.
 *
 * @param horseId - The horse being nominated
 * @param race - The race being nominated for
 * @param grade - The race grade
 * @param tier - The nomination tier
 * @param fee - The fee paid
 * @param currentDay - The current game day
 * @returns A new NominationRecord
 */
export function buildNominationRecord(
  horseId: string,
  race: Race,
  grade: RaceGrade,
  tier: NominationTier,
  fee: number,
  currentDay: number,
): NominationRecord {
  return {
    id: `nom-${horseId}-${race.id}-${currentDay}-${generateUUID().slice(0, UUID_PREFIX_LENGTH)}`,
    horseId,
    raceId: race.id,
    raceName: race.name,
    raceDay: race.day,
    grade,
    tier,
    feePaid: fee,
    nominatedDay: currentDay,
    status: "active",
  };
}

/**
 * Build the log text for a successful nomination.
 * Pure: returns a string.
 *
 * @param horseName - The horse's name
 * @param raceName - The race name
 * @param tier - The nomination tier
 * @param fee - The fee paid
 * @returns Log entry text
 */
export function buildNominationLogText(
  horseName: string,
  raceName: string,
  tier: NominationTier,
  fee: number,
): string {
  return `Nominated ${horseName} for ${raceName} — ${tier} tier, fee $${fee.toLocaleString()}.`;
}

/**
 * Build the log text for a late nomination rejection.
 * Pure: returns a string.
 *
 * @param grade - The race grade
 * @returns Log entry text
 */
export function buildLateNominationLogText(grade: RaceGrade): string {
  return `Late nominations for ${grade} races are not accepted.`;
}
