import type { CourseSpecification } from "@/data/tracks";
import type { Runner, PaceContext } from "./runnerBuilder";
import { paceShapeMul } from "./runnerBuilder";
import {
  SPRINT_SPECIALIST_DISTANCE_THRESHOLD,
  SPRINT_SPECIALIST_SPEED_BONUS,
  SPRINT_SPECIALIST_LONG_PENALTY,
  STAYING_SPECIALIST_DISTANCE_THRESHOLD,
  STAYING_SPECIALIST_SPEED_BONUS,
  STAYING_SPECIALIST_SHORT_PENALTY,
  CLOSER_INSTINCT_PROGRESS_THRESHOLD,
  CLOSER_INSTINCT_STYLE_BONUS,
  SHORT_STRAIGHT_THRESHOLD,
  LONG_STRAIGHT_THRESHOLD,
  FRONT_RUNNER_PROGRESS_THRESHOLD,
  CLOSER_PROGRESS_THRESHOLD,
  FRONT_RUNNER_BONUS,
  CLOSER_BONUS,
  FRONT_RUNNER_STYLE_MULTIPLIER,
  CLOSER_STYLE_MULTIPLIER,
  POSITIONING_BONUS_FACTOR,
  PACING_BONUS_FACTOR,
  VIGOR_BONUS_FACTOR,
  LONG_STRAIGHT_VIGOR_THRESHOLD,
  LONG_STRAIGHT_VIGOR_FACTOR,
  LATE_KICK_PROGRESS_THRESHOLD,
  LATE_KICK_MULTIPLIER,
  FRONT_RUNNER_PACE_THRESHOLD,
  FRONT_RUNNER_STYLE_PENALTY,
  STALKER_PACE_PRESSURE_THRESHOLD,
  PACE_PRESSURE_STYLE_BONUS,
} from "@/constants/raceEngineConstants";

export function calculateStyleMultiplier(
  r: Runner,
  progress: number,
  pace?: PaceContext,
  course?: CourseSpecification,
  distance?: number,
): number {
  let styleMul = paceShapeMul(r.runningStyle, progress);

  if (distance) {
    if (
      distance < SPRINT_SPECIALIST_DISTANCE_THRESHOLD &&
      r.jockey?.traits.includes("sprint_specialist")
    ) {
      styleMul *= 1 + SPRINT_SPECIALIST_SPEED_BONUS;
    }
    if (
      distance > SPRINT_SPECIALIST_DISTANCE_THRESHOLD + 600 &&
      r.jockey?.traits.includes("sprint_specialist")
    ) {
      styleMul *= 1 - SPRINT_SPECIALIST_LONG_PENALTY;
    }
    if (
      distance > STAYING_SPECIALIST_DISTANCE_THRESHOLD &&
      r.jockey?.traits.includes("staying_specialist")
    ) {
      styleMul *= 1 + STAYING_SPECIALIST_SPEED_BONUS;
    }
    if (
      distance < STAYING_SPECIALIST_DISTANCE_THRESHOLD - 800 &&
      r.jockey?.traits.includes("staying_specialist")
    ) {
      styleMul *= 1 - STAYING_SPECIALIST_SHORT_PENALTY;
    }
  }

  if (
    progress > CLOSER_INSTINCT_PROGRESS_THRESHOLD &&
    (r.runningStyle === "S" || r.runningStyle === "P") &&
    r.jockey?.traits.includes("closer_instinct")
  ) {
    styleMul *= 1 + CLOSER_INSTINCT_STYLE_BONUS;
  }

  const straight = course?.straightLength ?? 400;
  if (straight < SHORT_STRAIGHT_THRESHOLD) {
    if (r.runningStyle === "E" && progress > FRONT_RUNNER_PROGRESS_THRESHOLD) {
      const isFrontRunnerJockey = r.jockey?.archetype === "front_runner";
      const jockeyBonus =
        (r.jockey?.stats.positioning ?? 50) * POSITIONING_BONUS_FACTOR +
        (isFrontRunnerJockey ? FRONT_RUNNER_BONUS : 0);
      styleMul *= FRONT_RUNNER_STYLE_MULTIPLIER + jockeyBonus;
    }
  } else if (straight > LONG_STRAIGHT_THRESHOLD) {
    if (
      (r.runningStyle === "S" || r.runningStyle === "P") &&
      progress > CLOSER_PROGRESS_THRESHOLD
    ) {
      const isCloserJockey = r.jockey?.archetype === "closer";
      const isLongStraightPro = r.jockey?.traits.includes("long_straight_pro");
      const jockeyBonus =
        (r.jockey?.stats.pacing ?? 50) * PACING_BONUS_FACTOR + (isCloserJockey ? CLOSER_BONUS : 0);
      const traitBonus =
        progress > LONG_STRAIGHT_VIGOR_THRESHOLD && isLongStraightPro
          ? (r.jockey?.stats.vigor ?? 50) * LONG_STRAIGHT_VIGOR_FACTOR
          : 0;
      styleMul *= CLOSER_STYLE_MULTIPLIER + jockeyBonus + traitBonus;
    }
  }

  if (r.jockeyInstructions?.moveTiming === "late" && progress > LATE_KICK_PROGRESS_THRESHOLD) {
    styleMul *= LATE_KICK_MULTIPLIER + (r.jockey?.stats.vigor ?? 50) * VIGOR_BONUS_FACTOR;
  }

  if (r.runningStyle === "E" && pace && pace.leaderPos - r.position > FRONT_RUNNER_PACE_THRESHOLD) {
    styleMul *= FRONT_RUNNER_STYLE_PENALTY;
  }

  if (
    pace &&
    pace.pacePressure > 0 &&
    r.runningStyle === "S" &&
    progress > STALKER_PACE_PRESSURE_THRESHOLD
  ) {
    styleMul *= 1 + PACE_PRESSURE_STYLE_BONUS * pace.pacePressure;
  }

  return styleMul;
}
