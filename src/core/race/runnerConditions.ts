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
  MOOD_DEFAULT_SIGNAL_LABEL,
  MOOD_DEFAULT_SIGNAL_CONTRIBUTION,
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
  /** Rank of each live runner by velocity (1 = fastest). Ties broken by horseId for determinism. */
  velocityRank: Map<string, number>;
}

export interface RunnerHistory {
  /** Highest velocity this runner has reached so far in the race. */
  peakVelocity: number;
}

export type MoodFace = "happy" | "neutral" | "unhappy";

export interface MoodSignal {
  label: string;
  contribution: number;
}

export interface RunnerMood {
  score: number;
  face: MoodFace;
  label: string;
  signals: MoodSignal[];
}

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

/**
 * True when another runner sits directly in front in effectively the same lane.
 * @param r - The runner to check.
 * @param field - Aggregate field context.
 */
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
 * @param r - The runner to derive mood for.
 * @param field - Aggregate field context.
 * @param history - Runner history (peak velocity).
 * @param distance - Race distance in metres.
 * @param conditions - Pre-computed runner conditions (optional).
 */
export function deriveRunnerMood(
  r: Runner,
  field: FieldContext,
  history: RunnerHistory,
  distance: number,
  conditions: RunnerCondition[] = [],
): RunnerMood {
  const signals: MoodSignal[] = [];
  let score = MOOD_BASE_SCORE;

  if (r.finishTime !== null) {
    return {
      score: MOOD_BASE_SCORE,
      face: "neutral",
      label: "Race complete",
      signals: [],
    };
  }

  const progress = distance > 0 ? r.position / distance : 0;
  const lengthsBack = (field.leaderPos - r.position) / METRES_PER_LENGTH;
  const style = r.runningStyle ?? "P";
  const early = progress < MOOD_EARLY_PHASE_PROGRESS;

  // Running-line fit: does its current place suit the way it likes to race?
  const wantsFront = style === "E" || style === "EP";
  const wantsBack = style === "S";
  if (wantsFront) {
    if (lengthsBack <= MOOD_HANDY_LENGTHS) {
      score += MOOD_HANDY_BONUS;
      signals.push({ label: "Handy on the pace", contribution: MOOD_HANDY_BONUS });
    } else if (lengthsBack > MOOD_STRANDED_LENGTHS) {
      score -= MOOD_STRANDED_PENALTY;
      signals.push({ label: "Stranded off the lead", contribution: -MOOD_STRANDED_PENALTY });
    }
  } else if (wantsBack) {
    if (early && lengthsBack >= MOOD_COVERED_LENGTHS) {
      score += MOOD_COVERED_BONUS;
      signals.push({ label: "Covered up", contribution: MOOD_COVERED_BONUS });
    } else if (early && lengthsBack <= MOOD_TOO_SOON_LENGTHS) {
      score -= MOOD_TOO_SOON_PENALTY;
      signals.push({ label: "Too soon", contribution: -MOOD_TOO_SOON_PENALTY });
    }
  } else if (lengthsBack > MOOD_HANDY_LENGTHS && lengthsBack < MOOD_MIDFIELD_MAX_LENGTHS) {
    score += MOOD_MIDFIELD_BONUS;
    signals.push({ label: "Midfield tracking", contribution: MOOD_MIDFIELD_BONUS });
  }

  // How it is travelling against its own best tempo and the field.
  const peak = Math.max(history.peakVelocity, r.velocity);
  const fadeRatio = peak > 0 ? r.velocity / peak : 1;
  const fieldRatio = field.meanVelocity > 0 ? r.velocity / field.meanVelocity : 1;
  if (
    fieldRatio >= FLYING_FIELD_RATIO &&
    fadeRatio > FLYING_FADE_RATIO &&
    (field.velocityRank.get(r.horseId) ?? 99) <= FLYING_MAX_VELOCITY_RANK
  ) {
    score += MOOD_TRAVELLING_BONUS;
    signals.push({ label: "Travelling strongly", contribution: MOOD_TRAVELLING_BONUS });
  }
  if (fadeRatio < FLAGGING_FADE_RATIO) {
    if (fadeRatio < DISTRESSED_FADE_RATIO) {
      score -= MOOD_DISTRESSED_PENALTY;
      signals.push({ label: "Distressed", contribution: -MOOD_DISTRESSED_PENALTY });
    } else {
      score -= MOOD_FLAGGING_PENALTY;
      signals.push({ label: "Flagging", contribution: -MOOD_FLAGGING_PENALTY });
    }
  }

  for (const c of conditions) {
    if (c.id === "boxed") {
      score -= MOOD_BOXED_PENALTY;
      signals.push({ label: "Boxed in", contribution: -MOOD_BOXED_PENALTY });
    }
    if (c.id === "battling") {
      score -= MOOD_BATTLING_PENALTY;
      signals.push({ label: "Battling", contribution: -MOOD_BATTLING_PENALTY });
    }
    if (c.id === "ailing") {
      score -= MOOD_AILING_PENALTY;
      signals.push({ label: "Ailing", contribution: -MOOD_AILING_PENALTY });
    }
  }

  // Temperament decides how much the horse minds an awkward trip.
  const temperament = r.horse?.stats?.temperament ?? r.horse?.temperament ?? MOOD_BASE_SCORE;
  if (score < MOOD_BASE_SCORE) {
    const deficit = MOOD_BASE_SCORE - score;
    const tolerance =
      temperament >= MOOD_PLACID_TEMPERAMENT
        ? MOOD_PLACID_TOLERANCE
        : temperament < MOOD_FRETFUL_TEMPERAMENT
          ? MOOD_FRETFUL_TOLERANCE
          : MOOD_DEFAULT_TOLERANCE;
    const preTemperamentScore = score;
    score = MOOD_BASE_SCORE - deficit * tolerance;
    if (score !== preTemperamentScore) {
      signals.push({ label: "Temperament adjustment", contribution: score - preTemperamentScore });
    }
  }

  const preClampScore = score;
  score = Math.max(MOOD_MIN_SCORE, Math.min(MOOD_MAX_SCORE, Math.round(score)));
  if (score !== preClampScore) {
    signals.push({ label: "Rounding & clamping", contribution: score - preClampScore });
  }

  const face: MoodFace =
    score >= MOOD_HAPPY_THRESHOLD
      ? "happy"
      : score >= MOOD_NEUTRAL_THRESHOLD
        ? "neutral"
        : "unhappy";
  const label = face === "happy" ? "Happy" : face === "neutral" ? "Coping" : "Unhappy";
  if (signals.length === 0) {
    signals.push({
      label: MOOD_DEFAULT_SIGNAL_LABEL,
      contribution: MOOD_DEFAULT_SIGNAL_CONTRIBUTION,
    });
  }

  return { score, face, label, signals };
}

/**
 * Computes and stores the current mood for every live runner, mutating each
 * runner's `finalMood` field in place. Finished runners are skipped so their
 * last live mood is preserved.
 *
 * This is called once per frame from the presentation layer (Track.tsx) so
 * that the last meaningful mood before a runner crosses the line is retained
 * for post-race display in ResultOverlay.
 *
 * @param runners - All runners in the race.
 * @param peakVelocities - Map of horseId to peak velocity seen so far.
 * @param distance - Race distance in metres.
 */
export function captureRunnerMoods(
  runners: Runner[],
  peakVelocities: Map<string, number>,
  distance: number,
): void {
  const field = buildFieldContext(runners);
  for (const r of runners) {
    if (r.finishTime !== null) continue;
    const history = { peakVelocity: peakVelocities.get(r.horseId) ?? 0 };
    const conditions = deriveRunnerConditions(r, field, history, distance);
    r.finalMood = deriveRunnerMood(r, field, history, distance, conditions);
  }
}
