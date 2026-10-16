import { describe, expect, it } from "vitest";
import {
  computeStableRankings,
  recordStableRankingsHistory,
  stableRankingsDays,
  STABLE_RANKINGS_MAX_ENTRIES,
  type StableRankingsInput,
} from "@/core/stable/stableRankings";
import { PLAYER_OWNER_ID } from "@/core/horse/ownership";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { asHorseId, asNpcStableId } from "@/core/types/branded";
import { PRIZE_SPLIT } from "@/constants";
import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";
import type { Stable, PlayerProfile } from "@/core/stable/types";

const result = (
  day: number,
  extra: Partial<HorseRaceHistoryEntry> = {},
): HorseRaceHistoryEntry => ({
  raceId: `r-${day}`,
  raceName: `Race ${day}`,
  position: 1,
  day,
  ...extra,
});

const npcHorse = (id: string, stableId: string, raceHistory: HorseRaceHistoryEntry[] = []): Horse =>
  createTestHorse({
    id: asHorseId(id),
    ownership: { type: "npc", stableId: asNpcStableId(stableId) },
    raceHistory,
  });

const playerHorse = (id: string, raceHistory: HorseRaceHistoryEntry[] = []): Horse =>
  createTestHorse({ id: asHorseId(id), ownership: { type: "player" }, raceHistory });

const stable = (id: string, extra: Partial<Stable> = {}): Stable =>
  createTestStable({ id, ...extra });

const PLAYER_PROFILE = { stableName: "Test Yard" } as PlayerProfile;

const input = (overrides: Partial<StableRankingsInput> = {}): StableRankingsInput => ({
  horses: [],
  npcStables: [],
  playerReputationScore: 0,
  day: 10,
  ...overrides,
});

describe("computeStableRankings", () => {
  it("emits one row per NPC stable plus the player", () => {
    const rows = computeStableRankings(
      input({ npcStables: [stable("a"), stable("b")], playerProfile: PLAYER_PROFILE }),
    );
    expect(rows).toHaveLength(3);
    const player = rows.find((r) => r.isPlayer)!;
    expect(player.stableId).toBe(PLAYER_OWNER_ID);
    expect(player.name).toBe("Test Yard");
  });

  it("sums current-roster ranking points and ranks by points", () => {
    const hot = npcHorse("h-hot", "a", [result(9, { grade: "G1" }), result(10, { grade: "G1" })]);
    const warm = npcHorse("h-warm", "b", [result(10, { grade: "G1" })]);
    const cold = npcHorse("h-cold", "c", []);
    const rows = computeStableRankings(
      input({
        horses: [hot, warm, cold],
        npcStables: [stable("a"), stable("b"), stable("c")],
      }),
    );
    const a = rows.find((r) => r.stableId === "a")!;
    const b = rows.find((r) => r.stableId === "b")!;
    const c = rows.find((r) => r.stableId === "c")!;
    expect(a.points).toBeGreaterThan(b.points);
    expect(b.points).toBeGreaterThan(0);
    expect(c.points).toBe(0);
    expect(a.rank).toBe(1);
    expect(b.rank).toBe(2);
    // No activity at all → unranked, not a bottom number
    expect(c.rank).toBeNull();
  });

  it("attributes earned points and earnings to the stable at race time", () => {
    // Horse raced for stable A on day 8, was sold to stable B since.
    const transferred = npcHorse("h-t", "b", [
      result(8, { grade: "G1", stableId: "a", purseEarned: 10000 }),
      result(10, { grade: "G1", stableId: "b", purseEarned: 20000 }),
    ]);
    const rows = computeStableRankings(
      input({ horses: [transferred], npcStables: [stable("a"), stable("b")] }),
    );
    const a = rows.find((r) => r.stableId === "a")!;
    const b = rows.find((r) => r.stableId === "b")!;
    expect(a.earnedPoints).toBeGreaterThan(0);
    expect(a.earnings).toBe(10000);
    expect(b.earnedPoints).toBeGreaterThan(0);
    expect(b.earnings).toBe(20000);
    // Roster points follow the horse's current owner regardless of attribution
    expect(b.points).toBeGreaterThan(a.points);
  });

  it("falls back to the purse split when purseEarned is missing", () => {
    const h = npcHorse("h-1", "a", [result(10, { purse: 100000, stableId: "a" })]);
    const rows = computeStableRankings(input({ horses: [h], npcStables: [stable("a")] }));
    expect(rows.find((r) => r.stableId === "a")!.earnings).toBe(
      Math.round(100000 * PRIZE_SPLIT[0]),
    );
  });

  it("attributes purseEarned-less player entries to the player bucket", () => {
    const h = playerHorse("h-p", [result(10, { purseEarned: 5000 })]);
    const rows = computeStableRankings(input({ horses: [h] }));
    const player = rows.find((r) => r.isPlayer)!;
    expect(player.earnings).toBe(5000);
    expect(player.earnedPoints).toBeGreaterThan(0);
  });

  it("normalizes player reputation to the 0-100 scale; NPCs keep their own", () => {
    const rows = computeStableRankings(
      input({ npcStables: [stable("a", { reputation: 72 })], playerReputationScore: 640 }),
    );
    expect(rows.find((r) => r.stableId === "a")!.reputation).toBe(72);
    expect(rows.find((r) => r.isPlayer)!.reputation).toBe(64);
  });

  it("prices a stable at the market value of its current roster", () => {
    const rows = computeStableRankings(
      input({
        horses: [npcHorse("h-1", "a"), npcHorse("h-2", "a")],
        npcStables: [stable("a"), stable("empty")],
      }),
    );
    expect(rows.find((r) => r.stableId === "a")!.price).toBeGreaterThan(0);
    expect(rows.find((r) => r.stableId === "empty")!.price).toBe(0);
  });

  it("orders rows deterministically by points, then earned points, then earnings, then id", () => {
    // Both zero-activity → id order; both ranked → points order.
    const h = npcHorse("h-1", "b", [result(10)]);
    const rows = computeStableRankings(
      input({ horses: [h], npcStables: [stable("z"), stable("b"), stable("a")] }),
    );
    expect(rows[0].stableId).toBe("b");
    // zero-activity NPC stables keep their (null) rank and come after, id-sorted
    const npcRows = rows.filter((r) => !r.isPlayer);
    expect(npcRows.slice(1).map((r) => r.stableId)).toEqual(["a", "z"]);
  });
});

