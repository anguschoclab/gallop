import { describe, it, expect } from "vitest";
import {
  periodRaces,
  periodStats,
  pctChange,
  filterPeriodCampaignRaces,
} from "@/core/stable/periodComparison";
import type { PlayerRaceWinRecord } from "@/core/stable/raceWins";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import type { Transaction } from "@/game/types";

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

const start = (
  day: number,
  position: number,
  purseEarned = 0,
  extra: Record<string, unknown> = {},
) => ({
  raceId: `r${day}-${position}`,
  raceName: `Race ${day}`,
  position,
  day,
  purseEarned,
  ...extra,
});

describe("periodRaces", () => {
  it("filters campaign start and goal wins and aligns totals with contributing races", () => {
    const h = createTestHorse({
      id: "h",
      raceHistory: [
        start(5, 1, 1000, { grade: "G1" }),
        start(15, 1, 5000, { grade: "G1" }),
        start(16, 2, 2000, { grade: "G1" }),
        start(18, 1, 3000, { grade: "G2" }),
      ],
    });
    const range = { from: 0, to: 20 };
    const races = periodRaces([h], range);
    const goals = { startDay: 10, classGoals: { G1: 2 } };
    expect(filterPeriodCampaignRaces(races, "campaign", goals).map((r) => r.day)).toEqual([
      15, 18, 16,
    ]);
    const filtered = filterPeriodCampaignRaces(races, "goal-wins", goals);
    expect(filtered.map((r) => r.day)).toEqual([15]);
    const wins = [win(5, 1000, "G1"), win(15, 5000, "G1"), win(18, 3000, "G2")].map((w) => ({
      ...w,
      raceId: `r${w.day}-1`,
    }));
    const ledger = [5, 15, 16].map((day) => ({
      ...entry(day, 12, "G1"),
      raceId: `r${day}-${day === 16 ? 2 : 1}`,
    }));
    expect(periodStats(wins, ledger, range, filtered)).toMatchObject({
      wins: 1,
      earnings: 5000,
      starts: 1,
      prestige: 12,
      gradedWins: 1,
    });
    expect(filterPeriodCampaignRaces(races, "campaign", undefined)).toEqual([]);
    expect(filterPeriodCampaignRaces(races, "all", goals)).toBe(races);
  });
  it("returns every player start in range, sorted prize-desc then day-desc", () => {
    const h = createTestHorse({
      id: "h1",
      name: "Ace",
      raceHistory: [start(5, 1, 9000), start(12, 3, 2000), start(15, 8, 0), start(99, 1, 5000)],
    });
    const rows = periodRaces([h], { from: 10, to: 20 });
    expect(rows.map((r) => r.day)).toEqual([12, 15]);
    expect(rows[0]).toMatchObject({ horseId: "h1", horseName: "Ace", position: 3, prize: 2000 });
    expect(rows[1].prize).toBe(0);
  });

  it("orders by prize descending, then day descending", () => {
    const h = createTestHorse({
      id: "h1",
      raceHistory: [start(10, 4, 500), start(11, 1, 9000), start(12, 2, 3000)],
    });
    const rows = periodRaces([h], { from: 0, to: 20 });
    expect(rows.map((r) => r.prize)).toEqual([9000, 3000, 500]);
  });

  it("excludes entries stamped with an NPC stable even when the horse is now player-owned", () => {
    const h = createTestHorse({
      id: "h1",
      raceHistory: [
        start(10, 1, 9000), // player-era win
        start(11, 2, 3000, { stableId: "npc-9" }), // raced for an NPC before purchase
      ],
    });
    const rows = periodRaces([h], { from: 0, to: 20 });
    expect(rows).toHaveLength(1);
    expect(rows[0].day).toBe(10);
  });

  it("includes player-era entries of a horse now owned by an NPC (via prize transaction)", () => {
    const sold = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned(asNpcStableId("npc-1")),
      raceHistory: [start(10, 1, 9000)],
    });
    const tx = {
      subcategory: "prize_money",
      amount: 9000,
      raceId: "r10-1",
      horseId: "h1",
    } as unknown as Transaction;
    expect(periodRaces([sold], { from: 0, to: 20 }, [tx])).toHaveLength(1);
    expect(periodRaces([sold], { from: 0, to: 20 })).toHaveLength(0);
  });

  it("falls back to the prize transaction amount when purseEarned is missing", () => {
    const h = createTestHorse({
      id: "h1",
      raceHistory: [start(10, 1, 0)],
    });
    const tx = {
      subcategory: "prize_money",
      amount: 4200,
      raceId: "r10-1",
      horseId: "h1",
    } as unknown as Transaction;
    const rows = periodRaces([h], { from: 0, to: 20 }, [tx]);
    expect(rows[0].prize).toBe(4200);
  });

  it("handles reversed ranges and empty inputs", () => {
    const h = createTestHorse({ id: "h1", raceHistory: [start(10, 1, 100)] });
    expect(periodRaces([h], { from: 20, to: 5 })).toHaveLength(1);
    expect(periodRaces([], { from: 0, to: 99 })).toEqual([]);
  });
});
