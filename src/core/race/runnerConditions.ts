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

export interface RunnerMood {
  score: number;
  face: MoodFace;
  label: string;
  reasons: string[];
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
    return ahead > 0.3 && ahead < 3.2 && Math.abs(other.lane - r.lane) < 1;
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

  if (field.liveCount > 1 && r.velocity > 0 && fieldRatio >= 1.06 && fadeRatio > 0.97) {
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
    gap < 1.8 &&
    progress > 0.45 &&
    Math.abs(rival.velocity - r.velocity) < 0.45 &&
    fieldRatio > 0.98
  ) {
    conditions.push({
      id: "battling",
      label: "Battling",
      tone: "caution",
      detail: `Head-to-head with ${rival.name} — neither giving an inch.`,
      emphatic: true,
    });
  }

  if (isBlocked(r, field) && progress > 0.3 && progress < 0.95) {
    conditions.push({
      id: "boxed",
      label: "Boxed In",
      tone: "caution",
      detail: "No clear running — needs a gap to appear before it can be asked for an effort.",
    });
  }

  if (fadeRatio < 0.8 || (fieldRatio < 0.88 && progress > 0.5)) {
    conditions.push({
      id: "distressed",
      label: "In Trouble",
      tone: "negative",
      detail: "Dropping away sharply — out of petrol and being nursed home.",
      emphatic: true,
    });
  } else if (fadeRatio < 0.92 && fieldRatio < 0.99 && progress > 0.35) {
    conditions.push({
      id: "flagging",
      label: "Flagging",
      tone: "negative",
      detail: "Losing ground on its own best tempo — the effort is starting to tell.",
    });
  } else if (progress > 0.7 && fieldRatio >= 0.99 && fadeRatio < 1.02 && behindLeader < 6) {
    conditions.push({
      id: "grinding",
      label: "Grinding",
      tone: "positive",
      detail: "Not quickening, but staying on relentlessly at the same tempo.",
    });
  }

  if (
    conditions.length === 0 &&
    progress > 0.1 &&
    progress < 0.6 &&
    Math.abs(fieldRatio - 1) < 0.04
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
  let score = 60;

  if (r.finishTime !== null) {
    return {
      score: 60,
      face: "neutral",
      label: "Race complete",
      reasons: ["Has completed the race."],
    };
  }

  const progress = distance > 0 ? r.position / distance : 0;
  const lengthsBack = (field.leaderPos - r.position) / METRES_PER_LENGTH;
  const style = r.runningStyle ?? "P";
  const styleLabel = STYLE_LABEL[style] ?? "runner";
  const early = progress < 0.6;

  // Running-line fit: does its current place suit the way it likes to race?
  const wantsFront = style === "E" || style === "EP";
  const wantsBack = style === "S";
  if (wantsFront) {
    if (lengthsBack <= 1.5) {
      score += 18;
      reasons.push(`Handy on the pace, exactly where a ${styleLabel} wants to be.`);
    } else if (lengthsBack > 7) {
      score -= 20;
      reasons.push(`A ${styleLabel} stranded ${Math.round(lengthsBack)} lengths off the lead.`);
    }
  } else if (wantsBack) {
    if (early && lengthsBack >= 4) {
      score += 14;
      reasons.push(`Dropped out and covered up, ideal for a ${styleLabel}.`);
    } else if (early && lengthsBack <= 1) {
      score -= 18;
      reasons.push(`A ${styleLabel} forced to make its own running too soon.`);
    }
  } else if (lengthsBack > 1.5 && lengthsBack < 6) {
    score += 12;
    reasons.push(`Tracking the pace in midfield, the trip a ${styleLabel} enjoys.`);
  }

  // How it is travelling against its own best tempo and the field.
  const peak = Math.max(history.peakVelocity, r.velocity);
  const fadeRatio = peak > 0 ? r.velocity / peak : 1;
  const fieldRatio = field.meanVelocity > 0 ? r.velocity / field.meanVelocity : 1;
  if (fieldRatio >= 1.06 && fadeRatio > 0.97) {
    score += 15;
    reasons.push("Moving strongly, well on top of the tempo.");
  }
  if (fadeRatio < 0.92) {
    score -= fadeRatio < 0.8 ? 28 : 14;
    reasons.push("Off its own best tempo — feeling the effort.");
  }

  for (const c of conditions) {
    if (c.id === "boxed") {
      score -= 15;
      reasons.push("No clear running, and resenting the traffic.");
    }
    if (c.id === "battling") {
      score -= 5;
      reasons.push("Locked in a duel and being kept up to its work.");
    }
    if (c.id === "ailing") {
      score -= 30;
      reasons.push("Racing with a complaint.");
    }
  }

  // Temperament decides how much the horse minds an awkward trip.
  const temperament = r.horse?.stats?.temperament ?? r.horse?.temperament ?? 50;
  if (score < 60) {
    const deficit = 60 - score;
    const tolerance = temperament >= 70 ? 0.6 : temperament < 40 ? 1.3 : 1;
    score = 60 - deficit * tolerance;
    if (temperament >= 70) reasons.push("A placid type that takes the rough with the smooth.");
    if (temperament < 40) reasons.push("A fretful type that takes any inconvenience to heart.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const face: MoodFace = score >= 66 ? "happy" : score >= 42 ? "neutral" : "unhappy";
  const label = face === "happy" ? "Happy" : face === "neutral" ? "Coping" : "Unhappy";
  if (reasons.length === 0) reasons.push("Going about its business without fuss.");

  return { score, face, label, reasons };
}
