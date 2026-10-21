import { describe, expect, it } from "vitest";
import {
  RANKINGS_HISTORY_MAX_ENTRIES,
  recordRankingsHistory,
} from "@/domains/market/simulation/rankingsHistory";
import { compareRankingsForDay } from "@/domains/market/simulation/rankingsComparison";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { asHorseId } from "@/shared/types/branded";
import type { Horse } from "@/domains/horse/simulation/types";

const win = (day: number, grade?: string) => ({
  raceId: `r${day}`,
  raceName: `Race ${day}`,
  position: 1,
  day,
  grade,
});

function makeHorse(id: string, wins: number, day: number): Horse {
  return createTestHorse({
    id: asHorseId(id),
    ownership: { type: "unowned" },
    raceHistory: Array.from({ length: wins }, (_, i) => win(day - i, "G1")),
  });
}

describe("recordRankingsHistory", () => {
  it("prices a rival horse whose stats are still hidden from its real stats, not $0", () => {
    const real = makeHorse("hidden", 2, 10);
    const hidden = {
      ...real,
      phenotypeResolved: false,
      stats: Object.fromEntries(Object.keys(real.stats).map((k) => [k, 0])),
    } as unknown as Horse;
    const out = recordRankingsHistory(undefined, [hidden], 10);
    expect(out.hidden[0].price).toBeGreaterThan(0);
  });

  it("records rank, points, reputation and price for ranked horses", () => {
    const horses = [makeHorse("a", 2, 10), makeHorse("b", 1, 10), makeHorse("c", 0, 10)];
    const out = recordRankingsHistory(undefined, horses, 10);
    expect(out.a).toHaveLength(1);
    expect(out.a[0].rank).toBe(1);
    expect(out.b[0].rank).toBe(2);
    expect(Number.isFinite(out.a[0].reputation)).toBe(true);
    expect(out.a[0].price).toBeGreaterThan(0);
    expect(out.a[0].points).toBeGreaterThan(out.b[0].points);
    // Unranked horse (no points) is not tracked
    expect(out.c).toBeUndefined();
  });

  it("appends across days, dedupes the same day, and caps entries", () => {
    const horses = [makeHorse("a", 1, 5)];
    let hist = recordRankingsHistory(undefined, horses, 5);
    hist = recordRankingsHistory(hist, horses, 5); // same day — no duplicate
    expect(hist.a).toHaveLength(1);
    hist = recordRankingsHistory(hist, horses, 6);
    expect(hist.a).toHaveLength(2);
    expect(hist.a[1].day).toBe(6);
    for (let d = 7; d < 7 + RANKINGS_HISTORY_MAX_ENTRIES + 10; d++) {
      hist = recordRankingsHistory(hist, horses, d);
    }
    expect(hist.a.length).toBeLessThanOrEqual(RANKINGS_HISTORY_MAX_ENTRIES);
  });

  it("keeps prior snapshots without adding a new day for horses that fall out", () => {
    const winner = makeHorse("a", 1, 5);
    let hist = recordRankingsHistory(undefined, [winner], 5);
    expect(hist.a).toHaveLength(1);
    // Horse loses all form (history outside window) → dropped
    const faded = { ...winner, raceHistory: [] } as Horse;
    hist = recordRankingsHistory(hist, [faded], 6);
    expect(hist.a.map((s) => s.day)).toEqual([5]);
  });

  it("compares an unranked player horse to that day's leader", () => {
    const leader = makeHorse("leader", 2, 10);
    const mine = {
      ...createTestHorse({ id: asHorseId("mine") }),
      ownership: { type: "player" as const },
      fame: 7,
    };
    const hist = recordRankingsHistory(undefined, [leader, mine], 10);
    const result = compareRankingsForDay(hist, [leader, mine], 10);
    expect(result.leaders[0].horseId).toBe("leader");
    expect(result.players[0].snapshot?.rank).toBeNull();
    expect(result.players[0].gap?.points).toBe(-hist.leader[0].points);
  });
});
