import { describe, it, expect } from "vitest";
import { buildDailyPlanTimeline } from "@/core/tactics/dailyPlanView";
import type { CampaignHistoryRow } from "@/core/stable/campaignHistory";

const row = (overrides: Partial<CampaignHistoryRow> = {}): CampaignHistoryRow => ({
  raceId: "r1",
  day: 10,
  horseId: "h1",
  horseName: "Ace",
  raceName: "Derby",
  goalClass: null,
  position: 1,
  fieldSize: 10,
  prize: 10_000,
  cumulativePrize: 10_000,
  value: null,
  valueDelta: null,
  netDelta: null,
  prestige: 5,
  cumulativePrestige: 5,
  countedForGoal: false,
  classWinsAfter: 0,
  ...overrides,
});

const planned = (position: number, fieldSize = 10): CampaignHistoryRow["plan"] => ({
  text: "Stalk the pace",
  outcome: { status: "run", position, fieldSize, earned: 5_000 },
});

describe("buildDailyPlanTimeline", () => {
  it("groups rows into one DailyPlanRow per day, newest first", () => {
    const rows = [
      row({ raceId: "a", day: 5 }),
      row({ raceId: "b", day: 9, horseId: "h2", horseName: "Bolt" }),
      row({ raceId: "c", day: 9, horseId: "h3", horseName: "Comet", position: 4, prize: 0 }),
    ];
    const days = buildDailyPlanTimeline(rows);
    expect(days.map((d) => d.day)).toEqual([9, 5]);
    expect(days[0].races).toHaveLength(2);
    expect(days[0].totalPrize).toBe(10_000);
  });

  it("scores a day from journaled plan outcomes", () => {
    const rows = [
      row({ raceId: "a", day: 10, plan: planned(1), position: 1 }),
      row({ raceId: "b", day: 10, horseId: "h2", plan: planned(3), position: 3 }),
    ];
    const [day] = buildDailyPlanTimeline(rows);
    expect(day.score).not.toBeNull();
    // 2 runs: winRate 0.5, placeRate 1.0, quality ≈ 0.944 → ~72
    expect(day.score!).toBeGreaterThan(50);
  });

  it("returns null score when no journaled outcome exists for the day", () => {
    const [day] = buildDailyPlanTimeline([row({ day: 4 })]);
    expect(day.score).toBeNull();
  });

  it("collects the classes whose wins counted toward a goal", () => {
    const rows = [
      row({ day: 3, goalClass: "G1", countedForGoal: true, position: 1 }),
      row({
        raceId: "r2",
        day: 3,
        horseId: "h2",
        goalClass: "G2",
        countedForGoal: false,
        position: 1,
      }),
      row({
        raceId: "r3",
        day: 3,
        horseId: "h3",
        goalClass: "G3",
        countedForGoal: true,
        position: 1,
      }),
    ];
    const [day] = buildDailyPlanTimeline(rows);
    expect(day.goalsServed).toEqual(["G1", "G3"]);
  });

  it("carries plan text onto the race entry", () => {
    const rows = [row({ day: 7, plan: planned(2) })];
    const [day] = buildDailyPlanTimeline(rows);
    expect(day.races[0].planText).toBe("Stalk the pace");
  });

  it("sums prestige across the day without double-counting shared races", () => {
    const rows = [
      row({ day: 6, prestige: 4 }),
      // Same raceId as the first row: both horses share one ledger prestige delta.
      row({ raceId: "r1", day: 6, horseId: "h2", position: 5, prize: 0, prestige: 4 }),
      row({ raceId: "r2", day: 6, horseId: "h3", prestige: -2 }),
    ];
    const [day] = buildDailyPlanTimeline(rows);
    expect(day.totalPrestige).toBe(2);
  });

  it("returns an empty array for no rows", () => {
    expect(buildDailyPlanTimeline([])).toEqual([]);
  });
});
