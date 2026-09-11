import { clamp } from "@/core/common/math";
import type { Runner, PaceContext } from "./runnerBuilder";
import {
  LANE_DENSITY_BUCKETS,
  LANE_BUCKET_WIDTH,
  LEAD_GROUP_GAP,
  PACE_BASE_VELOCITY,
  PACE_REFERENCE_DISTANCE,
  PACE_DISTANCE_FACTOR,
  EP_PACE_PRESSURE_WEIGHT,
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
  const leadGroupVelocities: number[] = [];

  for (const r of runners) {
    if (r.finishTime === null) {
      totalProgress += r.position / distance;
      alive++;
      const laneIdx = Math.floor(r.lane / LANE_BUCKET_WIDTH);
      if (laneIdx >= 0 && laneIdx < LANE_DENSITY_BUCKETS) laneDensity[laneIdx]++;

      if (leaderPos - r.position <= LEAD_GROUP_GAP) {
        leadGroupCount++;
        leadGroupVelocities.push(r.velocity);
        if (r.runningStyle === "E") {
          frontRunnersInLeadGroup += 1;
        } else if (r.runningStyle === "EP") {
          frontRunnersInLeadGroup += EP_PACE_PRESSURE_WEIGHT;
        }
      }
    } else {
      totalProgress += 1;
    }
  }

  const expectedVel =
    PACE_BASE_VELOCITY - (distance / PACE_REFERENCE_DISTANCE) * PACE_DISTANCE_FACTOR;
  // Use lead-group median velocity for pace rating (robust against a single
  // runaway leader distorting the perceived pace).
  leadGroupVelocities.sort((a, b) => a - b);
  const medianVelocity =
    leadGroupVelocities.length === 0
      ? leaderVelocity
      : leadGroupVelocities[Math.floor(leadGroupVelocities.length / 2)];
  const paceRating = medianVelocity / expectedVel;
  // Normalize pressure by lead-group size so a few E runners in a large
  // lead group don't max out the pressure.
  const pacePressure = clamp((frontRunnersInLeadGroup - 1) / Math.max(2, leadGroupCount - 1), 0, 1);
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
