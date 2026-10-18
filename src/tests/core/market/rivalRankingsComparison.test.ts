import { describe, expect, it } from "vitest";
import { rivalRankingsForDay } from "@/domains/market/simulation/rivalRankingsComparison";
import { PLAYER_OWNER_ID } from "@/domains/horse/simulation/ownership";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { asHorseId, asNpcStableId } from "@/shared/types/branded";
import type { RankingsHistory } from "@/domains/market/simulation/rankingsHistory";
import type { StableRankingsHistory } from "@/domains/stable/simulation/stableRankings";

const rival = createTestHorse({
  id: asHorseId("rival-1"),
  name: "Rival One",
  ownership: { type: "npc", stableId: asNpcStableId("stable-a") },
});
const rival2 = createTestHorse({
  id: asHorseId("rival-2"),
  name: "Rival Two",
  ownership: { type: "npc", stableId: asNpcStableId("stable-b") },
});
const mine = createTestHorse({
  id: asHorseId("mine-1"),
  name: "My Horse",
  ownership: { type: "player" },
});
const horses = { "rival-1": rival, "rival-2": rival2, "mine-1": mine };

const rankingsHistory: RankingsHistory = {
  "rival-1": [{ day: 10, rank: 4, points: 40, reputation: 50, price: 200000 }],
  "mine-1": [{ day: 10, rank: 9, points: 10, reputation: 20, price: 90000 }],
};

const stableRankingsHistory: StableRankingsHistory = {
  "stable-a": [
    {
      day: 10,
      rank: 1,
      points: 80,
      earnedPoints: 30,
      earnings: 400000,
      reputation: 90,
      price: 1500000,
    },
  ],
  "stable-b": [
    {
      day: 10,
      rank: 2,
      points: 60,
      earnedPoints: 20,
      earnings: 250000,
      reputation: 80,
      price: 900000,
    },
  ],
  [PLAYER_OWNER_ID]: [
    {
      day: 10,
      rank: 3,
      points: 20,
      earnedPoints: 8,
      earnings: 60000,
      reputation: 40,
      price: 250000,
    },
  ],
};

describe("rivalRankingsForDay", () => {
  it("compares each rival's stable to my stable when the baseline is the stable", () => {
    const cols = rivalRankingsForDay({
      rivalIds: ["rival-1"],
      horses,
      stableRankingsHistory,
      day: 10,
      baseline: { type: "stable" },
    });
    expect(cols).toHaveLength(1);
    expect(cols[0].values).toEqual({ rank: 1, points: 80, price: 1500000 });
    expect(cols[0].baseline).toEqual({ rank: 3, points: 20, price: 250000 });
    // rival stable is 2 places ahead, 60 points and $1.25M up on the player
    expect(cols[0].gap).toEqual({ rank: -2, points: 60, price: 1250000 });
  });

  it("compares horse to horse when the baseline is one of my horses", () => {
    const cols = rivalRankingsForDay({
      rivalIds: ["rival-1"],
      horses,
      rankingsHistory,
      day: 10,
      baseline: { type: "horse", horseId: "mine-1" },
    });
    expect(cols[0].values).toEqual({ rank: 4, points: 40, price: 200000 });
    expect(cols[0].baseline).toEqual({ rank: 9, points: 10, price: 90000 });
    expect(cols[0].gap).toEqual({ rank: -5, points: 30, price: 110000 });
  });

  it("never borrows values from another day", () => {
    const cols = rivalRankingsForDay({
      rivalIds: ["rival-1"],
      horses,
      rankingsHistory,
      day: 11,
      baseline: { type: "horse", horseId: "mine-1" },
    });
    expect(cols[0].values).toBeNull();
    expect(cols[0].gap).toBeNull();
  });

  it("still reports the rival's values when the baseline has no record that day", () => {
    const cols = rivalRankingsForDay({
      rivalIds: ["rival-1"],
      horses,
      stableRankingsHistory: {
        "stable-a": stableRankingsHistory["stable-a"],
        // no player entry → baseline has no record
      },
      day: 10,
      baseline: { type: "stable" },
    });
    expect(cols[0].baseline).toBeNull();
    expect(cols[0].gap).toBeNull();
    expect(cols[0].values).toEqual({ rank: 1, points: 80, price: 1500000 });
  });

  it("treats an unranked side's rank gap as null but still computes point/price gaps", () => {
    const cols = rivalRankingsForDay({
      rivalIds: ["rival-1"],
      horses,
      rankingsHistory: {
        "rival-1": [{ day: 10, rank: null, points: 5, reputation: 3, price: 50000 }],
        "mine-1": [{ day: 10, rank: 9, points: 10, reputation: 20, price: 90000 }],
      },
      day: 10,
      baseline: { type: "horse", horseId: "mine-1" },
    });
    expect(cols[0].gap).toEqual({ rank: null, points: -5, price: -40000 });
  });

  it("returns null values for an unknown rival id and preserves input order", () => {
    const cols = rivalRankingsForDay({
      rivalIds: ["rival-2", "ghost", "rival-1"],
      horses,
      stableRankingsHistory,
      day: 10,
      baseline: { type: "stable" },
    });
    expect(cols.map((c) => c.rivalId)).toEqual(["rival-2", "ghost", "rival-1"]);
    expect(cols[0].values).toEqual({ rank: 2, points: 60, price: 900000 });
    expect(cols[1].values).toBeNull();
    expect(cols[2].values).toEqual({ rank: 1, points: 80, price: 1500000 });
  });
});
