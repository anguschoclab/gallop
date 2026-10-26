import { useMemo } from "react";
import { useGame } from "@/platform/game/store";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import {
  dailyStatsSummary,
  dailySummaryTotals,
  type DailySummaryRow,
  type DailySummaryWindow,
} from "@/domains/dashboard/simulation/dailyStatsSummary";

export type DailySummarySort = "rating" | "change" | "name";

export interface DailySummaryViewRow extends DailySummaryRow {
  name: string;
}

/** Player horses' daily progress digest for the dashboard. */
export function useDailyStatsSummary(window: DailySummaryWindow, sort: DailySummarySort) {
  const horses = useGame((s) => s.horses);
  const progress = useGame((s) => s.horseDailyProgress);
  const day = useGame((s) => s.day);

  return useMemo(() => {
    const owned = Object.values(horses).filter(
      (h) => h && isPlayerOwned(h) && h.lifecycleStatus !== "deceased",
    );
    const names = new Map(owned.map((h) => [h.id, h.name]));
    const rows: DailySummaryViewRow[] = dailyStatsSummary(
      progress,
      owned.map((h) => h.id),
      day,
      window,
    ).map((r) => ({ ...r, name: names.get(r.horseId) ?? "Unknown" }));

    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "change") return (b.changes.price ?? 0) - (a.changes.price ?? 0);
      return (b.latest?.ovr ?? -1) - (a.latest?.ovr ?? -1);
    });

    return { rows, totals: dailySummaryTotals(rows), hasHistory: rows.some((r) => r.latest) };
  }, [horses, progress, day, window, sort]);
}
