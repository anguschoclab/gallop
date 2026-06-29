import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

vi.mock("@/components/charts", () => ({
  ChartCard: ({ title, children }: { title: string; children?: ReactNode }) =>
    createElement("div", null, createElement("h3", null, title), children),
  MiniBar: ({ rows }: { rows: { label: string; value: number }[] }) =>
    createElement(
      "ul",
      null,
      rows.map((r) => createElement("li", { key: r.label }, r.label, ": ", r.value)),
    ),
  Sparkline: ({ data }: { data: number[] }) =>
    createElement("div", { "data-testid": "sparkline" }, data.join(",")),
  chartColors: { primary: "var(--chart-1)" },
}));

const mockAnalyticsData = vi.fn();

vi.mock("@/hooks/analytics/useAnalyticsData", () => ({
  useAnalyticsData: () => mockAnalyticsData(),
}));

import { AnalyticsBreedingTab } from "@/components/analytics/AnalyticsBreedingTab";
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

function setupData(overrides?: {
  rankings?: SireRanking[];
  sireTrendHistory?: SireTrendData[];
  day?: number;
}) {
  const rankings = overrides?.rankings ?? [];
  const overall: Leaderboard | undefined = rankings.length
    ? {
        type: "overall",
        title: "Overall",
        description: "All sires",
        rankings,
        lastUpdated: overrides?.day ?? 100,
      }
    : undefined;
  mockAnalyticsData.mockReturnValue({
    day: overrides?.day ?? 100,
    cash: 100000,
    owned: [],
    active: [],
    cashPoints: [],
    wpsRatio: { wins: 0, places: 0, shows: 0, runs: 0 },
    earningsVsSpend: [],
    expenseRows: [],
    energyBuckets: [0, 0, 0, 0, 0],
    topSire: rankings[0],
    topSireTrend: [],
    rankedRoi: [],
    sireLeaderboards: overall ? { overall } : undefined,
    sireTrendHistory: overrides?.sireTrendHistory ?? [],
  });
}

describe("AnalyticsBreedingTab", () => {
  afterEach(() => {
    cleanup();
    mockAnalyticsData.mockReset();
  });

  it("renders leaderboard rows when rankings has data", () => {
    const rankings = [mkRanking("s1", 1, 3.2), mkRanking("s2", 2, 2.8)];
    setupData({ rankings });
    render(<AnalyticsBreedingTab />);
    expect(screen.getByText(/1\. Sire s1/)).toBeTruthy();
    expect(screen.getByText(/2\. Sire s2/)).toBeTruthy();
  });

  it("renders sparkline when sireTrendHistory has >1 entry for a ranked sire within 60 days", () => {
    const rankings = [mkRanking("s1", 1, 3.2)];
    const trends: SireTrendData[] = [
      mkTrend("s1", 50, 2.0),
      mkTrend("s1", 70, 2.5),
      mkTrend("s1", 100, 3.2),
    ];
    setupData({ rankings, sireTrendHistory: trends, day: 100 });
    render(<AnalyticsBreedingTab />);
    const sparklines = screen.getAllByTestId("sparkline");
    expect(sparklines.length).toBeGreaterThanOrEqual(1);
    expect(sparklines[0].textContent).toBe("2,2.5,3.2");
  });

  it("renders 'no trend' when sireTrendHistory has ≤1 entry for a sire", () => {
    const rankings = [mkRanking("s1", 1, 3.2)];
    const trends: SireTrendData[] = [mkTrend("s1", 100, 3.2)];
    setupData({ rankings, sireTrendHistory: trends, day: 100 });
    render(<AnalyticsBreedingTab />);
    expect(screen.getByText("no trend")).toBeTruthy();
  });

  it("renders 'No data' when rankings is empty", () => {
    setupData({ rankings: [] });
    render(<AnalyticsBreedingTab />);
    expect(screen.getByText(/No data/i)).toBeTruthy();
  });

  it("correctly filters trend data to last 60 days (entries older than day - 60 excluded)", () => {
    const rankings = [mkRanking("s1", 1, 3.2)];
    const trends: SireTrendData[] = [
      mkTrend("s1", 10, 1.0),
      mkTrend("s1", 39, 1.5),
      mkTrend("s1", 41, 2.0),
      mkTrend("s1", 100, 3.2),
    ];
    setupData({ rankings, sireTrendHistory: trends, day: 100 });
    render(<AnalyticsBreedingTab />);
    const sparklines = screen.getAllByTestId("sparkline");
    expect(sparklines.length).toBeGreaterThanOrEqual(1);
    expect(sparklines[0].textContent).toBe("2,3.2");
  });

  it("handles sires with no trend history gracefully (empty series, not crash)", () => {
    const rankings = [mkRanking("s1", 1, 3.2), mkRanking("s2", 2, 2.8)];
    const trends: SireTrendData[] = [mkTrend("s1", 100, 3.2), mkTrend("s1", 90, 2.8)];
    setupData({ rankings, sireTrendHistory: trends, day: 100 });
    render(<AnalyticsBreedingTab />);
    expect(screen.getByText("no trend")).toBeTruthy();
  });
});
