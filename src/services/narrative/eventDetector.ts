import type { Runner } from "@/game/raceSim";
import type { Race } from "@/game/types";

/**
 * Event Detection System
 * Detects race events for narrative commentary generation
 */

export type NarrativeEvent =
  | "START"
  | "LEAD_CHANGE"
  | "SURGE"
  | "FADE"
  | "STRETCH"
  | "FINISH"
  | "POSITION_CHECK"
  | "DRAFTING"
  | "HOT_PACE"
  | "WEATHER_COMMENT"
  | "STABLE_WATCH"
  | "MILESTONE"
  | "EXPERT_INSIGHT"
  | "GAP_ANNOUNCEMENT"
  | "ATMOSPHERE"
  | "LANE_WATCH";

export interface DetectedEvent {
  type: NarrativeEvent;
  horseId?: string;
  data?: Record<string, unknown>;
}

/**
 * Detect lead change event
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
 * Detect surge/fade events based on rank changes
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
 * Detect drafting event
 */
export function detectDrafting(runner: Runner, runners: Runner[]): DetectedEvent | null {
  if (!runner.draftingHorseId) return null;

  const other = runners.find((r) => r.horseId === runner.draftingHorseId);
  if (!other) return null;

  return {
    type: "DRAFTING",
    horseId: runner.horseId,
    data: { draftingHorseId: runner.draftingHorseId, otherName: other.name },
  };
}

/**
 * Detect lane watch event (trapped wide on turn)
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
 * Detect gap announcement
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
  const lengths = (gapMeters / 2.4).toFixed(1); // METERS_PER_LENGTH = 2.4

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
 * Detect stretch run event
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
 * Detect finish event
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
 * Detect milestone events
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
 * Check if position is in a turn
 * Basic oval assumption: 400m home straight, 400m turn, 400m back straight, 400m turn
 */
function isInTurn(pos: number, race: Race): boolean {
  const distFromFinish = race.distance - pos;
  const trackPos = distFromFinish % 1600;
  return (trackPos > 400 && trackPos <= 800) || trackPos > 1200;
}

/**
 * Detect stable watch event
 */
export function detectStableWatch(
  runner: Runner,
  horses: { id: string; stableId?: string }[],
  stables: { id: string; isMajor: boolean }[],
  simTime: number,
): DetectedEvent | null {
  if (simTime < 2 || simTime > 15) return null;

  const horse = horses.find((h) => h.id === runner.horseId);
  if (!horse?.stableId) return null;

  const stable = stables.find((s) => s.id === horse.stableId);
  if (!stable?.isMajor) return null;

  return {
    type: "STABLE_WATCH",
    horseId: runner.horseId,
    data: { stableId: stable.id },
  };
}

/**
 * Detect atmosphere event
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
