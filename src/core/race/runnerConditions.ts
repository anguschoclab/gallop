/**
 * runnerConditions.ts — Derives in-running "condition" states and a mood reading
 * for each runner from the live simulation snapshot.
 *
 * These are presentation-layer readings only: nothing here mutates the runner or
 * feeds back into the physics. Everything is a pure function of the current
 * runner snapshot, the field context, and a small amount of per-runner history
 * (peak velocity) that the caller keeps.
 *
 * Dependencies: @/core/race/engine/runnerBuilder (Runner)
 * Related files: src/components/race/RunnerConditionBadges.tsx, src/components/race/RunnerMoodFace.tsx
 */

import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  FLYING_FIELD_RATIO,
  FLYING_FADE_RATIO,
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
  MOOD_BASE_SCORE,
  MOOD_HANDY_BONUS,
  MOOD_STRANDED_PENALTY,
  MOOD_COVERED_BONUS,
  MOOD_TOO_SOON_PENALTY,
  MOOD_MIDFIELD_BONUS,
  MOOD_TRAVELLING_BONUS,
  MOOD_FLAGGING_PENALTY,
  MOOD_DISTRESSED_PENALTY,
  MOOD_BOXED_PENALTY,
  MOOD_BATTLING_PENALTY,
  MOOD_AILING_PENALTY,
  MOOD_HANDY_LENGTHS,
  MOOD_STRANDED_LENGTHS,
  MOOD_COVERED_LENGTHS,
  MOOD_TOO_SOON_LENGTHS,
  MOOD_MIDFIELD_MAX_LENGTHS,
  MOOD_EARLY_PHASE_PROGRESS,
  MOOD_PLACID_TEMPERAMENT,
  MOOD_FRETFUL_TEMPERAMENT,
  MOOD_PLACID_TOLERANCE,
  MOOD_FRETFUL_TOLERANCE,
  MOOD_DEFAULT_TOLERANCE,
  MOOD_HAPPY_THRESHOLD,
  MOOD_NEUTRAL_THRESHOLD,
  MOOD_MIN_SCORE,
  MOOD_MAX_SCORE,
} from "@/constants";

/** Metres per length, used to phrase gaps the way a race caller would. */
export const METRES_PER_LENGTH = 2.4;

export type ConditionTone = "positive" | "caution" | "negative" | "neutral";

export type RunnerConditionId =
  "flying" | "battling" | "boxed" | "grinding" | "flagging" | "distressed" | "ailing" | "settled";

export interface RunnerCondition {
  id: RunnerConditionId;
  label: string;
  tone: ConditionTone;
  /** Short explanation shown on hover. */
  detail: string;
  /** Whether the badge should animate for urgency. */
  emphatic?: boolean;
}

export interface FieldContext {
  meanVelocity: number;
  fastestVelocity: number;
  leaderPos: number;
  liveCount: number;
  /** Live runners sorted by position, ascending. */
  sortedLive: Runner[];
}

export interface RunnerHistory {
  /** Highest velocity this runner has reached so far in the race. */
  peakVelocity: number;
}

export type MoodFace = "happy" | "neutral" | "unhappy";

export interface MoodBreakdownItem {
  /** Human-readable sub-signal name. */
  signal: string;
  /** Signed point contribution to the mood score. */
  contribution: number;
  /** One-line explanation of why this signal fired. */
  description: string;
}

export interface RunnerMood {
  score: number;
  face: MoodFace;
  label: string;
  reasons: string[];
  /** Exact sub-signal contributions that make up the score. */
  breakdown: MoodBreakdownItem[];
}

/** Aggregate stats about the live field, computed once per frame. */
export function buildFieldContext(runners: Runner[]): FieldContext {
  const live = runners.filter((r) => r.finishTime === null);
  const moving = live.filter((r) => r.velocity > 0);
  const meanVelocity = moving.length
    ? moving.reduce((s, r) => s + r.velocity, 0) / moving.length
    : 0;
  const fastestVelocity = moving.reduce((m, r) => Math.max(m, r.velocity), 0);
  const leaderPos = runners.reduce((m, r) => Math.max(m, r.position), 0);
  return {
    meanVelocity,
    fastestVelocity,
    leaderPos,
    liveCount: live.length,
    sortedLive: [...live].sort((a, b) => a.position - b.position),
  };
}

