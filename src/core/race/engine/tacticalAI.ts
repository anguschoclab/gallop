import { clamp } from "@/lib/math";
import type { Runner, PaceContext } from "./runnerBuilder";

/**
 * tacticalAI.ts - NPC Jockey tactical adjustments
 *
 * This file provides tactical AI for NPC jockeys during races, including
 * pace sensing, lane management, traffic avoidance, and tactic-specific behavior.
 *
 * Dependencies: @/game/math (clamp), ./runnerBuilder (Runner, PaceContext)
 * Related files: simulation.ts (uses tactical adjustments during race steps)
 */

/**
 * Calculate tactical adjustment for a runner.
 *
 * NPC jockeys adjust velocity and target lane based on pace, traffic, and
 * assigned tactics. Higher-skilled jockeys make better tactical decisions.
 *
 * @param runner - The runner to calculate adjustments for
 * @param pace - Current pace context
 * @param runners - All runners in the race
 * @returns Velocity modifier and target lane adjustment
 *
 * @example
 * const tactical = calculateTacticalAdjustment(runner, pace, runners);
 */
export function calculateTacticalAdjustment(
  runner: Runner,
  pace: PaceContext,
  runners: Runner[],
): { velocityMod: number; targetLane: number } {
  const jockey = runner.jockey;
  // If no jockey, just follow basic physics
  if (!jockey) return { velocityMod: 1.0, targetLane: runner.lane };

  const skill = (jockey.stats.pacing + jockey.stats.positioning) / 200; // 0 to 1
  const progress = runner.position / (pace.leaderPos || 1);

  let velocityMod = 1.0;
  let targetLane = runner.lane;

  // 1. Pace Sensing
  // If pace is too hot, closers/pressers should save energy
  if (pace.paceRating > 1.05 && (runner.runningStyle === "S" || runner.runningStyle === "P")) {
    if (progress < 0.6) {
      velocityMod -= 0.02 * skill * (pace.paceRating - 1);
    }
  }

  // If pace is too slow, front runners might try to "steal" it
  if (pace.paceRating < 0.92 && (runner.runningStyle === "E" || runner.runningStyle === "EP")) {
    if (progress < 0.7) {
      velocityMod += 0.015 * skill * (1 - pace.paceRating);
    }
  }

  // 2. Lane Management & Traffic
  // Check for traffic directly in front
  const horsesInFront = runners.filter(
    (r) =>
      r.horseId !== runner.horseId &&
      r.finishTime === null &&
      r.position > runner.position &&
      r.position - runner.position < 3 &&
      Math.abs(r.lane - runner.lane) < 0.5,
  );

  if (horsesInFront.length > 0) {
    // Boxed in! Try to switch lanes if skilled
    if (skill > 0.4) {
      targetLane = findBestLane(runner, pace.laneDensity);
    }
  }

  // 3. Jockey Instruction Specifics
  if (runner.jockeyInstructions?.ridingStyle === "closer" && runner.jockeyInstructions?.moveTiming === "late") {
    // Prioritize drafting and staying on rail (save energy)
    velocityMod *= 0.995;
    targetLane = 0;
  }

  if (runner.jockeyInstructions?.earlyPosition === "lead" && pace.leaderPos - runner.position < 1) {
    // Fight for the lead
    velocityMod += 0.01 * skill;
  }

  return { velocityMod, targetLane };
}

function findBestLane(runner: Runner, density: number[]): number {
  const currentIdx = Math.floor(runner.lane / 1.2);
  let bestIdx = currentIdx;
  let minDensity = density[currentIdx] || 0;

  // Check adjacent lanes
  for (let i = -1; i <= 1; i++) {
    const idx = currentIdx + i;
    if (idx >= 0 && idx < density.length) {
      if (density[idx] < minDensity) {
        minDensity = density[idx];
        bestIdx = idx;
      }
    }
  }

  return bestIdx * 1.2;
}
