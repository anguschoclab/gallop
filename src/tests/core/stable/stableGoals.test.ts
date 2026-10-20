import { describe, it, expect } from "vitest";
import {
  autoAdjustGoals,
  goalProgress,
  goalRaceBonus,
  playerNetWorthBreakdown,
  raceGoalClass,
  type StableGoals,
  type GoalProgress,
} from "@/domains/stable/simulation/stableGoals";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";
import { makeUnowned } from "@/domains/horse/simulation/ownership";

const goals: StableGoals = {
  classGoals: { G1: 2 },
  startDay: 0,
  weight: 1,
  targetNetWorth: 1_000_000,
};
const progress: GoalProgress = {
  netWorth: 200_000,
  netWorthGap: 800_000,
  classWins: { G1: 0, G2: 0, G3: 0, Stakes: 0 },
  classRemaining: { G1: 2, G2: 0, G3: 0, Stakes: 0 },
  currentCash: 200_000,
  cashGap: 0,
  totalEarnings: 0,
  earningsGap: 0,
};

function baseProgress(overrides: Partial<GoalProgress> = {}): GoalProgress {
  return { ...progress, ...overrides };
}

describe("goalRaceBonus", () => {
  it("favours races that serve open class goals and rich purses", () => {
    const g1 = { graded: { grade: "G1" }, raceClass: "G1", purse: 500000 } as never;
    const maiden = { raceClass: "Maiden", purse: 10000 } as never;
    expect(raceGoalClass(g1)).toBe("G1");
    const a = goalRaceBonus(g1, goals, progress);
    const b = goalRaceBonus(maiden, goals, progress);
    expect(a.bonus).toBeGreaterThan(b.bonus);
    expect(a.reasons.length).toBe(2);
    expect(goalRaceBonus(g1, { ...goals, weight: 0 }, progress).bonus).toBe(0);
  });
});

describe("goalProgress — cash & earnings", () => {
  const run = (day: number, purseEarned: number, position = 2) => ({
    raceId: `r${day}`,
    raceName: "R",
    position,
    day,
    purseEarned,
  });

  it("computes totalEarnings from purseEarned since startDay", () => {
    const h = createTestHorse({
      raceHistory: [run(10, 1_000), run(20, 2_500), run(30, 500)],
    });
    const p = goalProgress({ classGoals: {}, startDay: 15, weight: 1 }, [h], 40_000);
    expect(p.totalEarnings).toBe(3_000);
  });

  it("ignores earnings from before startDay", () => {
    const h = createTestHorse({ raceHistory: [run(5, 9_999), run(50, 100)] });
    const p = goalProgress({ classGoals: {}, startDay: 10, weight: 1 }, [h], 0);
    expect(p.totalEarnings).toBe(100);
  });

  it("computes earningsGap as max(0, target - earned)", () => {
    const h = createTestHorse({ raceHistory: [run(10, 30_000)] });
    const g = { classGoals: {}, startDay: 0, weight: 1, targetEarnings: 100_000 };
    expect(goalProgress(g, [h], 0).earningsGap).toBe(70_000);
    const met = { ...g, targetEarnings: 10_000 };
    expect(goalProgress(met, [h], 0).earningsGap).toBe(0);
  });

  it("returns currentCash and cashGap", () => {
    const g = { classGoals: {}, startDay: 0, weight: 1, targetCash: 80_000 };
    const p = goalProgress(g, [], 50_000);
    expect(p.currentCash).toBe(50_000);
    expect(p.cashGap).toBe(30_000);
    expect(goalProgress(g, [], 200_000).cashGap).toBe(0);
  });

  it("sums earnings across multiple player horses only", () => {
    const mine = createTestHorse({ id: "a", raceHistory: [run(10, 1_000)] });
    const npc = createTestHorse({ id: "b", raceHistory: [run(10, 9_000)] });
    npc.ownership = { type: "npc", stableId: "npc1" as never };
    const p = goalProgress({ classGoals: {}, startDay: 0, weight: 1 }, [mine, npc], 0);
    expect(p.totalEarnings).toBe(1_000);
  });
});

describe("goalRaceBonus — cash target", () => {
  const cashGoals: StableGoals = {
    classGoals: {},
    startDay: 0,
    weight: 1,
    targetCash: 100_000,
  };
  const belowTarget = baseProgress({ currentCash: 20_000, cashGap: 80_000 });
  const rich = { raceClass: "Allowance", purse: 60_000 } as never;

  it("awards a purse-scaled bonus when cashGap > 0", () => {
    const res = goalRaceBonus(rich, cashGoals, belowTarget);
    expect(res.bonus).toBeGreaterThan(0);
    expect(res.reasons.some((r) => /cash/i.test(r))).toBe(true);
  });

  it("awards no cash bonus when cashGap === 0", () => {
    const res = goalRaceBonus(rich, cashGoals, baseProgress({ cashGap: 0 }));
    expect(res.bonus).toBe(0);
    expect(res.reasons).toHaveLength(0);
  });

  it("does not stack with the net-worth purse bonus", () => {
    const both = { ...cashGoals, targetNetWorth: 1_000_000 };
    const p = baseProgress({ cashGap: 80_000, netWorthGap: 800_000 });
    const res = goalRaceBonus(rich, both, p);
    expect(res.reasons.filter((r) => /cash/i.test(r))).toHaveLength(0);
    expect(res.reasons.some((r) => /net-worth/i.test(r))).toBe(true);
  });
});

