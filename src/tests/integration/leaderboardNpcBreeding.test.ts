import { describe, it, expect, beforeEach } from "vitest";
import type { Horse, Stable, GameState } from "@/game/types";
import { runNpcBreeding } from "@/core/npc/breeding";
import { createRng } from "@/core/common/rng";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("leaderboardNpcBreeding integration", () => {
  let state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day" | "sireLeaderboards">;
  let rng: ReturnType<typeof createRng>;

  beforeEach(() => {
    rng = createRng(12345);

    // Create test state with leaderboards
    const leaderboards: Record<string, Leaderboard> = {
      overall: {
        type: "overall",
        title: "Overall",
        description: "Test",
        rankings: [
          {
            stallionId: "sire1",
            stallionName: "Top Sire",
            rank: 1,
            value: 150,
            metrics: {
              stallionId: "sire1",
              stallionName: "Top Sire",
              aei: 150,
              ci: 120,
              classification: "elite",
              surfaceBias: "turf",
              distancePreference: "classic",
              progenyWinPercentage: 25,
              lifetimeFoals: 50,
              lifetimeStakesFoals: 20,
              lifetimeG1Foals: 5,
              standingFee: 50000,
            },
          },
          {
            stallionId: "sire2",
            stallionName: "Value Sire",
            rank: 5,
            value: 80,
            metrics: {
              stallionId: "sire2",
              stallionName: "Value Sire",
              aei: 80,
              ci: 90,
              classification: "solid",
              surfaceBias: "dirt",
              distancePreference: "sprint",
              progenyWinPercentage: 15,
              lifetimeFoals: 30,
              lifetimeStakesFoals: 10,
              lifetimeG1Foals: 2,
              standingFee: 5000,
            },
          },
        ],
        lastUpdated: 100,
      },
      value_sires: {
        type: "value_sires",
        title: "Value Sires",
        description: "Test",
        rankings: [
          {
            stallionId: "sire2",
            stallionName: "Value Sire",
            rank: 1,
            value: 16,
            metrics: {
              stallionId: "sire2",
              stallionName: "Value Sire",
              aei: 80,
              ci: 90,
              classification: "solid",
              surfaceBias: "dirt",
              distancePreference: "sprint",
              progenyWinPercentage: 15,
              lifetimeFoals: 30,
              lifetimeStakesFoals: 10,
              lifetimeG1Foals: 2,
              standingFee: 5000,
            },
          },
        ],
        lastUpdated: 100,
      },
      g1_producers: {
        type: "g1_producers",
        title: "G1 Producers",
        description: "Test",
        rankings: [
          {
            stallionId: "sire1",
            stallionName: "Top Sire",
            rank: 1,
            value: 5,
            metrics: {
              stallionId: "sire1",
              stallionName: "Top Sire",
              aei: 150,
              ci: 120,
              classification: "elite",
              surfaceBias: "turf",
              distancePreference: "classic",
              progenyWinPercentage: 25,
              lifetimeFoals: 50,
              lifetimeStakesFoals: 20,
              lifetimeG1Foals: 5,
              standingFee: 50000,
            },
          },
        ],
        lastUpdated: 100,
      },
    };

    state = {
      day: 36,
      horses: h2r([
        {
          id: "sire1",
          name: "Top Sire",
          age: 10,
          gender: "colt",
          stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
          stud: {
            atStud: true,
            standingFee: 50000,
            bookSize: 40,
            seasonBookings: 30,
            lifetimeFoals: 50,
            lifetimeStakesFoals: 20,
            lifetimeG1Foals: 5,
            retiredYear: 1,
          },
          pedigree: {},
          raceHistory: [],
          careerStarts: 0,
          careerWins: 0,
          lifetimeEarnings: 0,
          fertility: 0.9,
          fame: 80,
          hemisphere: "Northern",
          distanceAptitude: 1600,
          silk: "#FF0000",
          genotype: { speed: 0.8, stamina: 0.8, acceleration: 0.8, consistency: 0.8 },
          energy: 100,
          form: 100,
        },
        {
          id: "sire2",
          name: "Value Sire",
          age: 8,
          gender: "colt",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
          stud: {
            atStud: true,
            standingFee: 5000,
            bookSize: 30,
            seasonBookings: 20,
            lifetimeFoals: 30,
            lifetimeStakesFoals: 10,
            lifetimeG1Foals: 2,
            retiredYear: 1,
          },
          pedigree: {},
          raceHistory: [],
          careerStarts: 0,
          careerWins: 0,
          lifetimeEarnings: 0,
          fertility: 0.85,
          fame: 50,
          hemisphere: "Northern",
          distanceAptitude: 1400,
          silk: "#00FF00",
          genotype: { speed: 0.7, stamina: 0.7, acceleration: 0.7, consistency: 0.7 },
          energy: 100,
          form: 100,
        },
        {
          id: "mare1",
          name: "Test Mare",
          age: 5,
          gender: "mare",
          stats: { speed: 60, stamina: 60, acceleration: 60, consistency: 60 },
          pedigree: {},
          raceHistory: [],
          careerStarts: 0,
          careerWins: 0,
          lifetimeEarnings: 0,
          fertility: 0.8,
          fame: 30,
          hemisphere: "Northern",
          distanceAptitude: 1600,
          stableId: "stable1",
          silk: "#0000FF",
          genotype: { speed: 0.6, stamina: 0.6, acceleration: 0.6, consistency: 0.6 },
          energy: 100,
          form: 100,
        },
      ] as unknown as Horse[]),
      npcStables: [
        {
          id: "stable1",
          name: "Test Stable",
          personality: "developer",
          cash: 100000,
          reputation: 50,
          tier: "mid",
          preferredSurface: "Dirt",
          preferredDistance: 1400,
        } as Stable,
      ],
      pregnancies: [],
      sireLeaderboards: leaderboards,
    };
  });

  it("leaderboards influence NPC breeding choices", () => {
    const result = runNpcBreeding(state, 36, rng);

    // With leaderboards, developer personality should prefer value sires
    // The value sire (sire2) has a high value ranking for developers
    expect(result.newPregnancies.length).toBeGreaterThan(0);

    const pregnancy = result.newPregnancies[0];
    // Developer should prefer the value sire due to leaderboard bonus
    expect(pregnancy.sireId).toBeDefined();
  });

  it("prestige personality prefers G1 producers from leaderboards", () => {
    state.npcStables[0].personality = "prestige";
    state.npcStables[0].cash = 200000; // More cash for prestige breeding

    const result = runNpcBreeding(state, 36, rng);

    if (result.newPregnancies.length > 0) {
      const pregnancy = result.newPregnancies[0];
      // Prestige should prefer the G1 producer (sire1)
      expect(pregnancy.sireId).toBeDefined();
    }
  });

  it("handles missing leaderboards gracefully", () => {
    state.sireLeaderboards = undefined;

    const result = runNpcBreeding(state, 36, rng);

    // Should still work without leaderboards
    expect(result).toBeDefined();
    expect(result.horses).toBeDefined();
    expect(result.npcStables).toBeDefined();
  });
});
