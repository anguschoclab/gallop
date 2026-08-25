import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/game/types";
import type { HorseOwnership } from "@/core/horse/ownership";
import { getStableId } from "@/core/horse/ownership";
import { METERS_PER_LENGTH } from "@/constants";
import { NARRATIVE_THRESHOLDS } from "@/constants/narrativeThresholds";
import { getJockeyTier } from "@/core/jockey/jockeyTier";
import { getCourseForRace } from "@/data/tracks";
import type { JockeyTrait } from "@/core/jockey/types";
import type { NarrativeEvent, DetectedEvent } from "./types";

/**
 * Event Detection System
 * Detects race events for narrative commentary generation
 */

/**
 * Detect lead change event.
 *
 * @param runners - All runners in the race
 * @param lastLeaderId - ID of the previous leader
 * @param hasAnnouncedStart - Whether start has been announced
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent if lead changed, otherwise null
 */
export function detectLeadChange(
  runners: Runner[],
  lastLeaderId: string | null,
  hasAnnouncedStart: boolean,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (!hasAnnouncedStart || hasAnnouncedFinish) return null;

  const sorted = [...runners].sort((a, b) => b.position - a.position);
  const currentLeader = sorted[0];

  if (
    lastLeaderId &&
    currentLeader.horseId !== lastLeaderId &&
    currentLeader.position > NARRATIVE_THRESHOLDS.LEAD_CHANGE_THRESHOLD
  ) {
    return {
      type: "LEAD_CHANGE",
      horseId: currentLeader.horseId,
    };
  }

  return null;
}

/**
 * Detect surge/fade events based on rank changes.
 *
 * @param runner - The runner to check
 * @param lastRank - Previous position in field
 * @param currentRank - Current position in field
 * @param simTime - Current simulation time
 * @param hasAnnouncedStart - Whether start has been announced
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent for SURGE or FADE, otherwise null
 */
export function detectPositionChange(
  runner: Runner,
  lastRank: number | undefined,
  currentRank: number,
  simTime: number,
  hasAnnouncedStart: boolean,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (!hasAnnouncedStart || hasAnnouncedFinish) return null;
  if (lastRank === undefined || lastRank === currentRank) return null;

  if (
    lastRank - currentRank >= NARRATIVE_THRESHOLDS.SURGE_RANK_DIFF ||
    (currentRank <= NARRATIVE_THRESHOLDS.SURGE_TOP3_RANK_DIFF &&
      lastRank > NARRATIVE_THRESHOLDS.SURGE_TOP3_RANK_DIFF)
  ) {
    return {
      type: "SURGE",
      horseId: runner.horseId,
      data: { from: lastRank, to: currentRank },
    };
  } else if (currentRank - lastRank >= NARRATIVE_THRESHOLDS.FADE_RANK_DIFF) {
    return {
      type: "FADE",
      horseId: runner.horseId,
      data: { from: lastRank, to: currentRank },
    };
  }

  return null;
}

/**
 * Detect drafting event.
 *
 * @param runner - The runner to check
 * @param runnersMap - Map of horse ID to runner for O(1) lookup
 * @returns DetectedEvent if drafting, otherwise null
 */
export function detectDrafting(
  runner: Runner,
  runnersMap: Map<string, Runner>,
): DetectedEvent | null {
  if (!runner.draftingHorseId) return null;

  const other = runnersMap.get(runner.draftingHorseId);
  if (!other) return null;

  return {
    type: "DRAFTING",
    horseId: runner.horseId,
    data: { draftingHorseId: runner.draftingHorseId, otherName: other.name },
  };
}

/**
 * Detect lane watch event (trapped wide on turn).
 *
 * @param runner - The runner to check
 * @param race - The current race
 * @param hasAnnouncedStart - Whether start has been announced
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent if trapped wide, otherwise null
 */
export function detectLaneWatch(
  runner: Runner,
  race: Race,
  hasAnnouncedStart: boolean,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (!hasAnnouncedStart || hasAnnouncedFinish) return null;
  if (runner.lane < NARRATIVE_THRESHOLDS.LANE_THRESHOLD) return null; // Only if wide

  if (isInTurn(runner.position, race)) {
    return {
      type: "LANE_WATCH",
      horseId: runner.horseId,
      data: { lane: runner.lane },
    };
  }

  return null;
}

/**
 * Detect gap announcement.
 *
 * @param runners - All runners in the race
 * @param hasAnnouncedStart - Whether start has been announced
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent if gap is significant, otherwise null
 */
export function detectGapAnnouncement(
  runners: Runner[],
  hasAnnouncedStart: boolean,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (!hasAnnouncedStart || hasAnnouncedFinish) return null;
  if (runners.length < 2) return null;

  const sorted = [...runners].sort((a, b) => b.position - a.position);
  const gapMeters = sorted[0].position - sorted[1].position;
  const lengths = (gapMeters / METERS_PER_LENGTH).toFixed(1);

  if (parseFloat(lengths) >= NARRATIVE_THRESHOLDS.GAP_THRESHOLD_LENGTHS) {
    return {
      type: "GAP_ANNOUNCEMENT",
      horseId: sorted[0].horseId,
      data: { lengths },
    };
  }

  return null;
}

/**
 * Detect stretch run event.
 *
 * @param leaderPosition - Position of the race leader
 * @param race - The current race
 * @param hasAnnouncedStretch - Whether stretch has been announced
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent if in stretch, otherwise null
 */
export function detectStretch(
  leaderPosition: number,
  race: Race,
  hasAnnouncedStretch: boolean,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (hasAnnouncedStretch || hasAnnouncedFinish) return null;

  if (leaderPosition > race.distance * NARRATIVE_THRESHOLDS.STRETCH_THRESHOLD) {
    return {
      type: "STRETCH",
    };
  }

  return null;
}

