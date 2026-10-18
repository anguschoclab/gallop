/**
 * dailyPlanView.ts - Groups campaign history into a day-by-day strategy view.
 *
 * Each day shows the player's race choices (horse, race, finish, prize), which
 * campaign goal classes were served, the linked journal plan text, and a plan
 * effectiveness score computed with the same `rawScore` formula the Strategy
 * Journal uses — over that day's journaled race outcomes.
 *
 * Dependencies: @/core/stable/campaignHistory (CampaignHistoryRow),
 *   ./strategyJournal (rawScore, GoalClass via stableGoals)
 * Related files: src/routes/daily-plans.tsx (consumer),
 *   src/routes/stableCampaign.tsx (source of CampaignHistoryRow[])
 */
import type { CampaignHistoryRow } from "@/domains/stable/simulation/campaignHistory";
import type { GoalClass } from "@/domains/stable/simulation/stableGoals";
import { rawScore } from "@/domains/tactics/simulation/strategyJournal";

/** Assumed field size when a race-history row lacks one (typical gate). */
const FALLBACK_FIELD_SIZE = 12;

export interface DayRaceEntry {
  raceId: string;
  raceName: string;
  horseId: string;
  horseName: string;
  position: number;
  fieldSize?: number;
  prize: number;
  goalClass: GoalClass | null;
  countedForGoal: boolean;
  planText?: string;
}

export interface DailyPlanRow {
  day: number;
  races: DayRaceEntry[];
  /** Goal classes in which a win that day counted toward a campaign goal. */
  goalsServed: GoalClass[];
  /** 0-100 plan effectiveness for the day; null when no journaled race ran. */
  score: number | null;
  /** Prize money earned across the day. */
  totalPrize: number;
  /** Player prestige delta for the day; races entered by two of your horses count once. */
  totalPrestige: number;
}

/**
 * Roll `CampaignHistoryRow[]` up into one `DailyPlanRow` per day, newest first.
 *
 * The day's score only uses races whose journal plan recorded a "run" outcome,
 * so days raced without a journaled plan show no score instead of an empty 0.
 *
 * @param campaignRows - Rows from `buildCampaignHistory()`
 */
export function buildDailyPlanTimeline(campaignRows: CampaignHistoryRow[]): DailyPlanRow[] {
  const byDay = new Map<number, CampaignHistoryRow[]>();
  for (const row of campaignRows) {
    const dayRows = byDay.get(row.day);
    if (dayRows) dayRows.push(row);
    else byDay.set(row.day, [row]);
  }

  return [...byDay.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, rows]) => {
      const goalsServed: GoalClass[] = [];
      const prestigeByRace = new Map<string, number>();
      let totalPrize = 0;
      let scoredRuns = 0;
      let wins = 0;
      let places = 0;
      let qualitySum = 0;

      for (const r of rows) {
        totalPrize += r.prize;
        if (r.goalClass && r.countedForGoal && !goalsServed.includes(r.goalClass)) {
          goalsServed.push(r.goalClass);
        }
        if (r.prestige !== null) {
          prestigeByRace.set(r.raceId, r.prestige);
        }
        if (r.plan?.outcome.status === "run") {
          scoredRuns++;
          const { position, fieldSize } = r.plan.outcome;
          const f = fieldSize ?? FALLBACK_FIELD_SIZE;
          if (position === 1) wins++;
          if (position <= 3) places++;
          qualitySum += f > 1 ? 1 - (position - 1) / (f - 1) : position === 1 ? 1 : 0;
        }
      }

      return {
        day,
        races: rows.map((r) => ({
          raceId: r.raceId,
          raceName: r.raceName,
          horseId: r.horseId,
          horseName: r.horseName,
          position: r.position,
          fieldSize: r.fieldSize ?? undefined,
          prize: r.prize,
          goalClass: r.goalClass,
          countedForGoal: r.countedForGoal,
          planText: r.plan?.text,
        })),
        goalsServed,
        score:
          scoredRuns > 0
            ? Math.round(rawScore(wins / scoredRuns, places / scoredRuns, qualitySum / scoredRuns))
            : null,
        totalPrize,
        totalPrestige: [...prestigeByRace.values()].reduce((s, v) => s + v, 0),
      };
    });
}
