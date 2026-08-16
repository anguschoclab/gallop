import { clamp } from "@/core/common/math";
import type { Runner, PaceContext } from "./runnerBuilder";
import {
  LANE_DENSITY_BUCKETS,
  LANE_BUCKET_WIDTH,
  LEAD_GROUP_GAP,
  PACE_BASE_VELOCITY,
  PACE_REFERENCE_DISTANCE,
  PACE_DISTANCE_FACTOR,
} from "@/constants/raceEngineConstants";

export function computePaceContext(
  runners: Runner[],
  distance: number,
  laneDensityBuffer?: number[],
): PaceContext {
  let leaderPos = 0;
  let leaderVelocity = 0;
  let totalProgress = 0;
  let alive = 0;
  const laneDensity = laneDensityBuffer ?? new Array(LANE_DENSITY_BUCKETS).fill(0);
  if (laneDensityBuffer) {
    laneDensityBuffer.fill(0);
  }

  for (const r of runners) {
    if (r.finishTime === null && r.position > leaderPos) {
      leaderPos = r.position;
      leaderVelocity = r.velocity;
    }
  }

  let leadGroupCount = 0;
  let frontRunnersInLeadGroup = 0;

  for (const r of runners) {
    if (r.finishTime === null) {
      totalProgress += r.position / distance;
      alive++;
      const laneIdx = Math.floor(r.lane / LANE_BUCKET_WIDTH);
      if (laneIdx >= 0 && laneIdx < LANE_DENSITY_BUCKETS) laneDensity[laneIdx]++;

      if (leaderPos - r.position <= LEAD_GROUP_GAP) {
        leadGroupCount++;
        if (r.runningStyle === "E") frontRunnersInLeadGroup++;
      }
    } else {
      totalProgress += 1;
    }
  }

  const expectedVel =
    PACE_BASE_VELOCITY - (distance / PACE_REFERENCE_DISTANCE) * PACE_DISTANCE_FACTOR;
  const paceRating = leaderVelocity / expectedVel;
  const pacePressure = clamp((frontRunnersInLeadGroup - 1) / 2, 0, 1);
  const progress = alive > 0 ? totalProgress / runners.length : 1;

  return {
    leaderPos,
    leaderVelocity,
    leadGroupCount,
    pacePressure,
    progress,
    laneDensity,
    paceRating,
  };
}
