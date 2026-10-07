import { describe, it, expect } from "vitest";
import { periodStats, pctChange } from "@/core/stable/periodComparison";
import type { PlayerRaceWinRecord } from "@/core/stable/raceWins";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";

const win = (day: number, payout: number, grade?: string) =>
  ({
    id: `w${day}`,
    day,
    raceId: `r${day}`,
    raceName: "",
    horseId: "h",
    horseName: "",
    payout,
    grade,
  }) as PlayerRaceWinRecord;
const entry = (day: number, delta: number, grade?: "G1") =>
  ({
    day,
    grade,
    winnerIsPlayer: false,
    prestigeDeltas: [{ stableId: "__player__", stableName: "", delta, isPlayer: true }],
  }) as unknown as TrackLedgerEntry;

describe("periodStats", () => {
  it("splits wins, earnings, class results and prestige by range", () => {
    const wins = [win(5, 1000), win(15, 5000, "G1"), win(18, 2000)];
    const ledger = [entry(5, 2), entry(15, 12, "G1"), entry(16, -1, "G1")];
    const a = periodStats(wins, ledger, { from: 0, to: 9 });
    const b = periodStats(wins, ledger, { from: 10, to: 20 });
    expect(a).toMatchObject({ wins: 1, earnings: 1000, starts: 1, prestige: 2 });
    expect(b).toMatchObject({ wins: 2, earnings: 7000, gradedWins: 1, starts: 2, prestige: 11 });
    expect(b.byClass.G1).toEqual({ starts: 2, wins: 1, prestige: 11 });
    expect(pctChange(1000, 7000)).toBe(600);
    expect(pctChange(0, 5)).toBeNull();
  });
});
