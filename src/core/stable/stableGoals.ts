/**
 * stableGoals.ts - Player stable campaign goals (target net worth + class win goals)
 * and the race-scoring bonus that steers the Race Advisor and auto-entry toward them.
 */
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { horseMarketValue } from "@/core/horse/pricing";

export type GoalClass = "G1" | "G2" | "G3" | "Stakes";
export const GOAL_CLASSES: GoalClass[] = ["G1", "G2", "G3", "Stakes"];

export interface StableGoals {
  /** Net worth (cash + horse values) to reach. */
  targetNetWorth?: number;
  /** Game day by which to reach the net worth target. */
  targetDay?: number;
  /** Wins wanted per race class, counted from `startDay`. */
  classGoals: Partial<Record<GoalClass, number>>;
  /** Day the class-goal count starts from. */
  startDay: number;
  /** How hard the goals steer race choice: 0 off … 2 strong. */
  weight: number;
  /** Raise met goals and extend missed deadlines automatically each day. */
  autoAdjust?: boolean;
  /** Recent automatic goal changes, newest first. */
  adjustmentLog?: GoalAdjustment[];
}

export const DEFAULT_STABLE_GOALS: StableGoals = { classGoals: {}, startDay: 0, weight: 1 };

export interface GoalProgress {
  netWorth: number;
  netWorthGap: number;
  classWins: Record<GoalClass, number>;
  classRemaining: Record<GoalClass, number>;
}

export function raceGoalClass(race: Pick<Race, "graded" | "raceClass">): GoalClass | null {
  const g = race.graded?.grade;
  if (g === "G1" || g === "G2" || g === "G3") return g;
  const rc = String(race.raceClass ?? "");
  if (/^G[123]$/.test(rc)) return rc as GoalClass;
  if (/stakes|listed/i.test(rc)) return "Stakes";
  return null;
}

function historyClass(grade?: string, raceClass?: string): GoalClass | null {
  if (grade === "G1" || grade === "G2" || grade === "G3") return grade;
  return raceGoalClass({ raceClass: raceClass as Race["raceClass"] });
}

export function playerNetWorth(horses: Horse[], cash: number): number {
  let total = cash;
  for (const h of horses) {
    if (!h?.stats || !isPlayerOwned(h) || h.lifecycleStatus === "deceased") continue;
    total += horseMarketValue(h);
  }
  return Math.round(total);
}

export function goalProgress(goals: StableGoals, horses: Horse[], cash: number): GoalProgress {
  const netWorth = playerNetWorth(horses, cash);
  const classWins: Record<GoalClass, number> = { G1: 0, G2: 0, G3: 0, Stakes: 0 };
  for (const h of horses) {
    if (!isPlayerOwned(h)) continue;
    for (const r of h.raceHistory ?? []) {
      if (r.position !== 1 || r.day < goals.startDay) continue;
      const c = historyClass(r.grade, r.raceClass);
      if (c) classWins[c]++;
    }
  }
  const classRemaining = { G1: 0, G2: 0, G3: 0, Stakes: 0 } as Record<GoalClass, number>;
  for (const c of GOAL_CLASSES) {
    classRemaining[c] = Math.max(0, (goals.classGoals[c] ?? 0) - classWins[c]);
  }
  return {
    netWorth,
    netWorthGap: Math.max(0, (goals.targetNetWorth ?? 0) - netWorth),
    classWins,
    classRemaining,
  };
}

export interface GoalBonus {
  bonus: number;
  reasons: string[];
}

/**
 * Extra suitability points for a race given the stable's open goals.
 * @param race - Race being evaluated for suitability
 * @param goals - Stable goals (may be undefined)
 * @param progress - Goal progress snapshot (may be undefined)
 */
