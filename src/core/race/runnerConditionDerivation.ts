/**
 * runnerConditionDerivation.ts - Field context building and condition derivation
 *
 * Extracted from runnerConditions.ts for modularity.
 */

import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  FLYING_FIELD_RATIO,
  FLYING_FADE_RATIO,
  FLYING_MAX_VELOCITY_RANK,
  BATTLING_MAX_GAP,
  BATTLING_MIN_PROGRESS,
  BATTLING_MAX_VELOCITY_DIFF,
  BATTLING_MIN_FIELD_RATIO,
  BLOCKED_MIN_AHEAD,
  BLOCKED_MAX_AHEAD,
  BLOCKED_MAX_LANE_DIFF,
  BOXED_MIN_PROGRESS,
  BOXED_MAX_PROGRESS,
  DISTRESSED_FADE_RATIO,
  DISTRESSED_FIELD_RATIO,
  DISTRESSED_MIN_PROGRESS,
  FLAGGING_FADE_RATIO,
  FLAGGING_FIELD_RATIO,
  FLAGGING_MIN_PROGRESS,
  GRINDING_MIN_PROGRESS,
  GRINDING_MIN_FIELD_RATIO,
  GRINDING_FADE_RATIO,
  GRINDING_MAX_LENGTHS_BEHIND,
  SETTLED_MIN_PROGRESS,
  SETTLED_MAX_PROGRESS,
  SETTLED_FIELD_RATIO_TOLERANCE,
} from "@/constants";
import {
  METRES_PER_LENGTH,
  type FieldContext,
  type RunnerCondition,
  type RunnerHistory,
} from "./runnerConditionTypes";

/**
 * Aggregate stats about the live field, computed once per frame.
 * @param runners - All runners in the race (live and finished).
 */
export function buildFieldContext(runners: Runner[]): FieldContext {
  const live = runners.filter((r) => r.finishTime === null);
  const moving = live.filter((r) => r.velocity > 0);
  const meanVelocity = moving.length
    ? moving.reduce((s, r) => s + r.velocity, 0) / moving.length
    : 0;
  const fastestVelocity = moving.reduce((m, r) => Math.max(m, r.velocity), 0);
  const leaderPos = runners.reduce((m, r) => Math.max(m, r.position), 0);
  const velocityRank = new Map<string, number>();
  [...moving]
    .sort((a, b) => b.velocity - a.velocity || a.horseId.localeCompare(b.horseId))
    .forEach((r, i) => velocityRank.set(r.horseId, i + 1));
  return {
    meanVelocity,
    fastestVelocity,
    leaderPos,
    liveCount: live.length,
    sortedLive: [...live].sort((a, b) => a.position - b.position),
    velocityRank,
  };
}

/**
 * Smallest gap (metres) to another live runner, and whether it is ahead.
 * @param r - The runner to check.
 * @param field - Aggregate field context.
 */
function nearestRival(r: Runner, field: FieldContext): { gap: number; rival: Runner | null } {
  let gap = Infinity;
  let rival: Runner | null = null;
  for (let i = 0; i < field.sortedLive.length; i++) {
    const other = field.sortedLive[i];
    if (other.horseId === r.horseId) continue;

    const ahead = other.position - r.position;
    // Early exit: field is sorted by position ascending.
    // If this horse is further ahead than our current best gap, all subsequent horses will be even further ahead.
    if (ahead > gap) break;

    const d = Math.abs(ahead);
    if (d < gap) {
      gap = d;
      rival = other;
    }
  }
  return { gap, rival };
}

/**
 * True when another runner sits directly in front in effectively the same lane.
 * @param r - The runner to check.
 * @param field - Aggregate field context.
 */
function isBlocked(r: Runner, field: FieldContext): boolean {
  for (let i = 0; i < field.sortedLive.length; i++) {
    const other = field.sortedLive[i];
    if (other.horseId === r.horseId) continue;

    const ahead = other.position - r.position;

    // Horse is behind us or not far enough ahead
    if (ahead <= BLOCKED_MIN_AHEAD) continue;

    // Early exit: field is sorted by position ascending.
    // If this horse is too far ahead, all subsequent horses will also be too far ahead.
    if (ahead >= BLOCKED_MAX_AHEAD) break;

    if (Math.abs(other.lane - r.lane) < BLOCKED_MAX_LANE_DIFF) {
      return true;
    }
  }
  return false;
}

