import { describe, it, expect } from "vitest";
import { buildStandingsRows } from "@/core/standings/buildStandingsRows";
import type { StandingEntry } from "@/core/standings/computeStandings";

function mkEntry(stableId: string, isPlayer = false, prizeMoney = 0): StandingEntry {
  return {
    stableId,
    name: stableId === "__player__" ? "My Stable" : `Stable ${stableId}`,
    isPlayer,
    rangePrizeMoney: prizeMoney,
    sparkline: [],
    prestige: 0,
    winsVsPlayer: 0,
    recentResults: [],
  };
}

describe("buildStandingsRows", () => {
  it("returns top-N rows when player is in top-N", () => {
    const standings = [
      mkEntry("npc1", false, 100000),
      mkEntry("__player__", true, 80000),
      mkEntry("npc2", false, 60000),
    ];
    const { rows, playerInTop, topNLength } = buildStandingsRows(standings, 2, 2);
    expect(playerInTop).toBe(true);
    expect(topNLength).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows[0].stableId).toBe("npc1");
    expect(rows[1].stableId).toBe("__player__");
  });

  it("appends player row when player is not in top-N", () => {
    const standings = [
      mkEntry("npc1", false, 100000),
      mkEntry("npc2", false, 90000),
      mkEntry("npc3", false, 80000),
      mkEntry("__player__", true, 1000),
    ];
    const { rows, playerInTop, topNLength } = buildStandingsRows(standings, 4, 3);
    expect(playerInTop).toBe(false);
    expect(topNLength).toBe(3);
    expect(rows).toHaveLength(4);
    expect(rows[3].stableId).toBe("__player__");
  });

  it("returns empty rows for empty standings", () => {
    const { rows, playerInTop, topNLength } = buildStandingsRows([], 1, 10);
    expect(rows).toHaveLength(0);
    expect(playerInTop).toBe(false);
    expect(topNLength).toBe(0);
  });

  it("handles standings shorter than limit", () => {
    const standings = [mkEntry("__player__", true, 50000), mkEntry("npc1", false, 30000)];
    const { rows, playerInTop, topNLength } = buildStandingsRows(standings, 1, 10);
    expect(topNLength).toBe(2);
    expect(playerInTop).toBe(true);
    expect(rows).toHaveLength(2);
  });

  it("filter(Boolean) handles playerRank beyond standings length", () => {
    const standings = [mkEntry("npc1", false, 100000), mkEntry("npc2", false, 90000)];
    const { rows, playerInTop, topNLength } = buildStandingsRows(standings, 99, 2);
    expect(playerInTop).toBe(false);
    expect(topNLength).toBe(2);
    // standings[98] is undefined → filter(Boolean) removes it
    expect(rows).toHaveLength(2);
  });
});
