/**
 * advancePlan.ts - Range segmentation for multi-day advancement.
 *
 * `buildAdvancePlan` splits a [currentDay+1, targetDay] advance into ordered
 * segments separated by interruption points (player races) and records
 * cancellation checkpoints (every day boundary is a safe checkpoint).
 *
 * The executor consumes the plan day-by-day; the plan exists to make
 * interruption/cancellation semantics explicit and testable.
 */

import type { GameState, Race } from "@/platform/game/types";
import { computePlayerRaceDays } from "@/platform/time/advance";
import { isWeeklyBoundary, isSeasonBoundary } from "@/platform/time/calendar";
import { getCurrentYear } from "@/domains/race/simulation/schedule";

export interface AdvancePlan {
  /** Absolute day the range starts from (exclusive). */
  fromDay: number;
  /** Absolute day the range ends at (inclusive), unless interrupted. */
  targetDay: number;
  /** Days with unresolved player-entered races inside the range. */
  playerRaceDays: ReadonlySet<number>;
  /** Whether player-race interruptions are ignored (auto-sim). */
  headless: boolean;
  /** Ordered boundary days inside the range for progress weighting. */
  boundaryDays: number[];
  /** Cancellation checkpoints: every day boundary. */
  checkpointEveryDay: true;
}

export interface Interruption {
  day: number;
  raceId: string;
  reason: "player_race";
}

export function buildAdvancePlan(
  state: GameState,
  daysRequested: number,
  headless: boolean,
): AdvancePlan {
  if (!Number.isInteger(daysRequested) || daysRequested <= 0) {
    throw new RangeError(`daysRequested must be a positive integer, got ${daysRequested}`);
  }
  const fromDay = state.day;
  const targetDay = fromDay + daysRequested;
  const playerRaceDays = headless
    ? new Set<number>()
    : computePlayerRaceDays(Object.values(state.races), fromDay + 1, targetDay);

  const boundaryDays: number[] = [];
  let prevYear = getCurrentYear(fromDay);
  for (let d = fromDay + 1; d <= targetDay; d++) {
    const y = getCurrentYear(d);
    if (y > prevYear || isWeeklyBoundary(d) || isSeasonBoundary(d)) {
      boundaryDays.push(d);
    }
    prevYear = y;
  }

  return {
    fromDay,
    targetDay,
    playerRaceDays,
    headless,
    boundaryDays,
    checkpointEveryDay: true,
  };
}

/**
 * Find the interruption for a pending day, if any.
 * Returns the first unresolved player-entered race on `day`.
 * @param plan
 * @param state
 * @param day
 */
export function interruptionForDay(
  plan: AdvancePlan,
  state: GameState,
  day: number,
): Interruption | undefined {
  if (plan.headless) return undefined;
  // A race already watched live carries a queued race_resolution intent — the
  // day's pipeline finishes it, so don't stop and prompt for it a second time.
  // Entries still queued (made just before advancing) count as player entries:
  // the plan's precomputed race days can't see them yet.
  const alreadyRun = new Set<string>();
  const queuedEntryRaces = new Set<string>();
  for (const i of state.pendingIntents ?? []) {
    if (i.type === "race_resolution") alreadyRun.add((i as { raceId: string }).raceId);
    else if (i.type === "race_entry") {
      const e = i as { raceId: string; horseId: string };
      if (state.horses?.[e.horseId]?.ownership?.type === "player") queuedEntryRaces.add(e.raceId);
    }
  }
  if (!plan.playerRaceDays.has(day) && queuedEntryRaces.size === 0) {
    // Entries applied earlier in this range aren't in the precomputed days either.
    const any = Object.values(state.races).some(
      (r: Race) =>
        !r.resolved && r.day === day && r.entries.some((e) => e.ownership?.type === "player"),
    );
    if (!any) return undefined;
  }
  const race = Object.values(state.races).find(
    (r: Race) =>
      !r.resolved &&
      r.day === day &&
      !alreadyRun.has(r.id) &&
      (queuedEntryRaces.has(r.id) || r.entries.some((e) => e.ownership?.type === "player")),
  );
  return race ? { day, raceId: race.id, reason: "player_race" } : undefined;
}
