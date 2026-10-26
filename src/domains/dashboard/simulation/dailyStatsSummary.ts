/**
 * dailyStatsSummary.ts - Stable-wide daily progress digest for the dashboard:
 * each player horse's latest rating, form, energy and price with the change
 * since the previous recorded day or across the last 7 days.
 */
import {
  recentSnapshots,
  windowChange,
  type HorseDailyProgress,
  type HorseDailySnapshot,
} from "@/domains/horse/simulation/dailyProgress";
import type { DailySummaryWindow } from "@/domains/dashboard/model/dailySummaryTypes";

export type { DailySummaryWindow };

/** Days of snapshots compared for each window (inclusive of today). */
export const DAILY_SUMMARY_WINDOW_DAYS: Record<DailySummaryWindow, number> = {
  day: 2,
  week: 7,
};

export interface DailySummaryChanges {
  ovr: number | undefined;
  form: number | undefined;
  energy: number | undefined;
  price: number | undefined;
}

export interface DailySummaryRow {
  horseId: string;
  latest: HorseDailySnapshot | undefined;
  changes: DailySummaryChanges;
  /** Price values across the window, oldest first (for a trend line). */
  priceTrend: number[];
}

export interface DailySummaryTotals {
  /** Summed price change across horses that have a change in the window. */
  valueChange: number;
  improving: number;
  declining: number;
}

const NO_CHANGE: DailySummaryChanges = {
  ovr: undefined,
  form: undefined,
  energy: undefined,
  price: undefined,
};

/**
 * One row per horse id, in the given order.
 * @param progress - Saved per-horse daily snapshots
 * @param horseIds - Player horses to summarise
 * @param currentDay - Current game day
 * @param window - "day" compares with the previous day, "week" with 6 days ago
 */
export function dailyStatsSummary(
  progress: HorseDailyProgress | undefined,
  horseIds: string[],
  currentDay: number,
  window: DailySummaryWindow,
): DailySummaryRow[] {
  const days = DAILY_SUMMARY_WINDOW_DAYS[window];
  return horseIds.map((horseId) => {
    const snaps = recentSnapshots(progress?.[horseId], currentDay, days);
    const latest = snaps[snaps.length - 1];
    if (snaps.length < 2) {
      return { horseId, latest, changes: NO_CHANGE, priceTrend: snaps.map((s) => s.price) };
    }
    return {
      horseId,
      latest,
      changes: {
        ovr: windowChange(snaps, "ovr"),
        form: windowChange(snaps, "form"),
        energy: windowChange(snaps, "energy"),
        price: windowChange(snaps, "price"),
      },
      priceTrend: snaps.map((s) => s.price),
    };
  });
}

/** A horse is "improving" when its rating rose, "declining" when it fell. */
export function dailySummaryTotals(rows: DailySummaryRow[]): DailySummaryTotals {
  let valueChange = 0;
  let improving = 0;
  let declining = 0;
  for (const r of rows) {
    valueChange += r.changes.price ?? 0;
    const ovr = r.changes.ovr ?? 0;
    if (ovr >= 0.05) improving++;
    else if (ovr <= -0.05) declining++;
  }
  return { valueChange: Math.round(valueChange), improving, declining };
}
