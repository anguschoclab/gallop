import { describe, it, expect } from "vitest";
import {
  createDefaultScoutingThresholds,
  createScoutingAssignment,
  describeScoutingThresholds,
  matchesScoutingThresholds,
  planScoutingRun,
  type ScoutingCandidate,
} from "@/core/npc/scoutingThresholds";
import type { InsightRow, InsightMetricKey } from "@/core/horse/insightMetrics";

function row(
  id: string,
  overrides: Partial<Record<InsightMetricKey, number>> = {},
  extra: Partial<InsightRow> = {},
): InsightRow {
  const base: Record<InsightMetricKey, number> = {
    overall: 60,
    speed: 60,
    stamina: 60,
    acceleration: 60,
    temperament: 60,
    consistency: 60,
    conformation: 60,
    potential: 70,
    age: 4,
    fame: 20,
    form: 0,
    value: 100000,
    earnings: 0,
    starts: 5,
    wins: 1,
    winRate: 20,
    distanceAptitude: 1600,
  };
  return {
    id,
    name: `Horse ${id}`,
    gender: "colt",
    ownerLabel: "Rival",
    ownerId: "s1",
    scouted: false,
    metrics: { ...base, ...overrides },
    ...extra,
  };
}

describe("matchesScoutingThresholds", () => {
  it("passes everything with permissive defaults", () => {
    const t = { ...createDefaultScoutingThresholds(), freshness: "any" as const };
    expect(matchesScoutingThresholds(row("a"), t)).toBe(true);
  });

  it("applies min and max numeric bounds", () => {
    const t = { ...createDefaultScoutingThresholds(), freshness: "any" as const, minOverall: 70 };
    expect(matchesScoutingThresholds(row("a", { overall: 65 }), t)).toBe(false);
    expect(matchesScoutingThresholds(row("b", { overall: 75 }), t)).toBe(true);

    const capped = { ...t, minOverall: null, maxAge: 3 };
    expect(matchesScoutingThresholds(row("c", { age: 5 }), capped)).toBe(false);
    expect(matchesScoutingThresholds(row("d", { age: 2 }), capped)).toBe(true);
  });

  it("filters by gender bucket", () => {
    const t = {
      ...createDefaultScoutingThresholds(),
      freshness: "any" as const,
      gender: "female" as const,
    };
    expect(matchesScoutingThresholds(row("a", {}, { gender: "mare" }), t)).toBe(true);
    expect(matchesScoutingThresholds(row("b", {}, { gender: "gelding" }), t)).toBe(false);
  });

  it("honours report freshness", () => {
    const unscouted = createDefaultScoutingThresholds();
    expect(matchesScoutingThresholds(row("a", {}, { scouted: true }), unscouted)).toBe(false);
    expect(matchesScoutingThresholds(row("b"), unscouted)).toBe(true);

    const stale = { ...unscouted, freshness: "stale" as const, staleAfterDays: 30 };
    expect(
      matchesScoutingThresholds(row("c", {}, { scouted: true }), stale, { daysSinceScouted: 10 }),
    ).toBe(false);
    expect(
      matchesScoutingThresholds(row("d", {}, { scouted: true }), stale, { daysSinceScouted: 45 }),
    ).toBe(true);
  });

  it("rejects horses above the max fee", () => {
    const t = {
      ...createDefaultScoutingThresholds(),
      freshness: "any" as const,
      maxCostPerHorse: 500,
    };
    expect(matchesScoutingThresholds(row("a"), t, { daysSinceScouted: null, cost: 900 })).toBe(
      false,
    );
    expect(matchesScoutingThresholds(row("b"), t, { daysSinceScouted: null, cost: 400 })).toBe(
      true,
    );
  });

  it("describes active thresholds", () => {
    const t = { ...createDefaultScoutingThresholds(), minOverall: 80 };
    expect(describeScoutingThresholds(t)).toContain("Min overall rating 80");
    expect(describeScoutingThresholds(t)).toContain("Unscouted only");
  });
});

describe("planScoutingRun", () => {
  const candidates: ScoutingCandidate[] = [
    { row: row("a", { overall: 90 }), cost: 800, daysSinceScouted: null },
    { row: row("b", { overall: 80 }), cost: 400, daysSinceScouted: null },
    { row: row("c", { overall: 70 }), cost: 200, daysSinceScouted: null },
  ];

  it("orders by priority and respects the per-day cap", () => {
    const a = { ...createScoutingAssignment("1", "test", 1), maxPerDay: 2, dailyBudget: 100000 };
    expect(planScoutingRun(candidates, a, 100000).targets).toEqual(["a", "b"]);

    const cheapest = { ...a, priority: "cheapest" as const };
    expect(planScoutingRun(candidates, cheapest, 100000).targets).toEqual(["c", "b"]);
  });

  it("stops at the daily budget", () => {
    const a = { ...createScoutingAssignment("1", "test", 1), maxPerDay: 5, dailyBudget: 1000 };
    const plan = planScoutingRun(candidates, a, 100000);
    expect(plan.estimatedCost).toBeLessThanOrEqual(1000);
    // fills with the next affordable candidate once the leader is booked
    expect(plan.targets).toEqual(["a", "c"]);
    expect(plan.skippedForBudget).toBe(1);
  });

  it("never spends more than available cash", () => {
    const a = { ...createScoutingAssignment("1", "test", 1), maxPerDay: 5, dailyBudget: 100000 };
    const plan = planScoutingRun(candidates, a, 300);
    expect(plan.targets).toEqual(["c"]);
  });

  it("only targets horses matching thresholds", () => {
    const a = createScoutingAssignment("1", "test", 1);
    a.thresholds.minOverall = 85;
    a.dailyBudget = 100000;
    const plan = planScoutingRun(candidates, a, 100000);
    expect(plan.matched).toBe(1);
    expect(plan.targets).toEqual(["a"]);
  });
});

describe("lastScoutDayByHorse", () => {
  it("returns an empty map for no reports", async () => {
    const { lastScoutDayByHorse } = await import("@/core/npc/scoutingThresholds");
    expect(lastScoutDayByHorse([]).size).toBe(0);
  });

  it("keeps the latest report day per horse", async () => {
    const { lastScoutDayByHorse } = await import("@/core/npc/scoutingThresholds");
    const reports = [
      { horseId: "h1", day: 5 } as any,
      { horseId: "h1", day: 20 } as any,
      { horseId: "h1", day: 10 } as any,
      { horseId: "h2", day: 15 } as any,
    ];
    const map = lastScoutDayByHorse(reports);
    expect(map.get("h1")).toBe(20);
    expect(map.get("h2")).toBe(15);
  });
});