/** Smallest gap (metres) to another live runner, and whether it is ahead. */
function nearestRival(r: Runner, field: FieldContext): { gap: number; rival: Runner | null } {
  let gap = Infinity;
  let rival: Runner | null = null;
  for (const other of field.sortedLive) {
    if (other.horseId === r.horseId) continue;
    const d = Math.abs(other.position - r.position);
    if (d < gap) {
      gap = d;
      rival = other;
    }
  }
  return { gap, rival };
}

/** True when another runner sits directly in front in effectively the same lane. */
function isBlocked(r: Runner, field: FieldContext): boolean {
  return field.sortedLive.some((other) => {
    if (other.horseId === r.horseId) return false;
    const ahead = other.position - r.position;
    return (
      ahead > BLOCKED_MIN_AHEAD &&
      ahead < BLOCKED_MAX_AHEAD &&
      Math.abs(other.lane - r.lane) < BLOCKED_MAX_LANE_DIFF
    );
  });
}

/**
 * Derives the badge states for one runner. Multiple states can be true at once;
 * the caller decides how many to show.
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

  // A pre-existing complaint is worth flagging the whole way round.
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
    fadeRatio > FLYING_FADE_RATIO
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

const STYLE_LABEL: Record<string, string> = {
  E: "front-runner",
  EP: "pace-presser",
  P: "midfield type",
  S: "closer",
};

/**
 * Derives how happy the horse is with where it finds itself, from its running
 * style versus its current place in the run, the traffic around it, how it is
 * travelling relative to its own peak, and its temperament.
 */
