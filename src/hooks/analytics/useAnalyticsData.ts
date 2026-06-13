/**
 * useAnalyticsData.ts - Derived series for /analytics screens.
 * Reads directly from the game store; no business-logic changes.
 */
import { useMemo } from "react";
import { useGame } from "@/game/store";
import type { CashFlowEntry } from "@/core/financial/financialTypes";

export function useAnalyticsData() {
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const horses = useGame((s) => s.horses);
  const transactions = useGame((s) => (s as unknown as { transactions?: CashFlowEntry[] }).transactions ?? []);
  const sireLeaderboards = useGame((s) => s.sireLeaderboards);
  const sireTrendHistory = useGame((s) => s.sireTrendHistory ?? []);

  return useMemo(() => {
    const owned = horses.filter((h) => h.owned);
    const active = owned.filter((h) => h.lifecycleStatus === "active");

    // Cash curve (last 90 days) from transactions balanceAfter
    const minDay = Math.max(0, day - 90);
    const cashPoints = transactions
      .filter((t) => t.day >= minDay)
      .map((t) => ({ x: t.day, y: t.balanceAfter }));
    if (cashPoints.length === 0) cashPoints.push({ x: day, y: cash });

    // Win/place/show from last 30 race results across owned horses
    let wins = 0, places = 0, shows = 0, runs = 0;
    owned.forEach((h) => {
      h.raceHistory.slice(-30).forEach((r) => {
        runs++;
        if (r.position === 1) wins++;
        else if (r.position === 2) places++;
        else if (r.position === 3) shows++;
      });
    });

    // Earnings vs spend - last 12 weeks bucketed weekly
    const weeks = 12;
    const buckets = Array.from({ length: weeks }, (_, i) => ({
      x: day - (weeks - 1 - i) * 7,
      income: 0,
      expense: 0,
    }));
    transactions.forEach((t) => {
      const weeksAgo = Math.floor((day - t.day) / 7);
      if (weeksAgo < 0 || weeksAgo >= weeks) return;
      const b = buckets[weeks - 1 - weeksAgo];
      if (t.amount >= 0) b.income += t.amount;
      else b.expense += -t.amount;
    });

    // Expense category breakdown (last 30 days)
    const recentExpenses = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.day < day - 30) return;
      if (t.amount < 0) {
        const key = t.subcategory || t.category || "other";
        recentExpenses.set(key, (recentExpenses.get(key) ?? 0) + -t.amount);
      }
    });
    const expenseRows = Array.from(recentExpenses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));

    // Energy distribution
    const energyBuckets = [0, 0, 0, 0, 0]; // 0-19, 20-39, 40-59, 60-79, 80-100
    active.forEach((h) => {
      const idx = Math.min(4, Math.floor(h.energy / 20));
      energyBuckets[idx]++;
    });

    // Top sire trend (last 60d)
    const topSire = sireLeaderboards?.overall?.rankings?.[0];
    const topSireTrend = topSire
      ? sireTrendHistory
          .filter((t) => t.stallionId === topSire.stallionId && t.day >= day - 60)
          .map((t) => t.aei)
      : [];

    // Per-horse ROI (career-ish proxy): earnings vs expenses captured per horse
    const horseRoi = owned.map((h) => {
      const earnings = h.earnings ?? 0;
      const expense = transactions
        .filter((t) => t.horseId === h.id && t.amount < 0)
        .reduce((s, t) => s + -t.amount, 0);
      return { id: h.id, name: h.name, earnings, expense, net: earnings - expense };
    });
    const rankedRoi = [...horseRoi].sort((a, b) => b.net - a.net);

    return {
      day,
      cash,
      owned,
      active,
      cashPoints,
      wpsRatio: { wins, places, shows, runs },
      earningsVsSpend: buckets,
      expenseRows,
      energyBuckets,
      topSire,
      topSireTrend,
      rankedRoi,
      sireLeaderboards,
      sireTrendHistory,
    };
  }, [day, cash, horses, transactions, sireLeaderboards, sireTrendHistory]);
}
