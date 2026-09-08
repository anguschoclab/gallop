import type { Runner } from "./runnerBuilder";
import { calculateStyleAwareDraftMultiplier, getEnhancedDraftingHorseId } from "./draftingAI";
import {
  GATE_SKILL_PROGRESS_THRESHOLD,
  GATE_SKILL_VELOCITY_BONUS,
  GATE_MASTER_TRAIT_BONUS,
  VETERAN_AGE_THRESHOLD,
  VETERAN_POSITIONING_BONUS,
  POSITIONING_BONUS_TURN,
  MATCHED_ARCHETYPE_PROGRESS_THRESHOLD,
  PACING_STAMINA_BONUS_FACTOR,
  FRONT_RUNNER_STALKER_MISMATCH_VELOCITY_BONUS,
  FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY,
  VIGOR_PROGRESS_THRESHOLD,
  VIGOR_BOOST_FACTOR,
  BIG_MATCH_FIELD_THRESHOLD,
  BIG_MATCH_VIGOR_BONUS,
  LATE_KICK_BOOST_THRESHOLD,
  LATE_KICK_VIGOR_MULTIPLIER,
  LATE_KICK_TOP_SPEED_MULTIPLIER,
  MIN_BLOCK_GAP,
} from "@/constants/raceEngineConstants";

export function calculateDraftMultiplier(r: Runner, progress: number): number {
  return calculateStyleAwareDraftMultiplier(r, progress);
}

export function applyJockeyEffects(
  r: Runner,
  progress: number,
  radius: number,
  arcFactor: number,
  dt: number,
  staminaMul: number,
  fieldSize?: number,
): { finalDs: number; staminaMul: number } {
  let finalDs = r.velocity * dt;
  let updatedStaminaMul = staminaMul;

  if (r.jockey) {
    const stats = r.jockey.stats;
    const arch = r.jockey.archetype;
    const traits = r.jockey.traits;

    const affinityAmp = r.affinityBonus > 0.05 ? 1 + r.affinityBonus * 0.5 : 1;

    if (progress < GATE_SKILL_PROGRESS_THRESHOLD) {
      const isGateMaster = traits.includes("gate_master");
      const gateBoost = (stats.gateSkill / 100) * GATE_SKILL_VELOCITY_BONUS * dt;
      const traitBoost = isGateMaster ? GATE_MASTER_TRAIT_BONUS * affinityAmp * dt : 0;
      r.velocity += gateBoost + traitBoost;
    }

    const isVeteran = traits.includes("veteran_poise") && r.jockey.age >= VETERAN_AGE_THRESHOLD;
    const positioningBonus = isVeteran
      ? (stats.positioning / 100) * POSITIONING_BONUS_TURN * (1 + VETERAN_POSITIONING_BONUS)
      : (stats.positioning / 100) * POSITIONING_BONUS_TURN;

    if (radius !== Infinity) {
      const effectiveLane = Math.max(0, r.lane * (1 - positioningBonus));
      const adjustedArcFactor = 1 + effectiveLane / radius;
      finalDs = (r.velocity * dt) / adjustedArcFactor;
    } else {
      finalDs = (r.velocity * dt) / arcFactor;
    }

    const isMatched =
      (arch === "front_runner" && r.runningStyle === "E") ||
      (arch === "closer" && r.runningStyle === "S") ||
      (arch === "clinical" && r.runningStyle === "EP") ||
      (arch === "finisher" && r.runningStyle === "P");

    if (isMatched && progress > MATCHED_ARCHETYPE_PROGRESS_THRESHOLD) {
      updatedStaminaMul *= 1 + (stats.pacing / 100) * PACING_STAMINA_BONUS_FACTOR;
    }

    if (
      arch === "front_runner" &&
      r.runningStyle === "S" &&
      progress < MATCHED_ARCHETYPE_PROGRESS_THRESHOLD
    ) {
      r.velocity += FRONT_RUNNER_STALKER_MISMATCH_VELOCITY_BONUS * dt;
      updatedStaminaMul *= FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY;
    }

    if (progress > VIGOR_PROGRESS_THRESHOLD) {
      let vigorBoost = (stats.vigor / 100) * VIGOR_BOOST_FACTOR;

      if (
        traits.includes("big_match_temperament") &&
        fieldSize &&
        fieldSize > BIG_MATCH_FIELD_THRESHOLD
      ) {
        vigorBoost *= 1 + BIG_MATCH_VIGOR_BONUS * affinityAmp;
      }

      if (r.jockeyInstructions?.moveTiming === "late" && progress > LATE_KICK_BOOST_THRESHOLD) {
        vigorBoost *= LATE_KICK_VIGOR_MULTIPLIER;
      }
      const speedCap =
        r.jockeyInstructions?.moveTiming === "late"
          ? r.topSpeed * LATE_KICK_TOP_SPEED_MULTIPLIER
          : r.topSpeed;
      r.velocity = Math.min(r.velocity + vigorBoost * dt, speedCap);
    }
  } else {
    finalDs = (r.velocity * dt) / arcFactor;
  }

  return { finalDs, staminaMul: updatedStaminaMul };
}

export function applyBlockingEffect(r: Runner, sortedField?: Runner[]): void {
  const blockingHorse = (sortedField || []).find(
    (other) =>
      other.horseId !== r.horseId &&
      other.finishTime === null &&
      other.position - r.position >= MIN_BLOCK_GAP &&
      other.position - r.position < 1.5 &&
      Math.abs(other.lane - r.lane) < 0.4,
  );
  if (blockingHorse) {
    r.velocity = Math.min(r.velocity, blockingHorse.velocity * 0.98);
  }
}

export function getDraftingHorseId(r: Runner, sortedField: Runner[]): string | null {
  return getEnhancedDraftingHorseId(r, sortedField);
}