/**
 * Derives the badge states for one runner. Multiple states can be true at once;
 * the caller decides how many to show.
 * @param r - The runner to derive conditions for.
 * @param field - Aggregate field context.
 * @param history - Runner history (peak velocity).
 * @param distance - Race distance in metres.
 */
export function deriveRunnerConditions(
  r: Runner,
  field: FieldContext,
  history: RunnerHistory,
  distance: number,
): RunnerCondition[] {
  const conditions: RunnerCondition[] = [];
  if (r.finishTime !== null) return conditions;

  const mean = field.meanVelocity;
  const peak = Math.max(history.peakVelocity, r.velocity);
  const progress = distance > 0 ? r.position / distance : 0;
  const behindLeader = (field.leaderPos - r.position) / METRES_PER_LENGTH;
  const { gap, rival } = nearestRival(r, field);
  const fadeRatio = peak > 0 ? r.velocity / peak : 1;
  const fieldRatio = mean > 0 ? r.velocity / mean : 1;

  if (r.horse?.activeInjury) {
    conditions.push({
      id: "ailing",
      label: "Ailing",
      tone: "negative",
      detail: "Carrying an existing complaint into the race — watch for a tender action.",
    });
  }

  if (
    field.liveCount > 1 &&
    r.velocity > 0 &&
    fieldRatio >= FLYING_FIELD_RATIO &&
    fadeRatio > FLYING_FADE_RATIO &&
    (field.velocityRank.get(r.horseId) ?? 99) <= FLYING_MAX_VELOCITY_RANK
  ) {
    conditions.push({
      id: "flying",
      label: "Flying",
      tone: "positive",
      detail: "Travelling well clear of the field average and still on the bridle.",
      emphatic: true,
    });
  }

  if (
    rival &&
    gap < BATTLING_MAX_GAP &&
    progress > BATTLING_MIN_PROGRESS &&
    Math.abs(rival.velocity - r.velocity) < BATTLING_MAX_VELOCITY_DIFF &&
    fieldRatio > BATTLING_MIN_FIELD_RATIO
  ) {
    conditions.push({
      id: "battling",
      label: "Battling",
      tone: "caution",
      detail: `Head-to-head with ${rival.name} — neither giving an inch.`,
      emphatic: true,
    });
  }

  if (isBlocked(r, field) && progress > BOXED_MIN_PROGRESS && progress < BOXED_MAX_PROGRESS) {
    conditions.push({
      id: "boxed",
      label: "Boxed In",
      tone: "caution",
      detail: "No clear running — needs a gap to appear before it can be asked for an effort.",
    });
  }

  if (
    fadeRatio < DISTRESSED_FADE_RATIO ||
    (fieldRatio < DISTRESSED_FIELD_RATIO && progress > DISTRESSED_MIN_PROGRESS)
  ) {
    conditions.push({
      id: "distressed",
      label: "In Trouble",
      tone: "negative",
      detail: "Dropping away sharply — out of petrol and being nursed home.",
      emphatic: true,
    });
  } else if (
    fadeRatio < FLAGGING_FADE_RATIO &&
    fieldRatio < FLAGGING_FIELD_RATIO &&
    progress > FLAGGING_MIN_PROGRESS
  ) {
    conditions.push({
      id: "flagging",
      label: "Flagging",
      tone: "negative",
      detail: "Losing ground on its own best tempo — the effort is starting to tell.",
    });
  } else if (
    progress > GRINDING_MIN_PROGRESS &&
    fieldRatio >= GRINDING_MIN_FIELD_RATIO &&
    fadeRatio < GRINDING_FADE_RATIO &&
    behindLeader < GRINDING_MAX_LENGTHS_BEHIND
  ) {
    conditions.push({
      id: "grinding",
      label: "Grinding",
      tone: "positive",
      detail: "Not quickening, but staying on relentlessly at the same tempo.",
    });
  }

  if (
    conditions.length === 0 &&
    progress > SETTLED_MIN_PROGRESS &&
    progress < SETTLED_MAX_PROGRESS &&
    Math.abs(fieldRatio - 1) < SETTLED_FIELD_RATIO_TOLERANCE
  ) {
    conditions.push({
      id: "settled",
      label: "Settled",
      tone: "neutral",
      detail: "Travelling comfortably within itself, going the pace of the race.",
    });
  }

  return conditions;
}
