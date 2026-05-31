import type { StaffMember, StaffTier } from "./staffTypes";

export const PATIENCE_BY_TIER: Record<StaffTier, number> = {
  elite: 0,
  mid: 1,
  budget: 2,
};

export const FLOOR_BY_TIER: Record<StaffTier, number> = {
  elite: 0.9,
  mid: 0.8,
  budget: 0.7,
};

export type NegotiationOutcome = "accept" | "counter" | "walkaway";

export interface EvaluateOfferResult {
  outcome: NegotiationOutcome;
  counterSalary?: number;
}

/**
 * Evaluate a salary offer against the staff member's asking salary.
 *
 * Rules:
 * - Offer >= asking → accept immediately.
 * - Offer below floor OR patience exhausted → walkaway.
 * - Otherwise → counter at a value between offer+5% and offer+15%, capped at asking.
 *
 * @param staff       The staff member being negotiated with (read-only).
 * @param askingSalary The staff member's current baseline asking salary.
 * @param offerSalary  The salary the player is proposing.
 * @param roundsUsed  How many insult rounds have already been used in this session.
 */
export function evaluateOffer(
  staff: StaffMember,
  askingSalary: number,
  offerSalary: number,
  roundsUsed: number,
): EvaluateOfferResult {
  const floor = FLOOR_BY_TIER[staff.tier];
  const patience = PATIENCE_BY_TIER[staff.tier];

  if (offerSalary >= askingSalary) {
    return { outcome: "accept" };
  }

  const isInsult = offerSalary < askingSalary * floor;
  const patienceExhausted = roundsUsed >= patience;

  if (isInsult || patienceExhausted) {
    return { outcome: "walkaway" };
  }

  const bump = 0.05 + Math.random() * 0.1; // 5–15%
  const counter = Math.min(Math.round(offerSalary * (1 + bump)), askingSalary);
  return { outcome: "counter", counterSalary: counter };
}

/**
 * Returns true if the staff member is currently offended and the cooldown has not expired.
 */
export function isOffended(staff: StaffMember, currentDay: number): boolean {
  return !!staff.offended && (staff.offendedUntil === undefined || currentDay < staff.offendedUntil);
}

/**
 * Returns how many days remain in the offended cooldown, or 0 if not offended / expired.
 */
export function offendedDaysRemaining(staff: StaffMember, currentDay: number): number {
  if (!isOffended(staff, currentDay)) return 0;
  return Math.max(0, (staff.offendedUntil ?? currentDay) - currentDay);
}
