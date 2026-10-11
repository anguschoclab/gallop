import { describe, expect, it } from "vitest";
import {
  RANKINGS_HISTORY_MAX_ENTRIES,
  recordRankingsHistory,
} from "@/core/market/rankingsHistory";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { asHorseId } from "@/core/types/branded";
import type { Horse } from "@/core/horse/types";

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
    raceHistory: Array.from({ length: wins }, (_, i) => win(day - i, "G1")),
  });
}

describe("recordRankingsHistory", () => {
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

  it("drops horses that fall out of the rankings", () => {
    const winner = makeHorse("a", 1, 5);
    let hist = recordRankingsHistory(undefined, [winner], 5);
    expect(hist.a).toHaveLength(1);
    // Horse loses all form (history outside window) → dropped
    const faded = { ...winner, raceHistory: [] } as Horse;
    hist = recordRankingsHistory(hist, [faded], 400);
    expect(hist.a).toBeUndefined();
  });
});
