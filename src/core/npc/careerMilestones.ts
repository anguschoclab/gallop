/**
 * careerMilestones.ts - Rival-horse career milestone detection
 *
 * Detects notable moments in an NPC horse's career (debut, breakthrough graded
 * win, major earnings thresholds, peak-career transitions, retirement) so the
 * game can alert the player about rival horses worth watching.
 *
 * Pure derivation — no mutation of inputs.
 *
 * Dependencies: @/core/horse/types, ./careerTracker
 * Related files: src/core/time/phases/npcMilestoneAlertsPhase.ts (drives this)
 */

import type { Horse, NpcCareerStage } from "@/core/horse/types";
import { careerStage } from "./careerTracker";
import { formatCurrency } from "@/core/common/formatting";

export type RivalMilestoneKind =
  | "debut"
  | "breakthrough_win"
  | "earnings"
  | "peak_transition"
  | "retirement";

export interface RivalMilestone {
  /** Stable key used to avoid re-announcing the same milestone. */
  key: string;
  kind: RivalMilestoneKind;
  title: string;
  body: string;
}

/** Lifetime-earnings thresholds that deserve an alert, ascending. */
export const EARNINGS_MILESTONES = [250_000, 500_000, 1_000_000, 2_500_000, 5_000_000];

/** Minimum fame for a rival's plain debut to be worth reporting. */
const DEBUT_FAME_FLOOR = 15;

function gradedWinCount(horse: Horse): number {
  return (horse.raceHistory ?? []).filter((e) => e.position === 1 && !!e.grade).length;
}

function firstGradedWin(horse: Horse) {
  return (horse.raceHistory ?? []).find((e) => e.position === 1 && !!e.grade);
}

/**
 * Whether a rival horse is prominent enough that the player should hear about it.
 *
 * @param horse - NPC horse
 * @returns True when the horse is notable
 */
export function isNotableRival(horse: Horse): boolean {
  if ((horse.fame ?? 0) >= 25) return true;
  if ((horse.lifetimeEarnings ?? 0) >= 100_000) return true;
  return gradedWinCount(horse) >= 1;
}

const PEAK_STAGES: NpcCareerStage[] = ["prime", "declining"];

/**
 * Detect the career milestones a rival horse has reached but not yet announced.
 *
 * @param horse - NPC horse to inspect
 * @param announced - Milestone keys already alerted on
 * @returns Newly reached milestones, in narrative order
 */
export function detectRivalMilestones(horse: Horse, announced: string[] = []): RivalMilestone[] {
  const seen = new Set(announced);
  const out: RivalMilestone[] = [];
  const starts = horse.raceHistory?.length ?? horse.careerStarts ?? 0;
  const earnings = horse.lifetimeEarnings ?? 0;
  const stage = careerStage(horse);
  const push = (m: RivalMilestone) => {
    if (!seen.has(m.key)) out.push(m);
  };

  // Debut — first career start.
  if (starts >= 1 && (horse.fame ?? 0) >= DEBUT_FAME_FLOOR) {
    push({
      key: "debut",
      kind: "debut",
      title: `${horse.name} makes racecourse debut`,
      body: `${horse.name} has taken the first start of its career. Worth keeping an eye on.`,
    });
  }

  // Breakthrough — first graded victory.
  const graded = firstGradedWin(horse);
  if (graded) {
    push({
      key: "breakthrough_win",
      kind: "breakthrough_win",
      title: `${horse.name} breaks through in graded company`,
      body: `${horse.name} landed its first graded success in the ${graded.raceName} (${graded.grade}). A rival on the rise.`,
    });
  }

  // Major earnings thresholds.
  for (const threshold of EARNINGS_MILESTONES) {
    if (earnings < threshold) break;
    push({
      key: `earnings_${threshold}`,
      kind: "earnings",
      title: `${horse.name} passes ${formatCurrency(threshold)} in earnings`,
      body: `${horse.name} has now banked ${formatCurrency(earnings)} across ${starts} career starts.`,
    });
  }

  // Peak-career transitions.
  if (PEAK_STAGES.includes(stage)) {
    const entering = stage === "prime";
    push({
      key: `stage_${stage}`,
      kind: "peak_transition",
      title: entering
        ? `${horse.name} enters peak form`
        : `${horse.name} is past its peak years`,
      body: entering
        ? `At ${Math.floor(horse.age)}, ${horse.name} has reached the prime of its career and should campaign hard this season.`
        : `${horse.name} is ${Math.floor(horse.age)} and beginning to decline — its best form may now be behind it.`,
    });
  }

  // Retirement.
  if (stage === "retired") {
    const wins = (horse.raceHistory ?? []).filter((e) => e.position === 1).length;
    push({
      key: "retirement",
      kind: "retirement",
      title: `${horse.name} retires from racing`,
      body: `${horse.name} has been retired after ${starts} starts and ${wins} wins, with ${formatCurrency(earnings)} in lifetime earnings.`,
    });
  }

  return out;
}
