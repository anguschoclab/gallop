import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/game/types";
import { METERS_PER_LENGTH } from "@/constants/game";
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

  if (lastLeaderId && currentLeader.horseId !== lastLeaderId && currentLeader.position > 20) {
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

  if (lastRank - currentRank >= 2 || (currentRank <= 3 && lastRank > 3)) {
    return {
      type: "SURGE",
      horseId: runner.horseId,
      data: { from: lastRank, to: currentRank },
    };
  } else if (currentRank - lastRank >= 3) {
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
  if (runner.lane < 3.6) return null; // Only if wide (3.6m+)

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

  if (parseFloat(lengths) >= 2.0) {
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

  if (leaderPosition > race.distance * 0.85) {
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
 * Detect milestone events (distance markers).
 *
 * @param leaderPosition - Position of the race leader
 * @param race - The current race
 * @param announcedMilestones - Set of already announced milestone IDs
 * @returns DetectedEvent for milestone, otherwise null
 */
export function detectMilestones(
  leaderPosition: number,
  race: Race,
  announcedMilestones: Set<number>,
): DetectedEvent | null {
  const milestones = [
    { pos: race.distance * 0.5, id: 50, text: "Passing the halfway point now." },
    { pos: race.distance - 400, id: 400, text: "Entering the final 400 meters!" },
    { pos: race.distance - 200, id: 200, text: "Just 200 meters to the wire!" },
    {
      pos: race.distance - 100,
      id: 100,
      text: "They're inside the final 100! Who wants it more?",
    },
  ];

  for (const m of milestones) {
    if (leaderPosition >= m.pos && !announcedMilestones.has(m.id)) {
      return {
        type: "MILESTONE",
        data: { id: m.id, text: m.text },
      };
    }
  }

  return null;
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
  const trackPos = distFromFinish % 1600;
  return (trackPos > 400 && trackPos <= 800) || trackPos > 1200;
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
  horsesMap: Map<string, { id: string; stableId?: string }>,
  stablesMap: Map<string, { id: string; isMajor: boolean }>,
  simTime: number,
): DetectedEvent | null {
  if (simTime < 2 || simTime > 15) return null;

  const horse = horsesMap.get(runner.horseId);
  if (!horse?.stableId) return null;

  const stable = stablesMap.get(horse.stableId);
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
  if (simTime < 5) return null;

  return {
    type: "ATMOSPHERE",
  };
}
