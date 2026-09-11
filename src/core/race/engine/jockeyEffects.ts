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
  BLOCKED_LANE_GAP,
  ESCAPE_VELOCITY_PENALTY,
  LANE_WIDTH,
  BLOCKING_RANGE_AHEAD,
  BLOCKING_RANGE_BEHIND,
  RAIL_LANE_THRESHOLD,
  BOXED_IN_VELOCITY_CAP,
  JOCKEY_SKILL_MAX,
  POSITIONING_SKILL_MAX_REDUCTION,
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
      const pacingBonus = (stats.pacing / 100) * PACING_STAMINA_BONUS_FACTOR;
      updatedStaminaMul *= 1 + pacingBonus;
      // Store on runner so calculateStaminaMultiplier can apply it next tick.
      // Previously this bonus was computed but lost (local variable never reused).
      r.jockeyStaminaBonus = pacingBonus;
    } else {
      r.jockeyStaminaBonus = 0;
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

/**
 * Detect blocking state for a runner: whether a blocker is ahead and whether
 * the runner is boxed in (no escape lane available). Must be called BEFORE
 * lane-seeking so calculateTargetLane can respond to blocked state.
 *
 * Sets r.blockedAhead and r.boxedIn.
 * @param r
 * @param sortedField
 */
export function detectBlocking(r: Runner, sortedField?: Runner[]): void {
  r.blockedAhead = false;
  r.boxedIn = false;

  if (!sortedField) return;

  let blockerAhead: Runner | undefined;
  let insideBlocked = false;
  let outsideBlocked = false;

  for (let i = 0; i < sortedField.length; i++) {
    const other = sortedField[i];
    if (other.horseId === r.horseId) continue;
    if (other.finishTime !== null) continue;

    const gap = other.position - r.position;

    // sortedField is ordered by position descending.
    // Skip horses too far ahead (beyond blocking range).
    if (gap >= BLOCKING_RANGE_AHEAD) continue;
    // Stop when horses are well behind (not relevant for blocking).
    if (gap < -BLOCKING_RANGE_BEHIND) break;

    // Check for blocker ahead — only at the original threshold (gap >= MIN_BLOCK_GAP).
    // This matches the old applyBlockingEffect's break condition.
    if (!blockerAhead && gap >= MIN_BLOCK_GAP && Math.abs(other.lane - r.lane) < BLOCKED_LANE_GAP) {
      blockerAhead = other;
    }

    // Check adjacent-lane blockers (for boxed-in detection).
    // These can be closer than MIN_BLOCK_GAP (horses alongside).
    // Adjacent lanes are LANE_WIDTH apart; use LANE_WIDTH + margin as threshold.
    const laneDelta = other.lane - r.lane;
    const absLaneDelta = Math.abs(laneDelta);
    if (laneDelta < 0 && absLaneDelta < LANE_WIDTH + BLOCKED_LANE_GAP) {
      insideBlocked = true;
    }
    if (laneDelta > 0 && absLaneDelta < LANE_WIDTH + BLOCKED_LANE_GAP) {
      outsideBlocked = true;
    }
  }

  if (blockerAhead) {
    r.blockedAhead = true;
    // Boxed in if both adjacent lanes are blocked, OR if on the rail
    // (lane ~0, no inside lane) and outside is blocked.
    const onRail = r.lane < RAIL_LANE_THRESHOLD;
    if (onRail) {
      r.boxedIn = outsideBlocked;
    } else {
      r.boxedIn = insideBlocked && outsideBlocked;
    }
  }
}

/**
 * Apply blocking velocity effects based on pre-computed blockedAhead/boxedIn
 * flags (set by detectBlocking). Called AFTER velocity update.
 *
 * - Boxed in: velocity capped to blocker's velocity * 0.98 (hard cap, no escape).
 * - Blocked but not boxed AND faster than blocker: escape velocity penalty
 *   (smaller, scales with jockey positioning skill).
 * - Blocked but slower than blocker: no effect (not being held back).
 * - Not blocked: no effect.
 * @param r
 * @param sortedField
 */
export function applyBlockingEffect(r: Runner, sortedField?: Runner[]): void {
  if (!sortedField) return;
  if (!r.blockedAhead) return;

  // Find the blocking horse ahead (same threshold as detectBlocking)
  let blockingHorse: Runner | undefined;
  for (let i = 0; i < sortedField.length; i++) {
    const other = sortedField[i];
    if (other.horseId === r.horseId) continue;
    if (other.finishTime !== null) continue;

    const gap = other.position - r.position;
    // Match original threshold: only consider blockers at gap >= MIN_BLOCK_GAP.
    if (gap < MIN_BLOCK_GAP) break;

    if (gap < BLOCKING_RANGE_AHEAD && Math.abs(other.lane - r.lane) < BLOCKED_LANE_GAP) {
      blockingHorse = other;
      break;
    }
  }

  if (!blockingHorse) return;

  if (r.boxedIn) {
    // Genuinely trapped — hard cap to blocker's pace
    r.velocity = Math.min(r.velocity, blockingHorse.velocity * BOXED_IN_VELOCITY_CAP);
  } else if (r.velocity > blockingHorse.velocity) {
    // Only apply escape penalty when actually being held back (faster than blocker).
    // The penalty scales with the lateral distance sought (escaping wider costs more)
    // and is reduced by jockey positioning skill.
    const positioningSkill = r.jockey?.stats.positioning ?? 50;
    const skillReduction = (positioningSkill / JOCKEY_SKILL_MAX) * POSITIONING_SKILL_MAX_REDUCTION;
    const laneDelta = r.escapeLaneDelta ?? 0;
    const penalty = ESCAPE_VELOCITY_PENALTY * Math.max(laneDelta, 0.5) * (1 - skillReduction);
    r.velocity *= 1 - penalty;
  }
}

export function getDraftingHorseId(r: Runner, sortedField: Runner[]): string | null {
  return getEnhancedDraftingHorseId(r, sortedField);
}
