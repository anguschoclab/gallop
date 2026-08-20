/**
 * runnerConditionTypes.ts - Types and constants for runner conditions and mood
 *
 * Extracted from runnerConditions.ts for modularity.
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