export function deriveRunnerMood(
  r: Runner,
  field: FieldContext,
  history: RunnerHistory,
  distance: number,
  conditions: RunnerCondition[] = [],
): RunnerMood {
  const reasons: string[] = [];
  const breakdown: MoodBreakdownItem[] = [];
  let score = MOOD_BASE_SCORE;

  if (r.finishTime !== null) {
    return {
      score: MOOD_BASE_SCORE,
      face: "neutral",
      label: "Race complete",
      reasons: ["Has completed the race."],
      breakdown: [],
    };
  }

  const progress = distance > 0 ? r.position / distance : 0;
  const lengthsBack = (field.leaderPos - r.position) / METRES_PER_LENGTH;
  const style = r.runningStyle ?? "P";
  const styleLabel = STYLE_LABEL[style] ?? "runner";
  const early = progress < MOOD_EARLY_PHASE_PROGRESS;

  // Running-line fit: does its current place suit the way it likes to race?
  let runningStyleFit = 0;
  let runningStyleDescription = `Position is acceptable for a ${styleLabel}.`;
  const wantsFront = style === "E" || style === "EP";
  const wantsBack = style === "S";
  if (wantsFront) {
    if (lengthsBack <= MOOD_HANDY_LENGTHS) {
      runningStyleFit += MOOD_HANDY_BONUS;
      runningStyleDescription = `Handy on the pace, exactly where a ${styleLabel} wants to be.`;
      reasons.push(runningStyleDescription);
    } else if (lengthsBack > MOOD_STRANDED_LENGTHS) {
      runningStyleFit -= MOOD_STRANDED_PENALTY;
      runningStyleDescription = `A ${styleLabel} stranded ${Math.round(lengthsBack)} lengths off the lead.`;
      reasons.push(runningStyleDescription);
    }
  } else if (wantsBack) {
    if (early && lengthsBack >= MOOD_COVERED_LENGTHS) {
      runningStyleFit += MOOD_COVERED_BONUS;
      runningStyleDescription = `Dropped out and covered up, ideal for a ${styleLabel}.`;
      reasons.push(runningStyleDescription);
    } else if (early && lengthsBack <= MOOD_TOO_SOON_LENGTHS) {
      runningStyleFit -= MOOD_TOO_SOON_PENALTY;
      runningStyleDescription = `A ${styleLabel} forced to make its own running too soon.`;
      reasons.push(runningStyleDescription);
    }
  } else if (lengthsBack > MOOD_HANDY_LENGTHS && lengthsBack < MOOD_MIDFIELD_MAX_LENGTHS) {
    runningStyleFit += MOOD_MIDFIELD_BONUS;
    runningStyleDescription = `Tracking the pace in midfield, the trip a ${styleLabel} enjoys.`;
    reasons.push(runningStyleDescription);
  }
  score += runningStyleFit;

  // How it is travelling against its own best tempo and the field.
  let peakFade = 0;
  let peakFadeDescription = "Holding its own against the tempo.";
  const peak = Math.max(history.peakVelocity, r.velocity);
  const fadeRatio = peak > 0 ? r.velocity / peak : 1;
  const fieldRatio = field.meanVelocity > 0 ? r.velocity / field.meanVelocity : 1;
  if (fieldRatio >= FLYING_FIELD_RATIO && fadeRatio > FLYING_FADE_RATIO) {
    peakFade += MOOD_TRAVELLING_BONUS;
    peakFadeDescription = "Travelling above the field average and still on the bridle.";
    reasons.push("Moving strongly, well on top of the tempo.");
  }
  if (fadeRatio < FLAGGING_FADE_RATIO) {
    const penalty = fadeRatio < DISTRESSED_FADE_RATIO ? MOOD_DISTRESSED_PENALTY : MOOD_FLAGGING_PENALTY;
    peakFade -= penalty;
    peakFadeDescription =
      fadeRatio < DISTRESSED_FADE_RATIO
        ? "Severe fade off its own best tempo."
        : "Starting to fade off its own best tempo.";
    reasons.push("Off its own best tempo — feeling the effort.");
  }
  score += peakFade;

  // Traffic / conditions that make the trip harder.
  let traffic = 0;
  let trafficDescription = "No traffic pressure at the moment.";
  for (const c of conditions) {
    if (c.id === "boxed") {
      traffic -= MOOD_BOXED_PENALTY;
      trafficDescription = "Blocked in with no clear running.";
      reasons.push("No clear running, and resenting the traffic.");
    }
    if (c.id === "battling") {
      traffic -= MOOD_BATTLING_PENALTY;
      trafficDescription = "Locked in a duel with a rival.";
      reasons.push("Locked in a duel and being kept up to its work.");
    }
    if (c.id === "ailing") {
      traffic -= MOOD_AILING_PENALTY;
      trafficDescription = "Racing with an active injury.";
      reasons.push("Racing with a complaint.");
    }
  }
  score += traffic;

  breakdown.push(
    { signal: "Running style fit", contribution: runningStyleFit, description: runningStyleDescription },
    { signal: "Peak fade", contribution: peakFade, description: peakFadeDescription },
    { signal: "Traffic", contribution: traffic, description: trafficDescription },
  );

  // Temperament decides how much the horse minds an awkward trip.
  const temperament = r.horse?.stats?.temperament ?? r.horse?.temperament ?? MOOD_BASE_SCORE;
  let temperamentContribution = 0;
  let temperamentDescription = "Moderate temperament, no adjustment.";
  if (score < MOOD_BASE_SCORE) {
    const deficit = MOOD_BASE_SCORE - score;
    const tolerance =
      temperament >= MOOD_PLACID_TEMPERAMENT
        ? MOOD_PLACID_TOLERANCE
        : temperament < MOOD_FRETFUL_TEMPERAMENT
          ? MOOD_FRETFUL_TOLERANCE
          : MOOD_DEFAULT_TOLERANCE;
    const adjustedScore = MOOD_BASE_SCORE - deficit * tolerance;
    temperamentContribution = adjustedScore - score;
    score = adjustedScore;
    if (temperament >= MOOD_PLACID_TEMPERAMENT) {
      temperamentDescription = "Placid temperament softens the rough trip.";
      reasons.push("A placid type that takes the rough with the smooth.");
    }
    if (temperament < MOOD_FRETFUL_TEMPERAMENT) {
      temperamentDescription = "Fretful temperament amplifies the rough trip.";
      reasons.push("A fretful type that takes any inconvenience to heart.");
    }
  }
  breakdown.push({
    signal: "Temperament",
    contribution: temperamentContribution,
    description: temperamentDescription,
  });

  score = Math.max(MOOD_MIN_SCORE, Math.min(MOOD_MAX_SCORE, Math.round(score)));
  const face: MoodFace =
    score >= MOOD_HAPPY_THRESHOLD ? "happy" : score >= MOOD_NEUTRAL_THRESHOLD ? "neutral" : "unhappy";
  const label = face === "happy" ? "Happy" : face === "neutral" ? "Coping" : "Unhappy";
  if (reasons.length === 0) reasons.push("Going about its business without fuss.");

  return { score, face, label, reasons, breakdown };
}
