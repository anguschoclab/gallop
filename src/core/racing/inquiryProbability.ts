/**
 * inquiryProbability.ts — Pure function for computing stewards inquiry probability.
 *
 * Base 5%, escalated by race conditions. Capped at 1.0.
 */

export interface InquiryContext {
  /** Whether the finish was decided by a photo (margin < 0.05s) */
  isPhotoFinish?: boolean;
  /** Grade of the race, if graded */
  grade?: "G1" | "G2" | "G3" | null;
  /** Whether a foul flag was raised by the simulation */
  foulFlagged?: boolean;
}

const BASE = 0.05;
const PHOTO_FINISH_BONUS = 0.10;
const G1_BONUS = 0.15;
const G2_BONUS = 0.08;
const G3_BONUS = 0.05;
const FOUL_FLAG_BONUS = 0.25;

/**
 * Calculate the probability of a stewards inquiry being raised for a race.
 *
 * @param context - Race conditions that affect inquiry likelihood
 * @returns Probability in [0, 1]
 */
export function calculateInquiryProbability(context: InquiryContext): number {
  let p = BASE;

  if (context.isPhotoFinish) p += PHOTO_FINISH_BONUS;

  if (context.grade === "G1") p += G1_BONUS;
  else if (context.grade === "G2") p += G2_BONUS;
  else if (context.grade === "G3") p += G3_BONUS;

  if (context.foulFlagged) p += FOUL_FLAG_BONUS;

  return Math.min(1.0, p);
}
