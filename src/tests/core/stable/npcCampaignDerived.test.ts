import { describe, it, expect } from "vitest";
import { compareWithPlayer, deriveNpcCampaignProgress } from "@/domains/stable/simulation/npcCampaignDerived";
import type { GoalProgress } from "@/domains/stable/simulation/stableGoals";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";

const run = (
  day: number,
  position: number,
  grade?: string,
  purseEarned = 0,
  raceClass?: string,
) => ({
  raceId: `r${day}-${position}`,
  raceName: "Test Race",
  position,
  day,
  grade,
  raceClass,
  purseEarned,
});

describe("deriveNpcCampaignProgress", () => {
  it("computes netWorth as stable cash plus roster market value", () => {
    const stable = createTestStable({ cash: 50_000 });
    const horses = [createTestHorse({ id: "h1" }), createTestHorse({ id: "h2" })];
    const p = deriveNpcCampaignProgress(stable, horses);
    const expected =
      50_000 + horseMarketValue(horses[0], horses) + horseMarketValue(horses[1], horses);
    expect(p.netWorth).toBe(expected);
    expect(p.cash).toBe(50_000);
  });

  it("counts class wins since the comparison startDay only", () => {
    const stable = createTestStable();
    const h = createTestHorse({
      raceHistory: [
        run(5, 1, "G1", 100_000), // before startDay — ignored
        run(10, 1, "G1", 200_000),
        run(12, 2, "G2", 20_000),
        run(15, 1, "G3", 30_000),
        run(18, 1, undefined, 10_000, "Stakes"),
        run(20, 4, "Maiden"),
      ],
    });
    const p = deriveNpcCampaignProgress(stable, [h], 8);
    expect(p.classWins).toEqual({ G1: 1, G2: 0, G3: 1, Stakes: 1 });
    expect(p.totalStarts).toBe(5);
    expect(p.wins).toBe(3);
    expect(p.totalEarnings).toBe(260_000);
  });

  it("handles a stable with no horses", () => {
    const p = deriveNpcCampaignProgress(createTestStable({ cash: 7_000 }), []);
    expect(p.netWorth).toBe(7_000);
    expect(p.totalStarts).toBe(0);
    expect(p.avgFinish).toBe(0);
    expect(p.totalEarnings).toBe(0);
  });

  it("computes avgFinish across the window", () => {
    const h = createTestHorse({ raceHistory: [run(1, 2), run(2, 6)] });
    const p = deriveNpcCampaignProgress(createTestStable(), [h], 0);
    expect(p.avgFinish).toBeCloseTo(4);
  });
});

describe("compareWithPlayer", () => {
  const npc = {
    cash: 40_000,
    netWorth: 90_000,
    classWins: { G1: 1, G2: 2, G3: 0, Stakes: 3 },
    totalStarts: 10,
    wins: 6,
    totalEarnings: 120_000,
    avgFinish: 3.5,
  };
  const player: GoalProgress = {
    netWorth: 100_000,
    netWorthGap: 0,
    classWins: { G1: 2, G2: 0, G3: 1, Stakes: 0 },
    classRemaining: { G1: 0, G2: 0, G3: 0, Stakes: 0 },
    currentCash: 60_000,
    cashGap: 0,
    totalEarnings: 200_000,
    earningsGap: 0,
  };

  it("returns a row per compared metric with player-minus-rival deltas", () => {
    const rows = compareWithPlayer(npc, player);
    const byLabel = new Map(rows.map((r) => [r.label, r]));
    expect(byLabel.get("Net worth")).toMatchObject({
      rival: 90_000,
      player: 100_000,
      delta: 10_000,
    });
    expect(byLabel.get("Cash on hand")).toMatchObject({
      rival: 40_000,
      player: 60_000,
      delta: 20_000,
    });
    expect(byLabel.get("Prize earnings")).toMatchObject({
      rival: 120_000,
      player: 200_000,
      delta: 80_000,
    });
    expect(byLabel.get("G1 wins")).toMatchObject({ rival: 1, player: 2, delta: 1 });
    expect(byLabel.get("Stakes wins")).toMatchObject({ rival: 3, player: 0, delta: -3 });
  });
});
