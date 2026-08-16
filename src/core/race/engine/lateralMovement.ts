import type { Runner, PaceContext } from "./runnerBuilder";
import { calculateRailSavingLane } from "./draftingAI";
import {
  LANE_WIDTH,
  MAX_LATERAL_SPEED,
  LANE_GAP_THRESHOLD,
  POSITION_GAP_THRESHOLD,
  LATERAL_DIFF_THRESHOLD,
  STALKER_PROGRESS_THRESHOLD,
  OUTSIDE_PROGRESS_THRESHOLD,
  LEAD_PROGRESS_THRESHOLD,
  CONGESTED_LANE_PROGRESS_THRESHOLD,
  CONGESTED_LANE_DENSITY_THRESHOLD,
  LANE_POSITION_GAP_THRESHOLD,
  MIN_BLOCK_GAP,
  INSIDE_OVERTAKE_DENSITY_ADVANTAGE,
} from "@/constants/raceEngineConstants";

export function calculateTargetLane(
  r: Runner,
  progress: number,
  sortedField?: Runner[],
  pace?: PaceContext,
): number {
  let targetLane = 0;
  if (r.runningStyle === "S" && progress < STALKER_PROGRESS_THRESHOLD) targetLane = 1;

  if (r.jockeyInstructions?.ridingStyle === "front_runner") targetLane = 0;
  if (r.jockeyInstructions?.ridingStyle === "closer" && progress < OUTSIDE_PROGRESS_THRESHOLD)
    targetLane = 2;
  if (r.jockeyInstructions?.earlyPosition === "lead" && progress < LEAD_PROGRESS_THRESHOLD)
    targetLane = 0;

  if (sortedField && pace) {
    const laneIdx = Math.floor(r.lane / LANE_WIDTH);
    if (
      laneIdx === 0 &&
      pace.laneDensity[0] > CONGESTED_LANE_DENSITY_THRESHOLD &&
      progress < CONGESTED_LANE_PROGRESS_THRESHOLD
    ) {
      if (r.position < pace.leaderPos - LANE_POSITION_GAP_THRESHOLD) targetLane = 1;
    }

    for (const other of sortedField) {
      if (other.horseId === r.horseId) continue;
      const gap = other.position - r.position;
      if (gap <= 0) break;
      if (gap >= POSITION_GAP_THRESHOLD) continue;

      const laneGap = Math.abs(other.lane - r.lane);
      if (laneGap < LANE_GAP_THRESHOLD && gap >= MIN_BLOCK_GAP) {
        const insideDensity = laneIdx > 0 ? (pace.laneDensity[laneIdx - 1] ?? 0) : Infinity;
        const outsideDensity = pace.laneDensity[laneIdx + 1] ?? 0;
        if (laneIdx > 0 && insideDensity + INSIDE_OVERTAKE_DENSITY_ADVANTAGE <= outsideDensity) {
          targetLane = laneIdx - 1;
        } else {
          targetLane = Math.min(10, laneIdx + 1);
        }
        break;
      }
    }
  }

  const railLane = calculateRailSavingLane(r, progress);
  if (railLane !== r.lane) {
    targetLane = Math.floor(railLane / LANE_WIDTH);
  }

  return targetLane;
}

export function updateLanePosition(r: Runner, targetLane: number, dt: number): void {
  const targetPos = targetLane * LANE_WIDTH;
  const lateralDiff = targetPos - r.lane;
  if (Math.abs(lateralDiff) > LATERAL_DIFF_THRESHOLD) {
    const step = Math.sign(lateralDiff) * Math.min(Math.abs(lateralDiff), MAX_LATERAL_SPEED * dt);
    r.lane += step;
  }
  r.targetLane = targetLane;
}
