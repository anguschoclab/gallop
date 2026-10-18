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

import type { Horse, HorseRaceHistoryEntry, NpcCareerStage } from "@/domains/horse/simulation/types";
import { careerStage, careerStageLabel, summarizeNpcCareer } from "./careerTracker";
import { getStableId } from "@/domains/horse/simulation/ownership";
import { detectRivalMilestones, type RivalMilestoneKind } from "./careerMilestones";

export interface RivalMilestoneRecord {
  key: string;
  kind: RivalMilestoneKind;
  title: string;
  /** Best available absolute game day for plotting this milestone. */
  day: number | null;
  /** True when the player has already been alerted about this milestone. */
  announced: boolean;
  /** Race this milestone happened in (debut, breakthrough, earnings mark, last start). */
  raceId?: string;
  raceName?: string;
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
  /** Top-3 finishes / starts (0 when unraced). */
  placeRate: number;
  /** Mean finishing position (0 when unraced). */
  avgFinish: number;
  /** Lifetime earnings / starts (0 when unraced). */
  prizePerStart: number;
  /** 0-100 composite of win rate, place rate, finish quality and earnings per start. */
  efficiencyScore: number;
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

function milestoneRace(horse: Horse, key: string) {
  const history = orderedHistory(horse);
  if (key === "debut") return history[0];
  if (key === "breakthrough_win") return history.find((s) => s.position === 1 && !!s.grade);
  if (key.startsWith("earnings_")) {
    const threshold = Number(key.slice("earnings_".length));
    let total = 0;
    for (const start of history) {
      total += start.purseEarned ?? 0;
      if (total >= threshold) return start;
    }
    return undefined;
  }
  if (key === "retirement") return history.at(-1);
  return undefined;
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
    // Day the horse reached peak age, anchored on the authoritative `age`
    // field — `birthDay` is a placeholder (1) for all generated horses.
    const primeAge = Math.max(2, horse.peakAge);
    return Math.min(currentDay, currentDay - (Math.floor(horse.age) - primeAge) * 365);
  }
  if (key === "stage_declining") {
    const decliningAge = Math.max(2, horse.peakAge) + 2;
    return Math.min(currentDay, currentDay - (Math.floor(horse.age) - decliningAge) * 365);
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
/** Assumed field size when a race-history entry lacks one (typical gate). */
const FALLBACK_FIELD_SIZE = 12;

/**
 * How efficiently a rival converts starts into results: 40% win rate,
 * 25% place rate, 20% finish quality (position relative to field),
 * 15% earnings per start capped at $50k.
 * @param horse
 */
export function rivalEfficiencyScore(horse: Horse): {
  placeRate: number;
  avgFinish: number;
  prizePerStart: number;
  efficiencyScore: number;
} {
  const history = horse.raceHistory ?? [];
  const starts = history.length;
  if (starts === 0) {
    return { placeRate: 0, avgFinish: 0, prizePerStart: 0, efficiencyScore: 0 };
  }
  const places = history.filter((e) => e.position <= 3).length;
  const earnings = history.reduce((s, e) => s + (e.purseEarned ?? 0), 0);
  const quality =
    history.reduce((s, e) => {
      const f = e.fieldSize ?? FALLBACK_FIELD_SIZE;
      return s + (f > 1 ? 1 - (e.position - 1) / (f - 1) : e.position === 1 ? 1 : 0);
    }, 0) / starts;
  const winRate = history.filter((e) => e.position === 1).length / starts;
  const placeRate = places / starts;
  const prizePerStart = earnings / starts;
  const efficiencyScore = Math.round(
    100 *
      (0.4 * winRate +
        0.25 * placeRate +
        0.2 * quality +
        0.15 * Math.min(1, prizePerStart / 50_000)),
  );
  return {
    placeRate,
    avgFinish: history.reduce((s, e) => s + e.position, 0) / starts,
    prizePerStart,
    efficiencyScore,
  };
}

export function buildRivalCareerProfile(horse: Horse, day: number): RivalCareerProfile {
  const career = summarizeNpcCareer(horse, day);
  const announced = new Set(horse.careerMilestonesAnnounced ?? []);
  const milestones = detectRivalMilestones(horse, [])
    .map((m) => ({
      key: m.key,
      kind: m.kind,
      title: m.title,
      day: milestoneDay(horse, m.key, day),
      announced: announced.has(m.key),
      raceId: milestoneRace(horse, m.key)?.raceId,
      raceName: milestoneRace(horse, m.key)?.raceName,
    }))
    .sort((a, b) => (a.day ?? Number.MAX_SAFE_INTEGER) - (b.day ?? Number.MAX_SAFE_INTEGER));
  const efficiency = rivalEfficiencyScore(horse);

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
    ...efficiency,
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
