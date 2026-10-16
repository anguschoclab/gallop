import { describe, it, expect } from "vitest";
import { buildCampaignHistory } from "@/core/stable/campaignHistory";
import type { Horse } from "@/core/horse/types";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";

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
});
