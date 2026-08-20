/**
 * runnerMood.ts - Runner mood derivation and capture
 *
 * Extracted from runnerConditions.ts for modularity.
 */

import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  FLYING_FIELD_RATIO,
  FLYING_FADE_RATIO,
  FLYING_MAX_VELOCITY_RANK,
  FLAGGING_FADE_RATIO,
  DISTRESSED_FADE_RATIO,
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
import {
  METRES_PER_LENGTH,
  type FieldContext,
  type RunnerCondition,
  type RunnerHistory,
  type RunnerMood,
  type MoodFace,
  type MoodSignal,
} from "./runnerConditionTypes";
import { buildFieldContext, deriveRunnerConditions } from "./runnerConditionDerivation";

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