describe("recordStableRankingsHistory", () => {
  it("appends daily snapshots for every stable plus the player, deduping the same day", () => {
    const stables = [stable("a")];
    let hist = recordStableRankingsHistory(undefined, input({ npcStables: stables }));
    expect(hist.a).toHaveLength(1);
    expect(hist[PLAYER_OWNER_ID]).toHaveLength(1);
    hist = recordStableRankingsHistory(hist, input({ npcStables: stables }));
    expect(hist.a).toHaveLength(1);
    hist = recordStableRankingsHistory(hist, input({ npcStables: stables, day: 11 }));
    expect(hist.a).toHaveLength(2);
    expect(hist.a[1].day).toBe(11);
  });

  it("caps entries at STABLE_RANKINGS_MAX_ENTRIES per stable", () => {
    const stables = [stable("a")];
    let hist = recordStableRankingsHistory(undefined, input({ npcStables: stables, day: 1 }));
    for (let d = 2; d < STABLE_RANKINGS_MAX_ENTRIES + 10; d++) {
      hist = recordStableRankingsHistory(hist, input({ npcStables: stables, day: d }));
    }
    expect(hist.a.length).toBeLessThanOrEqual(STABLE_RANKINGS_MAX_ENTRIES);
  });

  it("prunes dissolved stables but always retains the player", () => {
    let hist = recordStableRankingsHistory(undefined, input({ npcStables: [stable("a")], day: 1 }));
    expect(hist.a).toHaveLength(1);
    hist = recordStableRankingsHistory(hist, input({ npcStables: [], day: 2 }));
    expect(hist.a).toBeUndefined();
    expect(hist[PLAYER_OWNER_ID]).toHaveLength(2);
  });
});

describe("stableRankingsDays", () => {
  it("returns the union of recorded days, newest first", () => {
    const days = stableRankingsDays({
      a: [
        { day: 5, rank: 1, points: 1, earnedPoints: 1, earnings: 1, reputation: 1, price: 1 },
        { day: 9, rank: 1, points: 1, earnedPoints: 1, earnings: 1, reputation: 1, price: 1 },
      ],
      b: [{ day: 1, rank: 1, points: 1, earnedPoints: 1, earnings: 1, reputation: 1, price: 1 }],
    });
    expect(days).toEqual([9, 5, 1]);
  });
});