describe("goalRaceBonus — earnings target", () => {
  const earnGoals: StableGoals = {
    classGoals: {},
    startDay: 0,
    weight: 1,
    targetEarnings: 500_000,
  };
  const rich = { raceClass: "Allowance", purse: 50_000 } as never;
  const poor = { raceClass: "Maiden", purse: 10_000 } as never;

  it("awards a bonus proportional to purse when earningsGap > 0", () => {
    const p = baseProgress({ totalEarnings: 100_000, earningsGap: 400_000 });
    const a = goalRaceBonus(rich, earnGoals, p);
    const b = goalRaceBonus(poor, earnGoals, p);
    expect(a.bonus).toBeGreaterThan(b.bonus);
    expect(b.bonus).toBeGreaterThan(0);
    expect(a.reasons.some((r) => /earnings/i.test(r))).toBe(true);
  });

  it("awards no earnings bonus when earningsGap === 0", () => {
    const p = baseProgress({ totalEarnings: 500_000, earningsGap: 0 });
    expect(goalRaceBonus(rich, earnGoals, p).bonus).toBe(0);
  });
});

describe("autoAdjustGoals", () => {
  const base: StableGoals = {
    classGoals: { G1: 2 },
    startDay: 0,
    weight: 1,
    autoAdjust: true,
    targetNetWorth: 100_000,
  };
  const prog = (wins: number, nw: number): GoalProgress =>
    baseProgress({
      netWorth: nw,
      classWins: { G1: wins, G2: 0, G3: 0, Stakes: 0 },
    });
  it("raises a met class goal by half (min 1)", () => {
    expect(autoAdjustGoals(base, prog(2, 0), 10).goals.classGoals.G1).toBe(3);
  });
  it("raises a reached net worth target to 125% rounded to 10k", () => {
    expect(autoAdjustGoals(base, prog(0, 120_000), 10).goals.targetNetWorth).toBe(150_000);
  });
  it("extends a missed deadline by 90 days", () => {
    expect(autoAdjustGoals({ ...base, targetDay: 5 }, prog(0, 50_000), 10).goals.targetDay).toBe(
      100,
    );
  });
  it("does nothing when auto-adjust is off", () => {
    expect(
      autoAdjustGoals({ ...base, autoAdjust: false }, prog(5, 1e6), 10).adjustments,
    ).toHaveLength(0);
  });

  it("raises a met cash target to 125% rounded to $5k", () => {
    const g = { ...base, targetNetWorth: undefined, targetCash: 50_000 };
    const p = baseProgress({ currentCash: 62_000, cashGap: 0 });
    const res = autoAdjustGoals(g, p, 10);
    expect(res.goals.targetCash).toBe(80_000); // 62_000 * 1.25 = 77_500 → 80_000
    expect(res.adjustments.some((a) => /cash/i.test(a.text))).toBe(true);
  });

  it("raises a met earnings target to 125% rounded to $10k", () => {
    const g = { ...base, targetNetWorth: undefined, targetEarnings: 100_000 };
    const p = baseProgress({ totalEarnings: 120_000, earningsGap: 0 });
    const res = autoAdjustGoals(g, p, 10);
    expect(res.goals.targetEarnings).toBe(150_000);
    expect(res.adjustments.some((a) => /earnings/i.test(a.text))).toBe(true);
  });

  it("leaves unmet or unset cash and earnings targets alone", () => {
    const g = { ...base, targetNetWorth: undefined, targetCash: 50_000, targetEarnings: 90_000 };
    const p = baseProgress({
      currentCash: 10_000,
      cashGap: 40_000,
      totalEarnings: 20_000,
      earningsGap: 70_000,
    });
    const res = autoAdjustGoals(g, p, 10);
    expect(res.goals.targetCash).toBe(50_000);
    expect(res.goals.targetEarnings).toBe(90_000);
  });
});

describe("campaign net worth includes horse values", () => {
  it("adds each owned horse's market value to cash, ignoring horses you don't own", () => {
    const mine = createTestHorse({ name: "Mine" });
    const other = createTestHorse({ name: "Other", ownership: makeUnowned() });
    const b = playerNetWorthBreakdown([mine, other], 50_000);
    expect(b.horses.map((h) => h.name)).toEqual(["Mine"]);
    expect(b.horseValue).toBe(horseMarketValue(mine));
    expect(b.horseValue).toBeGreaterThan(0);
    expect(b.total).toBe(Math.round(50_000 + horseMarketValue(mine)));
    expect(goalProgress({ classGoals: {}, startDay: 0, weight: 1 }, [mine, other], 50_000).netWorth).toBe(b.total);
  });
});
