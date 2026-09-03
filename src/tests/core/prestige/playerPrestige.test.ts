import { describe, it, expect } from "vitest";
import {
  playerPrestigeScore,
  playerPrestigeStanding,
  prestigeLadder,
} from "@/core/prestige/playerPrestige";
import { AUCTION_HOUSES } from "@/core/prestige/auctionHouses";

describe("playerPrestigeScore", () => {
  it("maps the 0-1000 reputation scale onto 0-100", () => {
    expect(playerPrestigeScore(0)).toBe(0);
    expect(playerPrestigeScore(-10)).toBe(0);
    expect(playerPrestigeScore(500)).toBe(50);
    expect(playerPrestigeScore(1000)).toBe(100);
    expect(playerPrestigeScore(5000)).toBe(100);
  });
});

describe("prestigeLadder", () => {
  it("includes every auction house plus the player, ranked descending", () => {
    const ladder = prestigeLadder(600, "Hollow Oak");
    expect(ladder.filter((e) => e.kind === "auction_house")).toHaveLength(AUCTION_HOUSES.length);
    expect(ladder.filter((e) => e.kind === "player")).toHaveLength(1);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i - 1].prestige).toBeGreaterThanOrEqual(ladder[i].prestige);
      expect(ladder[i].rank).toBe(i + 1);
    }
  });
});

describe("playerPrestigeStanding", () => {
  it("ranks an unknown stable at the bottom of the field", () => {
    const s = playerPrestigeStanding(0);
    expect(s.prestige).toBe(0);
    expect(s.tier).toBe("provincial");
    expect(s.rank).toBe(s.total);
    expect(s.percentile).toBe(0);
    expect(s.below).toBeUndefined();
    expect(s.above).toBeDefined();
  });

  it("puts a legendary stable ahead of every venue", () => {
    const s = playerPrestigeStanding(1000);
    expect(s.prestige).toBe(100);
    expect(s.tier).toBe("world");
    expect(s.rank).toBe(1);
    expect(s.houseRank).toBe(1);
    expect(s.courseRank).toBe(1);
    expect(s.percentile).toBe(100);
    expect(s.above).toBeUndefined();
  });

  it("improves rank as reputation grows", () => {
    const low = playerPrestigeStanding(200);
    const high = playerPrestigeStanding(800);
    expect(high.rank).toBeLessThan(low.rank);
    expect(high.houseRank).toBeLessThanOrEqual(low.houseRank);
    expect(high.percentile).toBeGreaterThan(low.percentile);
  });
});