export function goalRaceBonus(
  race: Pick<Race, "graded" | "raceClass" | "purse">,
  goals: StableGoals | undefined,
  progress: GoalProgress | undefined,
): GoalBonus {
  if (!goals || !progress || goals.weight <= 0) return { bonus: 0, reasons: [] };
  const reasons: string[] = [];
  let bonus = 0;
  const cls = raceGoalClass(race);
  if (cls && progress.classRemaining[cls] > 0) {
    const target = goals.classGoals[cls] ?? 1;
    bonus += 10 + 10 * (progress.classRemaining[cls] / Math.max(1, target));
    reasons.push(`Counts toward your ${cls} goal (${progress.classRemaining[cls]} win(s) to go).`);
  }
  if (progress.netWorthGap > 0 && goals.targetNetWorth) {
    const gapShare = Math.min(1, progress.netWorthGap / goals.targetNetWorth);
    const purseScore = Math.min(12, ((race.purse ?? 0) / 20000) * 4);
    if (purseScore >= 1) {
      bonus += purseScore * (0.5 + gapShare);
      reasons.push("Prize money helps close the gap to your net-worth target.");
    }
  }
  return { bonus: Math.round(bonus * goals.weight * 10) / 10, reasons };
}

export interface GoalAdjustment {
  day: number;
  text: string;
}

/** Max adjustment notes kept on the goals object. */
export const GOAL_ADJUSTMENT_LOG_MAX = 20;
/** Net-worth target is raised to this multiple of current net worth once reached. */
export const NET_WORTH_RAISE_FACTOR = 1.25;
/** Days added to a missed net-worth deadline. */
export const DEADLINE_EXTENSION_DAYS = 90;

/**
 * Moves goals forward as the stable progresses: a met class goal is raised by
 * half its size (min 1), a reached net-worth target is raised to 125% of
 * current net worth (rounded to $10k), and a missed deadline is extended 90 days.
 * Returns the same object when nothing changes or auto-adjust is off.
 * @param goals
 * @param progress
 * @param day
 */
export function autoAdjustGoals(
  goals: StableGoals,
  progress: GoalProgress,
  day: number,
): { goals: StableGoals; adjustments: GoalAdjustment[] } {
  if (!goals.autoAdjust) return { goals, adjustments: [] };
  const adjustments: GoalAdjustment[] = [];
  const classGoals = { ...goals.classGoals };
  for (const c of GOAL_CLASSES) {
    const target = classGoals[c] ?? 0;
    if (target <= 0 || progress.classWins[c] < target) continue;
    const next = progress.classWins[c] + Math.max(1, Math.ceil(target / 2));
    classGoals[c] = next;
    adjustments.push({
      day,
      text: `${c} goal met (${progress.classWins[c]} wins) — raised to ${next}.`,
    });
  }
  let { targetNetWorth, targetDay } = goals;
  if (targetNetWorth && progress.netWorth >= targetNetWorth) {
    const next = Math.ceil((progress.netWorth * NET_WORTH_RAISE_FACTOR) / 10000) * 10000;
    adjustments.push({
      day,
      text: `Net worth target of $${targetNetWorth.toLocaleString()} reached — raised to $${next.toLocaleString()}.`,
    });
    targetNetWorth = next;
    if (targetDay !== undefined) targetDay = day + DEADLINE_EXTENSION_DAYS;
  } else if (targetNetWorth && targetDay !== undefined && day > targetDay) {
    adjustments.push({
      day,
      text: `Net worth deadline (day ${targetDay}) missed — extended to day ${day + DEADLINE_EXTENSION_DAYS}.`,
    });
    targetDay = day + DEADLINE_EXTENSION_DAYS;
  }
  if (adjustments.length === 0) return { goals, adjustments };
  return {
    goals: {
      ...goals,
      classGoals,
      targetNetWorth,
      targetDay,
      adjustmentLog: [...adjustments, ...(goals.adjustmentLog ?? [])].slice(
        0,
        GOAL_ADJUSTMENT_LOG_MAX,
      ),
    },
    adjustments,
  };
}
