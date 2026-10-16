import { describe, it, expect } from "vitest";
import {
  goalRaceBonus,
  raceGoalClass,
  type StableGoals,
  type GoalProgress,
} from "@/core/stable/stableGoals";

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
};

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

import { autoAdjustGoals } from "@/core/stable/stableGoals";
describe("autoAdjustGoals", () => {
  const base: StableGoals = { classGoals: { G1: 2 }, startDay: 0, weight: 1, autoAdjust: true, targetNetWorth: 100_000 };
  const prog = (wins: number, nw: number): GoalProgress => ({
    netWorth: nw, netWorthGap: 0,
    classWins: { G1: wins, G2: 0, G3: 0, Stakes: 0 },
    classRemaining: { G1: 0, G2: 0, G3: 0, Stakes: 0 },
  });
  it("raises a met class goal by half (min 1)", () => {
    expect(autoAdjustGoals(base, prog(2, 0), 10).goals.classGoals.G1).toBe(3);
  });
  it("raises a reached net worth target to 125% rounded to 10k", () => {
    expect(autoAdjustGoals(base, prog(0, 120_000), 10).goals.targetNetWorth).toBe(150_000);
  });
  it("extends a missed deadline by 90 days", () => {
    expect(autoAdjustGoals({ ...base, targetDay: 5 }, prog(0, 50_000), 10).goals.targetDay).toBe(100);
  });
  it("does nothing when auto-adjust is off", () => {
    expect(autoAdjustGoals({ ...base, autoAdjust: false }, prog(5, 1e6), 10).adjustments).toHaveLength(0);
  });
});
