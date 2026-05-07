import { describe, it, expect, beforeEach } from "vitest";
import type { Horse } from "@/game/types";
import { computeAllLeaderboards } from "@/core/breeding/leaderboardService";
import { createRng } from "@/game/rng";

describe("leaderboardService", () => {
  let horses: Horse[];
  let industryMeanEarnings: number;

  beforeEach(() => {
    const rng = createRng(12345);

    // Create test horses with various stud careers
    horses = [
      {
        id: "sire1",
        name: "Elite Sire",
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
        bloodline: "Northern Dancer",
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
        bloodline: "Mr. Prospector",
        silk: "#00FF00",
        genotype: { speed: 0.7, stamina: 0.7, acceleration: 0.7, consistency: 0.7 },
        energy: 100,
        form: 100,
      },
    ] as unknown as Horse[];

    // Add some progeny with race history
    horses.push({
      id: "foal1",
      name: "Progeny 1",
      age: 3,
      gender: "colt",
      stats: { speed: 75, stamina: 75, acceleration: 75, consistency: 75 },
      pedigree: { sireId: "sire1", damId: "dam1" },
      sireName: "Elite Sire",
      raceHistory: [
        {
          position: 1,
          beyer: 100,
          grade: "G1",
          surface: "Turf",
          distance: 2000,
          purse: 500000,
          day: 100,
          fieldSize: 12,
          raceClass: "Group",
        },
      ],
      careerStarts: 5,
      careerWins: 3,
      lifetimeEarnings: 300000,
      hemisphere: "Northern",
      fertility: 0.8,
      fame: 30,
      distanceAptitude: 1600,
      silk: "#0000FF",
      genotype: { speed: 0.75, stamina: 0.75, acceleration: 0.75, consistency: 0.75 },
      energy: 100,
      form: 100,
    } as unknown as Horse);

    industryMeanEarnings = 100000; // $100k average
  });

  it("computes overall leaderboard ranked by AEI", () => {
    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, 100);

    expect(leaderboards.overall).toBeDefined();
    expect(leaderboards.overall.type).toBe("overall");
    expect(leaderboards.overall.title).toBe("Overall Sire Rankings");
    expect(leaderboards.overall.rankings.length).toBeGreaterThan(0);
  });

  it("computes stakes producers leaderboard", () => {
    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, 100);

    expect(leaderboards.stakes_producers).toBeDefined();
    expect(leaderboards.stakes_producers.type).toBe("stakes_producers");
    expect(leaderboards.stakes_producers.rankings).toHaveLength(2);
  });

  it("computes G1 producers leaderboard", () => {
    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, 100);

    expect(leaderboards.g1_producers).toBeDefined();
    expect(leaderboards.g1_producers.type).toBe("g1_producers");
  });

  it("computes value sires leaderboard", () => {
    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, 100);

    expect(leaderboards.value_sires).toBeDefined();
    expect(leaderboards.value_sires.type).toBe("value_sires");
  });

  it("computes regional leaderboards", () => {
    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, 100);

    expect(leaderboards.regional_north).toBeDefined();
    expect(leaderboards.regional_south).toBeDefined();
  });
});
