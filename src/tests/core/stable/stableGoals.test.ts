import { describe, it, expect } from "vitest";
import { goalRaceBonus, raceGoalClass, type StableGoals, type GoalProgress } from "@/core/stable/stableGoals";

const goals: StableGoals = { classGoals: { G1: 2 }, startDay: 0, weight: 1, targetNetWorth: 1_000_000 };
const progress: GoalProgress = {
  netWorth: 200_000, netWorthGap: 800_000,
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
