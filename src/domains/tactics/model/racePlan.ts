/**
 * racePlan.ts — Resolve the jockey plan the stable has set for each race entry.
 *
 * A plan can live in two places: on the race entry itself (once the day's
 * intents have been processed) or in a still-pending "tactics" intent queued
 * from the entry dialog, Race Advisor or pre-race prompt. The newest pending
 * intent always wins because it is what will be applied next.
 */

import type { JockeyInstructions } from "@/domains/tactics/model/tacticsTypes";

export type PlanSource = "pending" | "set" | "none";

export interface PlanIntentLike {
  type: string;
  source?: string;
  raceId?: string;
  horseId?: string;
  jockeyId?: string;
  jockeyInstructions?: JockeyInstructions;
}

export interface PlanRaceLike {
  id: string;
  name: string;
  day: number;
  resolved?: boolean;
  entries: Array<{ horseId: string; jockeyId?: string; jockeyInstructions?: JockeyInstructions }>;
}

export interface ResolvedEntryPlan {
  instructions?: JockeyInstructions;
  jockeyId?: string;
  source: PlanSource;
}

export function resolveEntryPlan(
  race: PlanRaceLike,
  horseId: string,
  pendingIntents: readonly PlanIntentLike[],
): ResolvedEntryPlan {
  const entry = race.entries.find((e) => e.horseId === horseId);
  let pendingPlan: JockeyInstructions | undefined;
  let jockeyId = entry?.jockeyId;
  for (const intent of pendingIntents) {
    if (intent.raceId !== race.id || intent.horseId !== horseId) continue;
    if (intent.type === "tactics" && intent.jockeyInstructions)
      pendingPlan = intent.jockeyInstructions;
    if (intent.type === "race_entry" && intent.jockeyInstructions && !pendingPlan)
      pendingPlan = intent.jockeyInstructions;
    if ((intent.type === "jockey_assignment" || intent.type === "race_entry") && intent.jockeyId)
      jockeyId = intent.jockeyId;
  }
  if (pendingPlan) return { instructions: pendingPlan, jockeyId, source: "pending" };
  if (entry?.jockeyInstructions)
    return { instructions: entry.jockeyInstructions, jockeyId, source: "set" };
  return { jockeyId, source: "none" };
}

export interface PlayerEntryPlan extends ResolvedEntryPlan {
  raceId: string;
  raceName: string;
  raceDay: number;
  horseId: string;
  /** "pending" = entry submitted but not yet processed by the next day. */
  entryStatus: "entered" | "pending";
}

/**
 * Every upcoming player entry (confirmed or still pending) with its plan,
 * sorted by race day. Pending withdrawals are excluded.
 * @param races - All races keyed by id
 * @param pendingIntents - Unprocessed intents (tactics, entries, withdrawals)
 * @param isPlayerHorse - Predicate identifying player-owned horses
 * @param today - Current game day; races before it are excluded
 */
export function collectPlayerEntryPlans(
  races: Record<string, PlanRaceLike>,
  pendingIntents: readonly PlanIntentLike[],
  isPlayerHorse: (horseId: string) => boolean,
  today: number,
): PlayerEntryPlan[] {
  const withdrawn = new Set<string>();
  for (const i of pendingIntents) {
    if (i.type === "race_withdrawal" && i.raceId && i.horseId)
      withdrawn.add(`${i.raceId}:${i.horseId}`);
  }
  const seen = new Set<string>();
  const out: PlayerEntryPlan[] = [];
  const push = (race: PlanRaceLike, horseId: string, entryStatus: "entered" | "pending") => {
    const key = `${race.id}:${horseId}`;
    if (seen.has(key) || withdrawn.has(key)) return;
    seen.add(key);
    out.push({
      ...resolveEntryPlan(race, horseId, pendingIntents),
      raceId: race.id,
      raceName: race.name,
      raceDay: race.day,
      horseId,
      entryStatus,
    });
  };
  for (const race of Object.values(races)) {
    if (race.resolved || race.day < today) continue;
    for (const e of race.entries) if (isPlayerHorse(e.horseId)) push(race, e.horseId, "entered");
  }
  for (const i of pendingIntents) {
    if (i.type !== "race_entry" || !i.raceId || !i.horseId) continue;
    const race = races[i.raceId];
    if (!race || race.resolved || race.day < today || !isPlayerHorse(i.horseId)) continue;
    push(race, i.horseId, "pending");
  }
  return out.sort((a, b) => a.raceDay - b.raceDay || a.raceName.localeCompare(b.raceName));
}

const STYLE_LABEL: Record<JockeyInstructions["ridingStyle"], string> = {
  front_runner: "Front-runner",
  stalker: "Stalker",
  closer: "Closer",
  tactical: "Tactical",
};
const POSITION_LABEL: Record<JockeyInstructions["earlyPosition"], string> = {
  lead: "lead early",
  press: "press the pace",
  midpack: "settle midpack",
  drop_back: "drop back",
};
const TIMING_LABEL: Record<JockeyInstructions["moveTiming"], string> = {
  early: "move on the far turn",
  mid: "move in the stretch",
  late: "late charge",
};

/**
 * Short human summary, e.g. "Closer · drop back · late charge · 75% push".
 * @param plan - The jockey instructions to summarize
 */
export function summarizePlan(plan: JockeyInstructions): string {
  return [
    STYLE_LABEL[plan.ridingStyle] ?? plan.ridingStyle,
    POSITION_LABEL[plan.earlyPosition] ?? plan.earlyPosition,
    TIMING_LABEL[plan.moveTiming] ?? plan.moveTiming,
    `${Math.round(plan.aggressiveness)}% push`,
  ].join(" · ");
}
