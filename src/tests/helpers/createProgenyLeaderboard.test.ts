import { describe, it, expect } from "vitest";
import { createProgenyLeaderboard, createProgenyRanking } from "@/tests/helpers";
import type { ProgenyLeaderboard, ProgenyRanking } from "@/core/breeding/leaderboardTypes";

describe("createProgenyRanking", () => {
  it("returns a fully-typed ProgenyRanking with all required fields", () => {
    const ranking = createProgenyRanking();

    expect(typeof ranking.horseId).toBe("string");
    expect(typeof ranking.horseName).toBe("string");
    expect(typeof ranking.rank).toBe("number");
    expect(typeof ranking.value).toBe("number");
    expect(ranking.metrics).toBeDefined();
    expect(typeof ranking.metrics.age).toBe("number");
    expect(typeof ranking.metrics.starts).toBe("number");
    expect(typeof ranking.metrics.wins).toBe("number");
    expect(typeof ranking.metrics.earnings).toBe("number");
    expect(typeof ranking.metrics.gradeWins).toBe("number");
  });

  it("applies overrides correctly", () => {
    const ranking = createProgenyRanking({
      horseId: "custom-horse",
      horseName: "Custom Horse",
      rank: 5,
      value: 999999,
      metrics: { age: 6, starts: 20, wins: 10, earnings: 999999, gradeWins: 3 },
    });

    expect(ranking.horseId).toBe("custom-horse");
    expect(ranking.horseName).toBe("Custom Horse");
    expect(ranking.rank).toBe(5);
    expect(ranking.value).toBe(999999);
    expect(ranking.metrics.age).toBe(6);
    expect(ranking.metrics.gradeWins).toBe(3);
  });

  it("preserves defaults for non-overridden fields", () => {
    const ranking = createProgenyRanking({ horseName: "Override Only" });

    expect(ranking.horseId).toBe("test-horse-1");
    expect(ranking.rank).toBe(1);
    expect(ranking.metrics.age).toBe(4);
  });
});

describe("createProgenyLeaderboard", () => {
  it("returns a fully-typed ProgenyLeaderboard with all required fields", () => {
    const leaderboard = createProgenyLeaderboard();

    expect(leaderboard.type).toBeDefined();
    expect(typeof leaderboard.title).toBe("string");
    expect(typeof leaderboard.description).toBe("string");
    expect(Array.isArray(leaderboard.rankings)).toBe(true);
    expect(typeof leaderboard.lastUpdated).toBe("number");
  });

  it("has at least one ranking by default", () => {
    const leaderboard = createProgenyLeaderboard();
    expect(leaderboard.rankings.length).toBeGreaterThanOrEqual(1);
  });

  it("applies overrides correctly", () => {
    const leaderboard = createProgenyLeaderboard({
      type: "beyer",
      title: "Custom Title",
      description: "Custom description",
      lastUpdated: 42,
    });

    expect(leaderboard.type).toBe("beyer");
    expect(leaderboard.title).toBe("Custom Title");
    expect(leaderboard.description).toBe("Custom description");
    expect(leaderboard.lastUpdated).toBe(42);
  });

  it("accepts custom rankings array", () => {
    const rankings = [
      createProgenyRanking({ horseId: "h1", rank: 1 }),
      createProgenyRanking({ horseId: "h2", rank: 2 }),
    ];
    const leaderboard = createProgenyLeaderboard({ rankings });

    expect(leaderboard.rankings).toHaveLength(2);
    expect(leaderboard.rankings[0].horseId).toBe("h1");
    expect(leaderboard.rankings[1].horseId).toBe("h2");
  });

  it("accepts empty rankings array", () => {
    const leaderboard = createProgenyLeaderboard({ rankings: [] });
    expect(leaderboard.rankings).toHaveLength(0);
  });
});
