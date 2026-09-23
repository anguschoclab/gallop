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

import type { Horse, NpcCareerStage } from "@/core/horse/types";
import { careerStage, careerStageLabel, summarizeNpcCareer } from "./careerTracker";
import { getStableId } from "@/core/horse/ownership";
import { detectRivalMilestones, type RivalMilestoneKind } from "./careerMilestones";

export interface RivalMilestoneRecord {
  key: string;
  kind: RivalMilestoneKind;
  title: string;
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
    announced: announced.has(m.key),
  }));

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
