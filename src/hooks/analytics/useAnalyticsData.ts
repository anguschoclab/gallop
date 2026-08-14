/**
 * useAnalyticsData.ts - Derived series for /analytics screens.
 * Reads directly from the game store; no business-logic changes.
 */
import { useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { Transaction } from "@/core/transactions/transactionTypes";
import { getCareerStats } from "@/core/horse/stats";
import {
  ANALYTICS_CASH_LOOKBACK_DAYS,
  ANALYTICS_RECENT_RACES_COUNT,
  ANALYTICS_EARNINGS_WEEKS,
  ANALYTICS_EXPENSE_LOOKBACK_DAYS,
  ANALYTICS_EXPENSE_TOP_N,
  ANALYTICS_SIRE_TREND_DAYS,
  ANALYTICS_ENERGY_BUCKET_COUNT,
  ANALYTICS_ENERGY_BUCKET_WIDTH,
} from "@/constants";

export function useAnalyticsData() {
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const horses = useGame((s) => s.horses);
  const transactions = useGameWithShallow((s) => s.transactions);
  const sireLeaderboards = useGame((s) => s.sireLeaderboards);
  const sireTrendHistory = useGameWithShallow((s) => s.sireTrendHistory ?? []);

  return useMemo(() => {
    const owned = Object.values(horses).filter((h) => h.owned);
    const active = owned.filter((h) => h.lifecycleStatus === "active");

    // Cash curve from transactions balanceAfter
    const minDay = Math.max(0, day - ANALYTICS_CASH_LOOKBACK_DAYS);
    const cashPoints = transactions
      .filter((t) => t.day >= minDay)
      .map((t) => ({ x: t.day, y: t.balanceAfter }));
    if (cashPoints.length === 0) cashPoints.push({ x: day, y: cash });

    // Win/place/show from recent race results across owned horses
    let wins = 0,
      places = 0,
      shows = 0,
      runs = 0;
    owned.forEach((h) => {
      h.raceHistory.slice(-ANALYTICS_RECENT_RACES_COUNT).forEach((r) => {
        runs++;
        if (r.position === 1) wins++;
        else if (r.position === 2) places++;
        else if (r.position === 3) shows++;
      });
    });

    // Earnings vs spend - bucketed weekly
    const weeks = ANALYTICS_EARNINGS_WEEKS;
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

    // Expense category breakdown
    const recentExpenses = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.day < day - ANALYTICS_EXPENSE_LOOKBACK_DAYS) return;
      if (t.amount < 0) {
        const key = t.subcategory || t.type || "other";
        recentExpenses.set(key, (recentExpenses.get(key) ?? 0) + -t.amount);
      }
    });
    const expenseRows = Array.from(recentExpenses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, ANALYTICS_EXPENSE_TOP_N)
      .map(([label, value]) => ({ label, value }));

    // Energy distribution
    const energyBuckets = new Array(ANALYTICS_ENERGY_BUCKET_COUNT).fill(0);
    active.forEach((h) => {
      const idx = Math.min(
        ANALYTICS_ENERGY_BUCKET_COUNT - 1,
        Math.floor(h.energy / ANALYTICS_ENERGY_BUCKET_WIDTH),
      );
      energyBuckets[idx]++;
    });

    // Pre-compute sire trend map for O(1) lookups
    const sireTrendMap = new Map<string, number[]>();
    const trendMinDay = day - ANALYTICS_SIRE_TREND_DAYS;
    for (let i = 0; i < sireTrendHistory.length; i++) {
      const t = sireTrendHistory[i];
      if (t.day < trendMinDay) continue;
      const arr = sireTrendMap.get(t.stallionId);
      if (arr) {
        arr.push(t.aei);
      } else {
        sireTrendMap.set(t.stallionId, [t.aei]);
      }
    }

    // Top sire trend
    const topSire = sireLeaderboards?.overall?.rankings?.[0];
    const topSireTrend = topSire ? (sireTrendMap.get(topSire.stallionId) ?? []) : [];

    // Pre-compute expense-by-horse map for O(1) lookups
    const expenseByHorse = new Map<string, number>();
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      if (t.amount >= 0 || !t.horseId) continue;
      expenseByHorse.set(t.horseId, (expenseByHorse.get(t.horseId) ?? 0) + -t.amount);
    }

    // Per-horse ROI (career-ish proxy): earnings vs expenses captured per horse
    const horseRoi = owned.map((h) => {
      const earnings = getCareerStats(h).earnings;
      const expense = expenseByHorse.get(h.id) ?? 0;
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
