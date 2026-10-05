import { describe, it, expect } from "vitest";
import { computeBlueHenLeaderboard } from "@/core/breeding/blueHenLeaderboard";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";

describe("computeBlueHenLeaderboard", () => {
  it("ignores mares with no racing age foals", () => {
    const mare = createTestHorse({ id: "mare1", gender: "mare" });
    const foal = createTestHorse({
      id: "foal1",
      age: 1,
      pedigree: { damId: "mare1", name: "mare1", generation: 1 },
    });

    const leaderboard = computeBlueHenLeaderboard([mare, foal], 100);
    expect(leaderboard.rankings).toHaveLength(0);
  });

  it("calculates blue hen score correctly for racing foals", () => {
    const mare = createTestHorse({ id: "mare1", name: "Super Dam", gender: "mare" });
    const foal1 = createTestHorse({
      id: "foal1",
      age: 3,
      lifetimeEarnings: 500_000,
      pedigree: { damId: "mare1", name: "mare1", generation: 1 },
      raceHistory: [
        {
          grade: "G1",
          position: 1,
          purse: 500000,
          raceId: "r1",
          raceName: "R1",
          day: 1,
          fieldSize: 8,
          distance: 1000,
          surface: "Dirt",
        },
      ],
    });
    const foal2 = createTestHorse({
      id: "foal2",
      age: 4,
      lifetimeEarnings: 200_000,
      pedigree: { damId: "mare1", name: "mare1", generation: 1 },
      raceHistory: [
        {
          grade: "G3",
          position: 1,
          purse: 200000,
          raceId: "r2",
          raceName: "R2",
          day: 1,
          fieldSize: 8,
          distance: 1000,
          surface: "Dirt",
        },
      ],
    });

    const leaderboard = computeBlueHenLeaderboard([mare, foal1, foal2], 100);

    expect(leaderboard.rankings).toHaveLength(1);
    expect(leaderboard.rankings[0].mareName).toBe("Super Dam");
    const metrics = leaderboard.rankings[0].metrics;
    expect(metrics.stakesWinnersProduced).toBe(2);
    expect(metrics.g1WinnersProduced).toBe(1);
    expect(metrics.totalFoalEarnings).toBe(700_000);
    expect(metrics.avgFoalEarnings).toBe(350_000);
    // Score calculation:
    // (min(700000/500000, 100) * 0.35) + (2 * 10 * 0.35) + (1 * 20 * 0.3)
    // (1.4 * 0.35) + 7 + 6 = 0.49 + 7 + 6 = 13.49 -> 13
    expect(metrics.blueHenScore).toBe(13);
  });

  it("uses persisted blueHenStatus if available", () => {
    const mare = createTestHorse({ id: "mare1", name: "Super Dam", gender: "mare" });
    mare.blueHenStatus = {
      isBlueHen: true,
      stakesWinnersProduced: 1,
      group1WinnersProduced: 0,
      blueHenScore: 50,
      foalsProduced: 3,
    };

    const foal1 = createTestHorse({
      id: "foal1",
      age: 3,
      pedigree: { damId: "mare1", name: "mare1", generation: 1 },
    });

    const leaderboard = computeBlueHenLeaderboard([mare, foal1], 100);

    expect(leaderboard.rankings).toHaveLength(1);
    expect(leaderboard.rankings[0].metrics.isBlueHen).toBe(true);
  });

  it("determines blueHen based on threshold if not persisted", () => {
    const mare = createTestHorse({ id: "mare1", name: "Super Dam", gender: "mare" });

    const f1 = createTestHorse({
      age: 3,
      pedigree: { damId: "mare1", name: "mare1", generation: 1 },
      raceHistory: [
        {
          grade: "G1",
          position: 1,
          purse: 5,
          raceId: "1",
          raceName: "1",
          day: 1,
          fieldSize: 8,
          distance: 1000,
          surface: "Dirt",
        },
      ],
    });
    const f2 = createTestHorse({
      age: 3,
      pedigree: { damId: "mare1", name: "mare1", generation: 1 },
      raceHistory: [
        {
          grade: "G1",
          position: 1,
          purse: 5,
          raceId: "2",
          raceName: "2",
          day: 1,
          fieldSize: 8,
          distance: 1000,
          surface: "Dirt",
        },
      ],
    });
    const f3 = createTestHorse({
      age: 3,
      pedigree: { damId: "mare1", name: "mare1", generation: 1 },
    });

    const leaderboard = computeBlueHenLeaderboard([mare, f1, f2, f3], 100);

    expect(leaderboard.rankings).toHaveLength(1);
    expect(leaderboard.rankings[0].metrics.isBlueHen).toBe(true); // 2 stakes winners, 3 racing foals
  });
});
