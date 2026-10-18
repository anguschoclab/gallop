import { describe, expect, it } from "vitest";
import {
  compareRankingsForDay,
  rankingsComparisonDays,
} from "@/domains/market/simulation/rankingsComparison";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { asHorseId } from "@/shared/types/branded";

describe("daily rankings comparison", () => {
  const mine = createTestHorse({ id: asHorseId("mine"), ownership: { type: "player" } });
  const leader = createTestHorse({ id: asHorseId("leader"), ownership: { type: "unowned" } });
  const history = {
    mine: [{ day: 10, rank: 8, points: 20, reputation: 30, price: 100000 }],
    leader: [
      { day: 10, rank: 1, points: 80, reputation: 70, price: 400000 },
      { day: 11, rank: 2, points: 79, reputation: 71, price: 410000 },
    ],
  };
  it("compares all four metrics against the same day's top horse", () => {
    const result = compareRankingsForDay(history, [mine, leader], 10);
    expect(result.players).toHaveLength(1);
    expect(result.players[0].gap).toEqual({
      rank: 7,
      points: -60,
      reputation: -40,
      price: -300000,
    });
    expect(result.leaders[0].horseId).toBe("leader");
  });
  it("does not replace a missing historical record with another day's values", () => {
    const result = compareRankingsForDay(history, [mine, leader], 11);
    expect(result.players[0].snapshot).toBeNull();
    expect(result.players[0].gap).toBeNull();
    expect(rankingsComparisonDays(history)).toEqual([11, 10]);
  });
});
