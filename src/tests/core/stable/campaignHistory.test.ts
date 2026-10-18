import { describe, it, expect } from "vitest";
import { buildCampaignHistory } from "@/domains/stable/simulation/campaignHistory";
import type { Horse } from "@/domains/horse/simulation/types";
import type { TrackLedgerEntry } from "@/domains/history/simulation/trackLedger";
import type { StrategyJournalEntry } from "@/domains/tactics/simulation/strategyJournal";

const horse = {
  id: "h1",
  name: "Ace",
  ownership: { type: "player" },
  raceHistory: [
    { raceId: "r0", raceName: "Old", position: 1, day: 2, grade: "G1", purseEarned: 9 },
    { raceId: "r1", raceName: "A", position: 1, day: 10, grade: "G1", purseEarned: 1000 },
    { raceId: "r2", raceName: "B", position: 4, day: 12, purseEarned: 0 },
    { raceId: "r3", raceName: "C", position: 1, day: 15, grade: "G1", purseEarned: 500 },
  ],
} as unknown as Horse;
const ledger = [
  { raceId: "r1", prestigeDeltas: [{ stableId: "__player__", delta: 12, isPlayer: true }] },
  { raceId: "r2", prestigeDeltas: [{ stableId: "__player__", delta: -1, isPlayer: true }] },
] as unknown as TrackLedgerEntry[];

describe("buildCampaignHistory", () => {
  it("tracks prize, prestige and goal wins from the start day", () => {
    const rows = buildCampaignHistory({ startDay: 5, classGoals: { G1: 1 } }, [horse], ledger);
    expect(rows.map((r) => r.raceId)).toEqual(["r1", "r2", "r3"]);
    expect(rows[2].cumulativePrize).toBe(1500);
    expect(rows[1].cumulativePrestige).toBe(11);
    expect(rows[2].prestige).toBeNull();
    expect(rows[0].countedForGoal).toBe(true);
    expect(rows[2].countedForGoal).toBe(false);
    expect(rows[2].classWinsAfter).toBe(2);
  });

  describe("horse value", () => {
    const prices = {
      h1: [
        { day: 9, price: 10000 },
        { day: 10, price: 11200 },
        { day: 12, price: 11000 },
      ],
    };

    it("exposes the horse's end-of-day value and delta vs its previous snapshot", () => {
      const rows = buildCampaignHistory({ startDay: 5, classGoals: {} }, [horse], ledger, [prices]);
      expect(rows[0].value).toBe(11200);
      expect(rows[0].valueDelta).toBe(1200); // vs day-9 snapshot
      expect(rows[1].value).toBe(11000);
      expect(rows[1].valueDelta).toBe(-200); // vs day-10 snapshot
      expect(rows[2].value).toBeNull(); // no day-15 snapshot
      expect(rows[2].valueDelta).toBeNull();
    });

    it("returns nulls when no price sources are provided", () => {
      const rows = buildCampaignHistory({ startDay: 5, classGoals: {} }, [horse], ledger);
      expect(rows.every((r) => r.value === null && r.valueDelta === null)).toBe(true);
    });

    it("looks up each runner's own price history for same-day races", () => {
      const other = {
        id: "h2",
        name: "Bolt",
        ownership: { type: "player" },
        raceHistory: [{ raceId: "r1", raceName: "A", position: 3, day: 10, purseEarned: 200 }],
      } as unknown as Horse;
      const rows = buildCampaignHistory(
        { startDay: 5, classGoals: {} },
        [horse, other],
        [],
        [
          prices,
          {
            h2: [
              { day: 8, price: 5000 },
              { day: 10, price: 5400 },
            ],
          },
        ],
      );
      const r1 = rows.filter((r) => r.day === 10);
      expect(r1.find((r) => r.horseId === "h1")!.value).toBe(11200);
      expect(r1.find((r) => r.horseId === "h2")!.value).toBe(5400);
      expect(r1.find((r) => r.horseId === "h2")!.valueDelta).toBe(400);
    });

    it("fills missing days from later sources", () => {
      const sparse = { h1: [{ day: 10, price: 11200 }] };
      const fallback = {
        h1: [
          { day: 9, price: 9900 },
          { day: 12, price: 11000 },
        ],
      };
      const rows = buildCampaignHistory(
        { startDay: 5, classGoals: {} },
        [horse],
        [],
        [sparse, fallback],
      );
      expect(rows[0].value).toBe(11200);
      expect(rows[0].valueDelta).toBe(1300); // vs day-9 from the second source
      expect(rows[1].value).toBe(11000); // day-12 from the second source
    });
  });

  describe("netDelta", () => {
    const prices = {
      h1: [
        { day: 9, price: 10000 },
        { day: 10, price: 11200 },
      ],
    };

    it("combines prize money and value delta into one net-worth impact", () => {
      const rows = buildCampaignHistory({ startDay: 5, classGoals: {} }, [horse], [], [prices]);
      // r1: prize 1000 + (11200 - 10000) = 2200
      expect(rows[0].netDelta).toBe(2200);
    });

    it("is null when the value snapshot is missing", () => {
      const rows = buildCampaignHistory({ startDay: 5, classGoals: {} }, [horse], []);
      expect(rows.every((r) => r.netDelta === null)).toBe(true);
    });
  });

  describe("journal plan linkage", () => {
    const journal = [
      {
        id: "j1",
        createdDay: 8,
        horseId: "h1",
        horseName: "Ace",
        raceId: "r1",
        raceName: "A",
        raceDay: 10,
        plan: "Sit off the pace",
      },
    ] as unknown as StrategyJournalEntry[];

    it("links a campaign row to its journal plan and outcome", () => {
      const rows = buildCampaignHistory(
        { startDay: 5, classGoals: {} },
        [horse],
        [],
        undefined,
        journal,
        20,
      );
      expect(rows[0].plan?.text).toBe("Sit off the pace");
      expect(rows[0].plan?.outcome).toMatchObject({ status: "run", position: 1 });
      // r2 has no journal entry
      expect(rows[1].plan).toBeUndefined();
    });

    it("leaves plan undefined when no journal is provided", () => {
      const rows = buildCampaignHistory({ startDay: 5, classGoals: {} }, [horse], []);
      expect(rows.every((r) => r.plan === undefined)).toBe(true);
    });
  });
});
