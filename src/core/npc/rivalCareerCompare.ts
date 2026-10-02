/**
 * rivalCareerCompare.ts - Side-by-side career profiles for rival horses
 *
 * Derives a comparable career profile (age, starts, wins, earnings, fame,
 * career stage and milestone history) for NPC horses so the player can weigh
 * rivals against each other. Pure derivation — no mutation of inputs.
 *
 * Dependencies: @/core/horse/types, ./careerTracker, ./careerMilestones
 * Related files: src/components/stable/RivalCareerCompareTable.tsx,
 *   src/routes/npc-stables.rival-careers.tsx
 */

import type { Horse, HorseRaceHistoryEntry, NpcCareerStage } from "@/core/horse/types";
import { careerStage, careerStageLabel, summarizeNpcCareer } from "./careerTracker";
import { getStableId } from "@/core/horse/ownership";
import { detectRivalMilestones, type RivalMilestoneKind } from "./careerMilestones";

export interface RivalMilestoneRecord {
  key: string;
  kind: RivalMilestoneKind;
  title: string;
  /** Best available absolute game day for plotting this milestone. */
  day: number | null;
  /** True when the player has already been alerted about this milestone. */
  announced: boolean;
}

export interface RivalCareerProfile {
  id: string;
  name: string;
  stableId?: string;
  age: number;
  starts: number;
  wins: number;
  winRate: number;
  earnings: number;
  fame: number;
  stage: NpcCareerStage;
  stageLabel: string;
  daysSinceStart: number | null;
  milestones: RivalMilestoneRecord[];
}

function orderedHistory(horse: Horse): HorseRaceHistoryEntry[] {
  return [...(horse.raceHistory ?? [])].sort((a, b) => a.day - b.day);
}

function earningsMilestoneDay(history: HorseRaceHistoryEntry[], threshold: number): number | null {
  let total = 0;
  for (const start of history) {
    total += start.purseEarned ?? 0;
    if (total >= threshold) return start.day;
  }
  return null;
}

function milestoneDay(horse: Horse, key: string, currentDay: number): number | null {
  const history = orderedHistory(horse);
  if (key === "debut") return history[0]?.day ?? null;
  if (key === "breakthrough_win") {
    return history.find((start) => start.position === 1 && !!start.grade)?.day ?? null;
  }
  if (key.startsWith("earnings_")) {
    const threshold = Number(key.slice("earnings_".length));
    return Number.isFinite(threshold) ? earningsMilestoneDay(history, threshold) : null;
  }
  if (key === "stage_prime") {
    return Math.min(currentDay, horse.birthDay + Math.max(2, horse.peakAge) * 365);
  }
  if (key === "stage_declining") {
    return Math.min(currentDay, horse.birthDay + (Math.max(2, horse.peakAge) + 2) * 365);
  }
  if (key === "retirement") {
    return horse.retiredOnDay ?? history.at(-1)?.day ?? currentDay;
  }
  return null;
}

/**
 * Build a comparable career profile for a single rival horse.
 *
 * @param horse - Rival horse
 * @param day - Current game day
 * @returns Career profile including full milestone history
 */
export function buildRivalCareerProfile(horse: Horse, day: number): RivalCareerProfile {
  const career = summarizeNpcCareer(horse, day);
  const announced = new Set(horse.careerMilestonesAnnounced ?? []);
  const milestones = detectRivalMilestones(horse, []).map((m) => ({
    key: m.key,
    kind: m.kind,
    title: m.title,
    day: milestoneDay(horse, m.key, day),
    announced: announced.has(m.key),
  })).sort((a, b) => (a.day ?? Number.MAX_SAFE_INTEGER) - (b.day ?? Number.MAX_SAFE_INTEGER));

  return {
    id: horse.id,
    name: horse.name,
    stableId: getStableId(horse) ?? undefined,
    age: Math.floor(horse.age),
    starts: career.starts,
    wins: career.wins,
    winRate: career.winRate,
    earnings: career.earnings,
    fame: Math.round(horse.fame ?? 0),
    stage: careerStage(horse),
    stageLabel: careerStageLabel(careerStage(horse)),
    daysSinceStart: career.daysSinceStart,
    milestones,
  };
}

/**
 * Build career profiles for a set of rival horses, richest career first.
 *
 * @param horses - Rival horses to compare
 * @param day - Current game day
 * @returns Profiles sorted by earnings then starts
 */
export function buildRivalCareerProfiles(horses: Horse[], day: number): RivalCareerProfile[] {
  return horses
    .map((h) => buildRivalCareerProfile(h, day))
    .sort((a, b) => b.earnings - a.earnings || b.starts - a.starts);
}