/**
 * Detect finish event.
 *
 * @param leaderFinishTime - Finish time of the leader, or null if not finished
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent if finished, otherwise null
 */
export function detectFinish(
  leaderFinishTime: number | null,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (hasAnnouncedFinish) return null;
  if (leaderFinishTime === null) return null;

  return {
    type: "FINISH",
  };
}

/**
 * Check if position is in a turn.
 * Basic oval assumption: 400m home straight, 400m turn, 400m back straight, 400m turn.
 *
 * @param pos - Position on track
 * @param race - The current race
 * @returns True if position is in a turn
 */
function isInTurn(pos: number, race: Race): boolean {
  const distFromFinish = race.distance - pos;
  const trackPos = distFromFinish % NARRATIVE_THRESHOLDS.TURN_SEGMENT_LENGTH;
  return (
    (trackPos > NARRATIVE_THRESHOLDS.TURN_SEGMENT_START &&
      trackPos <= NARRATIVE_THRESHOLDS.TURN_SEGMENT_END) ||
    trackPos > NARRATIVE_THRESHOLDS.TURN_SEGMENT_FINAL_START
  );
}

/**
 * Detect stable watch event.
 *
 * @param runner - The runner to check
 * @param horsesMap - Map of horse ID to horse object for O(1) lookup
 * @param stablesMap - Map of stable ID to stable object for O(1) lookup
 * @param simTime - Current simulation time
 * @returns DetectedEvent if horse is from a major stable, otherwise null
 */
export function detectStableWatch(
  runner: Runner,
  horsesMap: Map<string, { id: string; ownership: HorseOwnership }>,
  stablesMap: Map<string, { id: string; isMajor: boolean }>,
  simTime: number,
): DetectedEvent | null {
  if (
    simTime < NARRATIVE_THRESHOLDS.STABLE_WATCH_START_TIME ||
    simTime > NARRATIVE_THRESHOLDS.STABLE_WATCH_END_TIME
  )
    return null;

  const horse = horsesMap.get(runner.horseId);
  if (!getStableId(horse)) return null;

  const stable = stablesMap.get(getStableId(horse)!);
  if (!stable?.isMajor) return null;

  return {
    type: "STABLE_WATCH",
    horseId: runner.horseId,
    data: { stableId: stable.id },
  };
}

/**
 * Detect atmosphere event.
 *
 * @param simTime - Current simulation time
 * @param hasAnnouncedStart - Whether start has been announced
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent for general atmosphere
 */
export function detectAtmosphere(
  simTime: number,
  hasAnnouncedStart: boolean,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (!hasAnnouncedStart || hasAnnouncedFinish) return null;
  if (simTime < NARRATIVE_THRESHOLDS.ATMOSPHERE_MIN_TIME) return null;

  return {
    type: "ATMOSPHERE",
  };
}

/**
 * Detect jockey-related commentary events based on jockey traits, tier, and race context.
 *
 * @param runner - The runner to check for jockey events
 * @param race - The current race
 * @param simTime - Current simulation time
 * @param hasAnnouncedStart - Whether start has been announced
 * @param hasAnnouncedFinish - Whether finish has been announced
 * @returns DetectedEvent for jockey commentary, or null
 */
export function detectJockeyEvents(
  runner: Runner,
  race: Race,
  simTime: number,
  hasAnnouncedStart: boolean,
  hasAnnouncedFinish: boolean,
): DetectedEvent | null {
  if (!hasAnnouncedStart || hasAnnouncedFinish) return null;
  const jockey = runner.jockey;
  if (!jockey && !runner.jockeyName) return null;

  // Elite jockey mastery
  if (jockey && getJockeyTier(jockey) === "elite") {
    return { type: "JOCKEY_MASTERY", horseId: runner.horseId };
  }

  // Apprentice jockey
  if (jockey?.isApprentice) {
    return { type: "JOCKEY_APPRENTICE", horseId: runner.horseId };
  }

  // Trait-based detection
  if (jockey?.traits && jockey.traits.length > 0) {
    const course = getCourseForRace(race);
    const trackCondition = race.trackCondition;
    const isGraded = !!race.graded;
    const progress = runner.position / race.distance;

    for (const trait of jockey.traits) {
      const traitEvent = checkJockeyTrait(
        trait,
        simTime,
        progress,
        trackCondition,
        course?.circumference,
        course?.straightLength,
        isGraded,
        jockey.careerStarts,
      );
      if (traitEvent) {
        return { type: "JOCKEY_TRAIT", horseId: runner.horseId, data: { trait } };
      }
    }
  }

  // Generic jockey tactic commentary (fallback)
  return { type: "JOCKEY_TACTIC", horseId: runner.horseId };
}

function checkJockeyTrait(
  trait: JockeyTrait,
  simTime: number,
  progress: number,
  trackCondition?: string,
  circumference?: number,
  straightLength?: number,
  isGraded?: boolean,
  careerStarts?: number,
): boolean {
  switch (trait) {
    case "gate_master":
      return simTime < 5;
    case "closer_instinct":
      return progress > 0.7;
    case "mud_master":
      return (
        trackCondition === "soft" || trackCondition === "heavy" || trackCondition === "yielding"
      );
    case "bullring_expert":
      return circumference !== undefined && circumference < 1600;
    case "long_straight_pro":
      return straightLength !== undefined && straightLength > 400;
    case "big_match_temperament":
      return isGraded === true;
    case "veteran_poise":
      return careerStarts !== undefined && careerStarts > 5000;
    default:
      return false;
  }
}
