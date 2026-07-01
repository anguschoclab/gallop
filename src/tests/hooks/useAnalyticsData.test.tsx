import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import { createTestHorse } from "@/tests/helpers";
import type {
  Transaction,
  TransactionType,
  TransactionSubcategory,
} from "@/core/transactions/transactionTypes";
import type { SireRanking, Leaderboard, SireTrendData } from "@/core/breeding/leaderboardTypes";
import type { SireAnalytics } from "@/core/breeding/sireAnalytics";
function mkSireAnalytics(stallionId: string): SireAnalytics {
  return {
    stallionId,
    stallionName: `Sire ${stallionId}`,
    aei: 2.5,
    ci: 1.8,
    classification: "elite",
    surfaceBias: "balanced",
    distancePreference: "versatile",
    progenyWinPercentage: 0.2,
    lifetimeFoals: 50,
    lifetimeStakesFoals: 5,
    lifetimeG1Foals: 1,
    standingFee: 5000,
  };
}

function mkRanking(stallionId: string, rank: number, value: number): SireRanking {
  return {
    stallionId,
    stallionName: `Sire ${stallionId}`,
    rank,
    value,
    metrics: mkSireAnalytics(stallionId),
  };
}

function mkTrend(stallionId: string, day: number, aei: number): SireTrendData {
  return { stallionId, day, aei, ci: 1.5, stakesFoals: 3, g1Foals: 0 };
}

function mkTransaction(id: string, day: number, amount: number, horseId?: string): Transaction {
  return {
    id,
    day,
    type: (amount >= 0 ? "income" : "expense") as TransactionType,
    subcategory: "other" as TransactionSubcategory,
    amount,
    description: "test transaction",
    horseId,
    balanceAfter: 100000 + amount,
    recurring: false,
  };
}

function captureAnalyticsData() {
  const captured: ReturnType<typeof useAnalyticsData>[] = [];
  function Probe() {
    const data = useAnalyticsData();
    captured.push(data);
    return null;
  }
  return { Probe, captured };
}

describe("useAnalyticsData", () => {
  afterEach(() => {
    cleanup();
  });

  it("topSireTrend returns correct AEI series for top sire within 60-day window", () => {
    const rankings = [mkRanking("s1", 1, 3.2)];
    const overall: Leaderboard = {
      type: "overall",
      title: "Overall",
      description: "All sires",
      rankings,
      lastUpdated: 100,
    };
    const trends: SireTrendData[] = [
      mkTrend("s1", 30, 1.0),
      mkTrend("s1", 50, 2.0),
      mkTrend("s1", 80, 3.2),
    ];
    const { Probe, captured } = captureAnalyticsData();
    renderWithStore(<Probe />, {
      day: 100,
      cash: 100000,
      horses: [],
      transactions: [],
      sireLeaderboards: { overall },
      sireTrendHistory: trends,
    } as any);
    expect(captured[0].topSireTrend).toEqual([2.0, 3.2]);
  });

  it("rankedRoi correctly aggregates expenses per horse from transactions", () => {
    const h1 = createTestHorse({
      id: "h1",
      name: "Horse 1",
      owned: true,
      lifecycleStatus: "active",
    });
    const h2 = createTestHorse({
      id: "h2",
      name: "Horse 2",
      owned: true,
      lifecycleStatus: "active",
    });
    const transactions: Transaction[] = [
      mkTransaction("t1", 95, -500, "h1"),
      mkTransaction("t2", 96, -300, "h1"),
      mkTransaction("t3", 97, -800, "h2"),
    ];
    const { Probe, captured } = captureAnalyticsData();
    renderWithStore(<Probe />, {
      day: 100,
      cash: 100000,
      horses: [h1, h2],
      transactions,
    } as any);
    const roi = captured[0].rankedRoi;
    const r1 = roi.find((r) => r.id === "h1");
    const r2 = roi.find((r) => r.id === "h2");
    expect(r1?.expense).toBe(800);
    expect(r2?.expense).toBe(800);
  });

  it("rankedRoi handles horses with no transactions (zero expense)", () => {
    const h1 = createTestHorse({
      id: "h1",
      name: "Horse 1",
      owned: true,
      lifecycleStatus: "active",
    });
    const { Probe, captured } = captureAnalyticsData();
    renderWithStore(<Probe />, {
      day: 100,
      cash: 100000,
      horses: [h1],
      transactions: [],
    } as any);
    const roi = captured[0].rankedRoi;
    expect(roi[0].expense).toBe(0);
  });

  it("rankedRoi sorts by net descending", () => {
    const h1 = createTestHorse({
      id: "h1",
      name: "Horse 1",
      owned: true,
      lifecycleStatus: "active",
    });
    const h2 = createTestHorse({
      id: "h2",
      name: "Horse 2",
      owned: true,
      lifecycleStatus: "active",
    });
    const transactions: Transaction[] = [
      mkTransaction("t1", 95, -1000, "h1"),
      mkTransaction("t2", 96, -100, "h2"),
    ];
    const { Probe, captured } = captureAnalyticsData();
    renderWithStore(<Probe />, {
      day: 100,
      cash: 100000,
      horses: [h1, h2],
      transactions,
    } as any);
    const roi = captured[0].rankedRoi;
    expect(roi[0].net).toBeGreaterThanOrEqual(roi[1].net);
  });
});
