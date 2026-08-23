import type { ProgenyLeaderboard, ProgenyRanking } from "@/core/breeding/leaderboardTypes";

export function createProgenyRanking(overrides?: Partial<ProgenyRanking>): ProgenyRanking {
  return {
    horseId: "test-horse-1",
    horseName: "Test Horse",
    sireId: "test-sire-1",
    sireName: "Test Sire",
    rank: 1,
    value: 100000,
    metrics: {
      age: 4,
      starts: 10,
      wins: 5,
      earnings: 100000,
      bestBeyer: 90,
      gradeWins: 1,
    },
    ...overrides,
  };
}

export function createProgenyLeaderboard(
  overrides?: Partial<ProgenyLeaderboard>,
): ProgenyLeaderboard {
  return {
    type: "earnings",
    title: "Test Leaderboard",
    description: "Test description",
    rankings: [createProgenyRanking()],
    lastUpdated: 0,
    ...overrides,
  };
}
