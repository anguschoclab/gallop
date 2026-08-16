/**
 * draftingAI.ts - Style-aware drafting, rail-saving, and cover awareness
 *
 * Enhances the base drafting system with running-style-aware bonuses,
 * preferring the rail for closers/stalkers in late race, and identifying
 * cover (multiple horses ahead) for stamina preservation.
 *
 * Dependencies: ./runnerBuilder (Runner), ./constants (DRAFT_DISTANCE, DRAFT_SPEED_BONUS, LATE_KICK_PROGRESS_THRESHOLD)
 * Related files: simulation.ts (uses these functions during race stepping)
 */

import type { Runner } from "./runnerBuilder";
import { DRAFT_DISTANCE, DRAFT_SPEED_BONUS, LATE_KICK_PROGRESS_THRESHOLD } from "./constants";

/**
 * Style-specific draft bonus multipliers.
 * Closers and pressers benefit more from drafting (energy saving),
 * front-runners benefit less (they're usually in front).
 */
const STYLE_DRAFT_BONUS: Record<string, number> = {
  S: 1.025, // Closers get the biggest draft bonus
  P: 1.015, // Stalkers get standard bonus
  EP: 1.01, // Early-pressers get slightly less
  E: 1.005, // Front-runners rarely draft, minimal bonus
};

/**
 * Calculate style-aware draft multiplier for a runner.
 *
 * Applies a running-style-scaled speed bonus when drafting,
 * which fades in the late race (progress > 0.85).
 *
 * @param r - The runner to calculate draft for
 * @param progress - Current race progress (0-1)
 * @returns Draft multiplier
 */
export function calculateStyleAwareDraftMultiplier(r: Runner, progress: number): number {
  if (!r.draftingHorseId) return 1.0;

  // No draft bonus in late kick phase
  if (progress >= LATE_KICK_PROGRESS_THRESHOLD) {
    return 1.0;
  }

  const styleBonus = STYLE_DRAFT_BONUS[r.runningStyle] ?? DRAFT_SPEED_BONUS;
  let draftMul = styleBonus;

  // Front-runner rail bonus when drafting
  if (r.jockeyInstructions?.ridingStyle === "front_runner") {
    draftMul *= 1.005;
  }

  // Fade draft bonus as we approach late kick
  if (progress > 0.7) {
    const fadePhase =
      (LATE_KICK_PROGRESS_THRESHOLD - progress) / (LATE_KICK_PROGRESS_THRESHOLD - 0.7);
    draftMul = 1 + (draftMul - 1) * fadePhase;
  }

  return draftMul;
}

/**
 * Find the horse that the current runner is drafting behind.
 *
 * Scans the sorted field for the closest horse ahead within DRAFT_DISTANCE
 * and in a nearby lane (gap < 0.8). Prefers horses in the same lane.
 *
 * @param r - The runner checking for drafting opportunities
 * @param sortedField - Runners sorted by position (leading first)
 * @returns Horse ID being drafted, or null
 */
export function getEnhancedDraftingHorseId(r: Runner, sortedField: Runner[]): string | null {
  let bestId: string | null = null;
  let bestLaneGap = Infinity;
  let bestIsPreferredStyle = false;

  // Closers (S) and stalkers (P) prefer drafting behind front-runners (E) and early-pressers (EP)
  const runnerPrefersFrontRunners = r.runningStyle === "S" || r.runningStyle === "P";

  for (const other of sortedField) {
    if (other.horseId === r.horseId) continue;
    const gap = other.position - r.position;
    if (gap <= 0) break; // Optimization: stop early (sorted field)
    if (gap > DRAFT_DISTANCE) continue;

    const laneGap = Math.abs(other.lane - r.lane);
    if (laneGap < 0.8) {
      const isPreferredStyle =
        runnerPrefersFrontRunners && (other.runningStyle === "E" || other.runningStyle === "EP");

      // Prefer preferred-style horses even if lane gap is slightly larger
      if (isPreferredStyle && !bestIsPreferredStyle) {
        bestIsPreferredStyle = true;
        bestLaneGap = laneGap;
        bestId = other.horseId;
      } else if (isPreferredStyle === bestIsPreferredStyle && laneGap < bestLaneGap) {
        bestLaneGap = laneGap;
        bestId = other.horseId;
      }
    }
  }
  return bestId;
}

/**
 * Calculate rail-saving target lane for closers and stalkers.
 *
 * In the late race (progress > 0.5), closers (S) and stalkers (P)
 * shift toward the rail (lane 0) to save ground. Front-runners
 * and early-pressers maintain their current lane.
 *
 * @param r - The runner to calculate rail-saving lane for
 * @param progress - Current race progress (0-1)
 * @returns Target lane (0 for rail, or current lane if no rail-saving)
 */
export function calculateRailSavingLane(r: Runner, progress: number): number {
  if (progress < 0.5) return r.lane;

  if (r.runningStyle === "S" || r.runningStyle === "P") {
    // If already at or near rail, stay
    if (r.lane <= 0.1) return 0;
    // Shift toward rail
    return 0;
  }

  return r.lane;
}

/**
 * Calculate cover modifier based on horses ahead within 5m in the same lane.
 *
 * When ≥2 horses are clustered ahead within 5m in the same lane, the runner
 * has cover and should conserve energy (velocityMod *= 0.99). Otherwise,
 * the modifier is neutral (1.0).
 *
 * @param r - The runner to calculate cover for
 * @param sortedField - Runners sorted by position (leading first)
 * @returns Velocity modifier (0.99 with cover, 1.0 otherwise)
 */
export function calculateCoverModifier(r: Runner, sortedField: Runner[]): number {
  let coverCount = 0;

  for (const other of sortedField) {
    if (other.horseId === r.horseId) continue;
    if (other.finishTime !== null) continue;

    const gap = other.position - r.position;
    if (gap <= 0) break; // Optimization: stop early (sorted field)
    if (gap > 5) continue;

    const laneGap = Math.abs(other.lane - r.lane);
    if (laneGap < 0.5) {
      coverCount++;
    }
  }

  if (coverCount >= 2) return 0.99;
  return 1.0;
}
